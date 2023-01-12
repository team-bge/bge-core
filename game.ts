import { RenderContext } from "./display";
import { Player } from "./player";
import { GameView, IView,  TableView, ViewType } from "./views";

export const apiVersion = 1;

export interface IPlayerConfig {
    id: string;
    name: string;
}

export interface IGameResult {
    winners?: Player[];
}

export interface IGameConfig {
    apiVersion: number;
    Game: new() => IGame;
    minPlayers: number;
    maxPlayers: number;
}

export abstract class GameObject {
    abstract render(ctx: RenderContext): IView;
}

export interface IGame {
    init(players: IPlayerConfig[], onUpdateView?: { (playerIndex: number, gameView: GameView): void }): void;
    run(): Promise<IGameResult>;
    render(playerIndex?: number): GameView;

    _dispatchUpdateView(): void;
}

export let _currentGame: IGame;

export abstract class Game<TPlayer extends Player> implements IGame {
    private readonly _PlayerType: { new(): TPlayer };
    private _players: TPlayer[];

    constructor(PlayerType: { new(): TPlayer }) {
        this._PlayerType = PlayerType;
    }

    get players(): ReadonlyArray<TPlayer> {
        return this._players;
    }

    private _onUpdateView?: { (playerIndex: number, gameView: GameView): void };

    init(players: IPlayerConfig[], onUpdateView?: { (playerIndex: number, gameView: GameView): void }): void {
        this._players = [];
        this._onUpdateView = onUpdateView;

        for (let i = 0; i < players.length; ++i) {
            const player = new this._PlayerType();
            player._init(i, players[i]);
            this._players.push(player);
        }
    }

    async run(): Promise<IGameResult> {
        if (_currentGame != null) {
            throw new Error("Another game is already running.");
        }

        _currentGame = this;
        const result = await this.onRun();
        _currentGame = null;

        return result;
    }

    protected abstract onRun(): Promise<IGameResult>;

    _dispatchUpdateView(): void {
        if (this._onUpdateView == null) return;

        for (let i = 0; i < this.players.length; ++i) {
            this._onUpdateView(i, this.render(i));
        }
    }

    render(playerIndex?: number): GameView {
        const player = playerIndex !== undefined ? this.players[playerIndex] : null;
        const ctx = new RenderContext(player, player._oldParentMap ?? new Map());

        player._oldParentMap = ctx.newParentMap;

        const table: TableView = {
            type: ViewType.Table
        };

        ctx.setParentView(this, table);

        table.children = ctx.renderProperties(this, table);
        
        ctx.processAnimations();

        return {
            table: table
        };
    }
}
