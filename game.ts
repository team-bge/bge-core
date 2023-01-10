import { Delay } from "./delay";
import { Display } from "./display";
import { Player } from "./player";
import { GameView, IView, OutlineStyle, ViewType } from "./views";

export interface IPlayerConfig {
    id: string;
    name: string;
}

export interface IGameResult {
    winners?: Player[];
}

export interface IGameConfig {
    Game: new() => IGame;
    minPlayers: number;
    maxPlayers: number;
}

export abstract class GameObject {
    abstract render(ctx: IRenderContext): IView;
}

export interface IGame {
    init(players: IPlayerConfig[], onUpdateView?: { (playerIndex: number, gameView: GameView): void }): void;
    run(): Promise<IGameResult>;
    render(playerIndex?: number): GameView;

    _dispatchUpdateView(): void;
}

export interface IRenderContext {
    readonly player: Player;
}

export let _currentGame: IGame;

export abstract class Game<TPlayer extends Player> implements IGame {
    private _players: TPlayer[];

    protected abstract onCreatePlayer(): TPlayer;

    get players(): ReadonlyArray<TPlayer> {
        return this._players;
    }

    private _onUpdateView?: { (playerIndex: number, gameView: GameView): void };

    init(players: IPlayerConfig[], onUpdateView?: { (playerIndex: number, gameView: GameView): void }): void {
        this._players = [];
        this._onUpdateView = onUpdateView;

        for (let i = 0; i < players.length; ++i) {
            const player = this.onCreatePlayer();
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
        const ctx: IRenderContext = { player: player };

        return {
            table: {
                type: ViewType.Table,
                identity: 0,

                children: Display.renderProperties(this, ctx)
            }
        };
    }
}
