import { Delay } from "./delay.js";
import { RenderContext } from "./display.js";
import { IGame, IGameResult, IPlayerConfig, IRunConfig } from "./interfaces.js";
import { AllGroup, AnyGroup, PromiseGroup } from "./promisegroup.js";
import { Player } from "./player.js";
import { Random } from "./random.js";
import { MessageBar } from "./messagebar.js";
import { Basis, GameView, TableView, ViewType } from "./views.js";
import { DisplayContainer } from "./displaycontainer.js";
import { IReplayData, Replay } from "./replay.js";
import { Debugging } from "./debugging.js";

/**
 * Base class for a custom game, using a custom Player type.
 */
export abstract class Game<TPlayer extends Player = Player> implements IGame {
    private readonly _PlayerType: { new(game: IGame, index: number, config: IPlayerConfig): TPlayer };
    private _players: TPlayer[];

    private _onUpdateViews?: { (gameViews: GameView[]): void };
    private _scheduledUpdateView = false;

    private readonly _promiseGroups: (PromiseGroup | null)[] = [];

    /**
     * @internal
     */
    get promiseGroup(): PromiseGroup | null {
        return this._promiseGroups.length > 0
            ? this._promiseGroups[this._promiseGroups.length - 1]
            : null;
    }

    /**
     * Helper with methods to suspend the game for various amounts of time.
     */
    readonly delay: Delay;

    /**
     * Helper with methods to generate random numbers.
     */
    readonly random: Random;

    /**
     * Helper for displaying text, buttons and images in the top bar.
     */
    readonly message: MessageBar;
    
    /**
     * Dynamically add or remove objects to be displayed here.
     */
    readonly children: DisplayContainer;

    /**
     * @internal
     */
    readonly replay: Replay;

    /**
     * Base constructor for `Game<TPlayer>`. You need to pass in your player type here so that BGE knows how to make instances of it.
     * 
     * @param PlayerType Constructor for your custom player type.
     */
    protected constructor(PlayerType: { new(game: IGame, index: number, config: IPlayerConfig): TPlayer }) {
        this._PlayerType = PlayerType;
        this.delay = new Delay(this);
        this.random = new Random(this);
        this.message = new MessageBar(this);
        this.replay = new Replay(this);
        this.children = new DisplayContainer();

        this.children.addProperties(this);
    }

    /**
     * Array of all the players in this running game. Only valid after `init()` has been called.
     */
    get players(): readonly TPlayer[] {
        return this._players;
    }

    /**
     * Information describing inputs fed to the game so far. Can be passed to {@see Game.run(config)} to
     * resume a suspended game, or recreate the final state of a completed game.
     */
    get replayData(): IReplayData {
        return {
            seed: this.random.seed,
            events: [...this.replay.events]
        };
    }

    /**
     * Called exactly once by a host to run a game.
     * @param config Configuration containing info like player count and names
     */
    async run(config: IRunConfig): Promise<IGameResult> {
        const seed = config.replay != null
            ? config.replay.seed
            : `EqCaDdMmVfLDjzGH ${new Date().toISOString()} ${(Math.floor(Math.random() * 4294967296)).toString(16)}`;

        this.random.initialize(seed);
        
        Debugging.baseBreakUrl = config.breakUrl;

        if (config.breakPoints != null) {
            Debugging.breakPoints = config.breakPoints;
            Debugging.onBreak = () => {
                this.dispatchUpdateViews();
            };
        }

        this._players = [];
        this._onUpdateViews = config.onUpdateViews;

        for (let i = 0; i < config.players.length; ++i) {
            const player = new this._PlayerType(this, i, config.players[i]);
            this._players.push(player);
        }

        this.onInitialize();

        let runPromise: Promise<IGameResult>;

        if (config.replay != null) {
            console.log(`Replay playback started (${config.replay.events.length} events)`);

            const replayPromise = this.replay.run(config.replay);
            runPromise = this.onRun();
            await replayPromise;

            console.log("Replay playback ended");
        } else {
            runPromise = this.onRun();
        }
        
        this.dispatchUpdateView();

        const result = await runPromise;

        this.dispatchUpdateView();

        return result;
    }

    /**
     * Called after the game and player list have been configured.
     */
    protected onInitialize(): void {

    }

    /**
     * Override this to implement your game, moving objects around as players respond to prompts.
     */
    protected abstract onRun(): Promise<IGameResult>;

    /**
     * Called by the host when a player has responded to a prompt for input.
     * @param playerIndex Which player responded.
     * @param promptIndex Which prompt did they respond to.
     */
    respondToPrompt(playerIndex: number, promptIndex: number): void {
        const player = this._players[playerIndex];
        player.prompt.respond(promptIndex);
    }

    /**
     * Used internally to schedule renders to be sent to players.
     * @internal
     */
    dispatchUpdateView(): void {
        if (this._scheduledUpdateView) return;

        this._scheduledUpdateView = true;

        setTimeout(() => {
            this.dispatchUpdateViews();
        }, 10);
    }

    private dispatchUpdateViews() {
        this._scheduledUpdateView = false;

        if (this._onUpdateViews == null) return;

        const views: GameView[] = [];

        for (let i = 0; i < this.players.length; ++i) {
            views[i] = this.render(i);
        }

        this._onUpdateViews(views);
    }
    
    /**
     * Cancel all player input prompts and delays with the given reason.
     * @param reason A message or error describing why the promises were cancelled.
     */
    cancelAllPromises(reason?: any) {

        for (let player of this.players) {
            player.prompt.cancelAll(reason);
        }

        this.delay.cancelAll(reason);
    }

    private render(playerIndex?: number): GameView {
        const player = playerIndex !== undefined ? this.players[playerIndex] : null;
        const ctx = new RenderContext(player, player?._oldChildIndexMap, player?._oldParentMap);

        if (player != null) {
            player._oldChildIndexMap = ctx.childIndexMap;
            player._oldParentMap = ctx.newParentMap;
        }
        
        ctx.childIndexMap.forgetUnused();

        const table: TableView = {
            type: ViewType.TABLE,
            children: []
        };

        ctx.setParentView(this, table);
        this.children.render(ctx, this, table.children);
        
        ctx.processAnimations();

        return {
            basis: Basis.Y_FORWARD_Z_UP,
            hasPrompts: player.prompt.count > 0,
            messages: this.message.render(new RenderContext(player)),
            table: table,
            cameras: player.cameras
        };
    }

    /**
     * Returns the player following the given one in clockwise turn order.
     * @param player Previous player in clockwise turn order.
     * @returns Next player in clockwise turn order.
     */
    getNextPlayer(player: TPlayer): TPlayer {
        const index = this._players.indexOf(player);
        return this._players[(index + 1) % this._players.length];
    }
    
    /**
     * Creates a Promise that is resolved with an array of results when all of the provided Promises
     * resolve, or rejected when any Promise is rejected. Wraps Promise.all<T>.
     * 
     * @param createPromises A function that should return an array or iterable of Promises. The promises should
     * be created inside this function.
     * 
     * @returns A new Promise.
     */
    all<T>(createPromises: { (): Iterable<T | PromiseLike<T>> }) {
        return Promise.all(this.wrapPromises(createPromises, new AllGroup(this.promiseGroup)));
    }

    /**
     * Creates a Promise that is fulfilled by the first given Promise to be fulfilled, or rejected with
     * an AggregateError containing an array of rejection reasons if all of the given promises are rejected.
     * All the given promises can still independently fulfill after the first one, unlike with anyExclusive<T>.
     * Wraps Promise.all<T>.
     * 
     * @param createPromises A function that should return an array or iterable of Promises. The promises should
     * be created inside this function.
     * 
     * @returns A new Promise.
     */
    any<T extends readonly unknown[] | []>(createPromises: { (): T }): Promise<Awaited<T[number]>>;
    any<T>(createPromises: { (): Iterable<T | PromiseLike<T>> }): Promise<Awaited<T>> {
        return Promise.any(createPromises());
    }

    /**
     * Creates a Promise that is fulfilled by the first given Promise to be fulfilled, or rejected with
     * an AggregateError containing an array of rejection reasons if all of the given promises are rejected.
     * Unlike any<T>, after any of the given promises fulfills an inner prompt or delay, the other promises
     * are forcibly rejected. This is useful for letting players select from a range of actions, where responding
     * to the first prompt of any action commits that player to only that action.
     * 
     * Note that you must pass in a function that returns an array of Promises. That function will be invoked
     * once, and only any promises created during invokation will be exclusive. If that function returns promises
     * that were previously created elsewhere, they won't be exclusive.
     * 
     * @param createPromises A function that should return an array or iterable of Promises. The promises should
     * be created inside this function.
     * 
     * @returns A new Promise.
     */
    anyExclusive<T extends readonly unknown[] | []>(createPromises: { (): T }): Promise<Awaited<T[number]>>;
    anyExclusive<T>(createPromises: { (): Iterable<T | PromiseLike<T>> }): Promise<Awaited<T>> {
        return Promise.any(this.wrapPromises(createPromises, new AnyGroup(this.promiseGroup)));
    }

    /**
     * @internal
     */
    wrapPromises<T>(func: { (): T }, group: PromiseGroup): T {
        this._promiseGroups.push(group);

        let result: T;

        try {
            result = func();
        } finally {
            if (this._promiseGroups.pop() != group) {
                throw new Error("Expected different PromiseGroup");
            }
        }

        return result;
    }
}
