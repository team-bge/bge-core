import { RenderContext } from "./display.js";
import { GameView, TextEmbedView } from "./views.js";

export const apiVersion = 1;

export interface IPlayerConfig {
    id: string;
    name: string;
}

export interface IGameResult {
    winners?: number[];
}

export interface IGame {
    run(players: IPlayerConfig[], onUpdateViews?: { (gameViews: GameView[]): void }): Promise<IGameResult>;
    respondToPrompt(playerIndex: number, promptIndex: number): void;
    
    _dispatchUpdateView(): void;
}

export interface IGameConfig {
    apiVersion: number;
    Game: new() => IGame;
    minPlayers: number;
    maxPlayers: number;
}

export interface ITextEmbeddable {
    renderTextEmbed(ctx: RenderContext): TextEmbedView;
}
