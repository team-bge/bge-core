import { Delay } from "./delay.js";
import { RenderContext } from "./display.js";
import { IGame, IGameResult, IPlayerConfig } from "./interfaces.js";
import { Player } from "./player.js";
import { GameView, TableView, ViewType } from "./views.js";
import { DisplayContainer } from "./zone.js";

export abstract class Game<TPlayer extends Player> implements IGame {
    private readonly _PlayerType: { new(): TPlayer };
    private _players: TPlayer[];
    private _actionIndex: number;

    private _scheduledUpdateView: boolean;

    readonly delay: Delay;
    
    readonly children = new DisplayContainer();

    constructor(PlayerType: { new(): TPlayer }) {
        this._PlayerType = PlayerType;
        this._actionIndex = 0;
        this.delay = new Delay(this);
    }

    get players(): ReadonlyArray<TPlayer> {
        return this._players;
    }

    nextActionIndex(): number {
        return this._actionIndex++;
    }

    private _onUpdateView?: { (playerIndex: number, gameView: GameView): void };

    init(players: IPlayerConfig[], onUpdateView?: { (playerIndex: number, gameView: GameView): void }): void {
        this._players = [];
        this._onUpdateView = onUpdateView;

        for (let i = 0; i < players.length; ++i) {
            const player = new this._PlayerType();
            player._init(this, i, players[i]);
            this._players.push(player);
        }
    }

    run(): Promise<IGameResult> {
        return this.onRun();
    }
    
    respondToPrompt(playerIndex: number, promptIndex: number): void {
        const player = this._players[playerIndex];
        player.prompt.respond(promptIndex);
    }

    protected abstract onRun(): Promise<IGameResult>;

    _dispatchUpdateView(): void {
        if (this._onUpdateView == null) return;

        if (this._scheduledUpdateView) return;

        this._scheduledUpdateView = true;

        setTimeout(() => {
            this._scheduledUpdateView = false;

            for (let i = 0; i < this.players.length; ++i) {
                this._onUpdateView(i, this.render(i));
            }
        }, 10);
    }

    render(playerIndex?: number): GameView {
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
            table: table
        };
    }

    getNextPlayer(player: TPlayer): TPlayer {
        const index = this._players.indexOf(player);
        return this._players[(index + 1) % this._players.length];
    }
}
