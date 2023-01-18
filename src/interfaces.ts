import { GameView } from "./views.js";

export const apiVersion = 1;

export interface IPlayerConfig {
    id: string;
    name: string;
}

export interface IGameResult {
    winners?: number[];
}

export interface IGame {
    init(players: IPlayerConfig[], onUpdateView?: { (playerIndex: number, gameView: GameView): void }): void;
    run(): Promise<IGameResult>;
    render(playerIndex?: number): GameView;

    respondToPrompt(playerIndex: number, promptIndex: number): void;

    nextActionIndex(): number;

    _dispatchUpdateView(): void;
}

export interface IGameConfig {
    apiVersion: number;
    Game: new() => IGame;
    minPlayers: number;
    maxPlayers: number;
}
