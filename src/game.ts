import { Delay } from "./delay.js";
import { RenderContext, DisplayContainer } from "./display.js";
import { IGame, IGameResult, IPlayerConfig } from "./interfaces.js";
import { Player } from "./player.js";
import { Random } from "./random.js";
import { GameView, TableView, ViewType } from "./views.js";

/**
 * Base class for a custom game, using a custom Player type.
 */
export abstract class Game<TPlayer extends Player> implements IGame {
    private readonly _PlayerType: { new(): TPlayer };
    private _players: TPlayer[];
    private _actionIndex: number;

    private _onUpdateViews?: { (gameViews: GameView[]): void };
    private _scheduledUpdateView: boolean;

    /**
     * Helper with methods to suspend the game for various amounts of time.
     */
    readonly delay: Delay;

    /**
     * Helper with methods to generate random numbers.
     */
    readonly random: Random;
    
    /**
     * Dynamically add or remove objects to be displayed here.
     */
    readonly children: DisplayContainer;

    /**
     * Base constructor for `Game<TPlayer>`. You need to pass in your player type here so that BGE knows how to make instances of it.
     * 
     * @param PlayerType Constructor for your custom player type.
     */
    protected constructor(PlayerType: { new(): TPlayer }) {
        this._PlayerType = PlayerType;
        this._actionIndex = 0;
        this.delay = new Delay(this);
        this.random = new Random(this);
        this.children = new DisplayContainer();
    }

    /**
     * Array of all the players in this running game. Only valid after `init()` has been called.
     */
    get players(): ReadonlyArray<TPlayer> {
        return this._players;
    }

    /**
     * Called exactly once by a host to run a game.
     * @param players Information about who's playing.
     * @param onUpdateViews Callback that will be invoked when the game renders a new view for each player.
     */
    async run(players: IPlayerConfig[], onUpdateViews?: { (gameViews: GameView[]): void }): Promise<IGameResult> {
        this._players = [];
        this._onUpdateViews = onUpdateViews;

        for (let i = 0; i < players.length; ++i) {
            const player = new this._PlayerType();
            player._init(this, i, players[i]);
            this._players.push(player);
        }

        const result = await this.onRun();

        this._dispatchUpdateView();

        return result;
    }
    
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
     * Override this to implement your game, moving objects around as players respond to prompts.
     */
    protected abstract onRun(): Promise<IGameResult>;

    /**
     * Used internally to schedule renders to be sent to players.
     */
    _dispatchUpdateView(): void {
        if (this._scheduledUpdateView) return;

        this._scheduledUpdateView = true;

        setTimeout(() => {
            this._scheduledUpdateView = false;

            if (this._onUpdateViews == null) return;

            const views: GameView[] = [];

            for (let i = 0; i < this.players.length; ++i) {
                views[i] = this.render(i);
            }

            this._onUpdateViews(views);
        }, 10);
    }

    private render(playerIndex?: number): GameView {
        const player = playerIndex !== undefined ? this.players[playerIndex] : null;
        const ctx = new RenderContext(player, player._oldParentMap ?? new Map());

        player._oldParentMap = ctx.newParentMap;

        const table: TableView = {
            type: ViewType.Table,
            children: []
        };

        ctx.setParentView(this, table);
        ctx.renderProperties(this, table.children);
        this.children.render(ctx, this, table.children);
        
        ctx.processAnimations();

        return {
            hasPrompts: player.prompt.count > 0,
            topBar: player.topBar.render(new RenderContext(player, new Map())),
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
     * Set the top bar text for all players.
     * @param format Message text with optional substitution points, like `"Hello {0}"`.
     * @param args Values to be substituted in. The first arg will replace `{0}`, then `{1}`, and so on.
     */
    setTopBarText(format: string, ...args: any[]): void {
        for (let player of this.players) {
            player.topBar.setText(format, ...args);
        }
    }

    /**
     * Clear the top bars of all players.
     */
    clearTopBar(): void {
        for (let player of this.players) {
            player.topBar.clear();
        }
    }
}
