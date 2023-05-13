import { Delay } from "./delay.js";
import { Game } from "./game.js";
import { MessageBar } from "./messagebar.js";
import { Player } from "./player.js";
import { PromptHelper } from "./prompt.js";
import { Random } from "./random.js";

export type StateFunc = (this: StateMachine, ...args: any[]) => StatePromise;
export type StatePromise = Promise<NextState | null>;

export class NextState {
    private readonly _func: StateFunc;
    private readonly _args: any[];

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
    anyPrompts: boolean;
    sequenceIndex: number;
    undoStack: (() => void)[];
}

interface IRunStateResult {
    next: NextState | null;
    anyPrompts: boolean;
}

export class StateMachine<TGame extends Game = Game> {
    readonly game: TGame;
    readonly random: Random;
    readonly delay: Delay;
    readonly players: TGame["players"];
    readonly message: MessageBar;

    private _head: IStateStackFrame;

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
            anyPrompts: false,
            undoStack: []
        };

        while (true) {
            const result = await this.onRunState(this._head.state);

            this._head.anyPrompts = result.anyPrompts;

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
                anyPrompts: false,
                undoStack: []
            };
        }
    }

    protected get canUndo(): boolean {
        return this._head.prev != null;
    }

    protected get canRestart(): boolean {
        return this._head.prev != null;
    }

    protected undo(): NextState {
        if (!this.canUndo) {
            throw new Error("Can't undo");
        }
        
        while (true) {
            var top = this._head;
            this._head = this._head.prev;

            while (top.undoStack.length > 0) {
                top.undoStack.pop()();
            }

            if (!top.anyPrompts && this.canUndo) {
                continue;
            }

            return top.state;
        }
    }

    protected restart(): NextState {
        let next: NextState;

        do {
            next = this.undo();
        } while (this.canUndo);

        return next;
    }

    protected async onRunState(state: NextState): Promise<IRunStateResult> {
        const oldPromptCount = this.players.reduce((s, x) => s + x.prompt.respondedCount, 0);
        const next = await state.run(this);
        const newPromptCount = this.players.reduce((s, x) => s + x.prompt.respondedCount, 0);

        return {
            next: next,
            anyPrompts: newPromptCount !== oldPromptCount
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

    protected override onRunState(state: NextState): Promise<IRunStateResult> {
        return this.anyExclusive(() => [
            super.onRunState(state),
            this.prompt.click("Undo", {
                if: this.canUndo,
                return: {
                    next: this.undo(),
                    anyPrompts: true
                }
            })
        ]);
    }
}
