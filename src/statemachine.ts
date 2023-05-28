import { Delay } from "./delay.js";
import { Game } from "./game.js";
import { MessageBar } from "./messagebar.js";
import { Player } from "./player.js";
import { PromptHelper } from "./prompt.js";
import { Random } from "./random.js";

export type StateFunc = (this: StateMachine, ...args: any[]) => StatePromise;
export type StatePromise = Promise<NextState | null>;

const SKIP_UNDO_KEY = Symbol("state:skipundo");
const NO_UNDO_KEY = Symbol("state:noundo");

/**
 * Used to decorate state machine functions that will be skipped when undoing.
 */
export const skipUndo: MethodDecorator = (target: any, propertyKey) => {
    Reflect.defineMetadata(SKIP_UNDO_KEY, true, target[propertyKey]);
};

/**
 * Used to decorate state machine functions that cannot be undone.
 */
export const noUndo: MethodDecorator = (target: any, propertyKey) => {
    Reflect.defineMetadata(NO_UNDO_KEY, true, target[propertyKey]);
};

export class NextState {
    private readonly _func: StateFunc;
    private readonly _args: any[];

    get canUndo(): boolean {
        return Reflect.getMetadata(NO_UNDO_KEY, this._func) !== true;
    }

    get skipUndo(): boolean {
        return Reflect.getMetadata(SKIP_UNDO_KEY, this._func) === true;
    }

    constructor(func: StateFunc, args: any[]) {
        this._func = func;
        this._args = args;
    }

    run(stateMachine: StateMachine): StatePromise {
        return this._func.apply(stateMachine, this._args);
    }
}

interface IStateStackFrame {
    prev?: IStateStackFrame;
    state: NextState;
    skipUndo: boolean;
    sequenceIndex: number;
    undoStack: (() => void)[];
}

export interface IRunStateResult {
    next?: NextState;
    undone?: boolean;
    skipUndo?: boolean;
}

export class StateMachine<TGame extends Game = Game> {
    readonly game: TGame;
    readonly random: Random;
    readonly delay: Delay;
    readonly players: TGame["players"];
    readonly message: MessageBar;

    private _head: IStateStackFrame;

    private _undone: boolean;

    constructor(game: TGame) {
        this.game = game;

        this.random = game.random;
        this.delay = game.delay;
        this.players = game.players;
        this.message = game.message;
    }

    next<TFunc extends (this: this, ...args: Parameters<TFunc>) => StatePromise>(func: TFunc, ...args: Parameters<TFunc>): NextState {
        return new NextState(func, args);
    }

    protected pushUndo(action: () => void): void {
        this._head.undoStack.push(action);
    }

    public async run(...states: ((this: this) => StatePromise)[]): Promise<void> {
        if (states.length === 0) {
            return;
        }

        const sequence = states.map(x => new NextState(x, []));

        this._head = {
            state: sequence[0],
            sequenceIndex: 0,
            skipUndo: true,
            undoStack: []
        };

        while (true) {
            const result = await this.onRunState(this._head.state);

            if (this._undone) {
                continue;
            }

            if (result.undone) {
                this.undo();
                continue;
            }

            this._head.skipUndo = result.skipUndo;

            let sequenceIndex = this._head.sequenceIndex;
            let next = result.next;

            if (result.next == null) {
                ++sequenceIndex;

                if (sequenceIndex >= sequence.length) {
                    break;
                }

                next = sequence[sequenceIndex];
            }

            this._head = {
                prev: this._head,
                state: next,
                sequenceIndex: sequenceIndex,
                skipUndo: true,
                undoStack: []
            };
        }
    }

    protected get canUndo(): boolean {
        return this._head.prev != null && this._head.state.canUndo && this._head.prev.state.canUndo;
    }

    protected get canRestart(): boolean {
        return this.canUndo;
    }

    undo(): boolean {
        this._undone = true;

        while (this._head.undoStack.length > 0) {
            this._head.undoStack.pop()();
        }
        
        while (true) {
            this._head = this._head.prev;

            while (this._head.undoStack.length > 0) {
                this._head.undoStack.pop()();
            }

            if (this._head.skipUndo && this.canUndo) {
                continue;
            }

            return true;
        }
    }

    private restart(): boolean {
        if (!this.canRestart) {
            throw new Error("Can't restart");
        }

        do {
            this.undo();
        } while (this.canUndo);

        return true;
    }

    protected async onRunState(state: NextState): Promise<IRunStateResult> {
        this._undone = false;

        const oldPromptCount = this.players.reduce((s, x) => s + x.prompt.respondedCount, 0);
        const next = await state.run(this);
        const newPromptCount = this.players.reduce((s, x) => s + x.prompt.respondedCount, 0);

        return {
            next: next,
            skipUndo: newPromptCount === oldPromptCount || state.skipUndo
        };
    }

    protected all<T>(createPromises: { (): Iterable<T | PromiseLike<T>> }) {
        return this.game.all(createPromises);
    }

    protected any<T extends readonly unknown[] | []>(createPromises: { (): T }): Promise<Awaited<T[number]>> {
        return this.game.any(createPromises);
    }

    protected anyExclusive<T extends readonly unknown[] | []>(createPromises: { (): T }): Promise<Awaited<T[number]>> {
        return this.game.anyExclusive(createPromises);
    }
}

export abstract class PlayerStateMachine<TGame extends Game = Game, TPlayer extends Player<TGame> = Player<TGame>> extends StateMachine<TGame> {
    readonly player: TPlayer;
    
    readonly prompt: PromptHelper;

    constructor(player: TPlayer) {
        super(player.game);

        this.player = player;
        this.prompt = player.prompt;
    }

    protected async skip(then?: NextState): StatePromise {
        await this.prompt.click("Skip");
        return then;
    }

    protected override async onRunState(state: NextState): Promise<IRunStateResult> {
        try {
            return await this.anyExclusive(() => [
                super.onRunState(state),
                this.prompt.click("Undo", {
                    if: this.canUndo && state.canUndo,
                    return: {
                        undone: true
                    }
                })
            ]);
        } finally {
            this.prompt.cancelAll("Exited state");
        }
    }
}
