import { delay } from "./delay.js";
import { ChildIndexMap, ParentMap, RenderContext } from "./display.js";
import { IGame, IGameResult, IPlayerConfig, IRunConfig } from "./interfaces.js";
import { AllGroup, AnyGroup, PromiseGroup } from "./promisegroup.js";
import { Player } from "./player.js";
import { random } from "./random.js";
import { message } from "./messagebar.js";
import { Basis, GameView, TableView, ViewType } from "./views.js";
import { DisplayContainer } from "./displaycontainer.js";
import { IReplayData, replay } from "./replay.js";
import { Debugging } from "./debugging.js";

/**
 * The currently running game instance.
 * @category Singletons
 * @category Core
 */
export let game: Game;

/**
 * Base class for a custom game, using a custom Player type.
 * @category Core
 */
export abstract class Game<TPlayer extends Player = Player> implements IGame {
    private readonly _PlayerType: { new(index: number, config: IPlayerConfig): TPlayer };
    private _players: TPlayer[];
    private _playerConfigs: IPlayerConfig[];

    private _onUpdateViews?: { (gameViews: GameView[], spectatorView: GameView): void };
    private _scheduledUpdateView = false;

    /**
     * If true, hidden objects like player hands are revealed to spectators.
     */
    revealEverythingToSpectators = false;

    /**
     * Dynamically add or remove objects to be displayed here.
     */
    readonly children: DisplayContainer;

    /**
     * Base constructor for {@link Game<TPlayer>}. You need to pass in your player type here so that BGE knows how to make instances of it.
     * 
     * @param PlayerType Constructor for your custom player type.
     */
    protected constructor(PlayerType: { new(index: number, config: IPlayerConfig): TPlayer }) {
        this._PlayerType = PlayerType;
        this.children = new DisplayContainer();

        game = this;

        this.children.addProperties(this);
    }

    /**
     * Array of all the players in this running game. Only valid when {@link onInitialize} has been called.
     */
    get players(): readonly TPlayer[] {
        return this._players;
    }

    /**
     * Information describing inputs fed to the game so far. Can be passed to {@link run} to
     * resume a suspended game, or recreate the final state of a completed game.
     */
    get replayData(): IReplayData {
        return {
            seed: random.seed,
            players: this._playerConfigs.map(x => ({ name: x.name })),
            events: [...replay.events]
        };
    }

    /**
     * Called exactly once by a host to run a game.
     * @param config Configuration containing info like player count and names
     */
    async run(config: IRunConfig): Promise<IGameResult> {
        const seed = config.replay != null
            ? config.replay.seed
            : `${new Date().toISOString()} ${(Math.floor(Math.random() * 4294967296)).toString(16)}`;

        random.initialize(seed);
        
        Debugging.baseBreakUrl = config.breakUrl;

        if (config.breakPoints != null) {
            Debugging.breakPoints = config.breakPoints;
            Debugging.onBreak = () => {
                this.dispatchUpdateViews();
            };
        }

        this._players = [];
        this._playerConfigs = config.players;
        this._onUpdateViews = config.onUpdateViews;

        for (let i = 0; i < config.players.length; ++i) {
            const player = new this._PlayerType(i, config.players[i]);
            this._players.push(player);
        }

        this.onInitialize();

        let runPromise: Promise<IGameResult>;

        if (config.replay != null) {
            console.log(`Replay playback started (${config.replay.events.length} events)`);

            const replayPromise = replay.run(config.replay);
            runPromise = this.onRun();
            const lastEventIndex = await replayPromise;

            if (lastEventIndex < replay.events.length) {
                return {
                    replayIndex: lastEventIndex
                };
            }

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
    respondToPrompt(playerIndex: number, promptIndex: number, payload?: any): void {
        const player = this._players[playerIndex];
        player.prompt.respond(promptIndex, payload);
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

    protected onPreRender(): void {

    }

    private dispatchUpdateViews() {
        this._scheduledUpdateView = false;

        if (this._onUpdateViews == null) return;

        this.onPreRender();

        const views: GameView[] = [];

        for (let i = 0; i < this.players.length; ++i) {
            views[i] = this.render(i);
        }

        this._onUpdateViews(views, this.render());
    }
    
    /**
     * Cancel all player input prompts and delays with the given reason.
     * @param reason A message or error describing why the promises were cancelled.
     */
    cancelAllPromises(reason?: any) {

        for (let player of this.players) {
            player.prompt.cancelAll(reason);
        }

        delay.cancelAll(reason);
    }

    private _oldSpectatorChildIndexMap?: ChildIndexMap;
    private _oldSpectatorParentMap?: ParentMap;

    private render(playerIndex?: number): GameView {
        const player = playerIndex !== undefined ? this.players[playerIndex] : null;
        const ctx = new RenderContext(player,
            player?._oldChildIndexMap ?? this._oldSpectatorChildIndexMap,
            player?._oldParentMap ?? this._oldSpectatorParentMap);

        if (player != null) {
            player._oldChildIndexMap = ctx.childIndexMap;
            player._oldParentMap = ctx.newParentMap;
        } else {
            this._oldSpectatorChildIndexMap = ctx.childIndexMap;
            this._oldSpectatorParentMap = ctx.newParentMap;
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
            playerIndex: player?.index ?? -1,
            hasPrompts: player?.prompt.activeCount > 0 ?? false,
            messages: message.render(new RenderContext(player)),
            cameras: player?.cameras ?? [],
            players: this.players.map(x => ({
                name: x.name,
                color: x.color.encoded,
                hasPrompts: x.prompt.activeCount > 0
            })),
            table: table
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
}
