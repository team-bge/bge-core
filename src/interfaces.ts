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
    init(players: IPlayerConfig[], onUpdateViews?: { (gameViews: GameView[]): void }): void;
    run(): Promise<IGameResult>;
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
