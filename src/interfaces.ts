import { Button } from "./button.js";
import { RenderContext } from "./display.js";
import { PromiseGroup } from "./internal.js";
import { GameObject } from "./object.js";
import { GameView, TextEmbedView } from "./views.js";

export const apiVersion = 1;

export interface IPlayerConfig {
    id: string;
    name: string;
}

export interface IGameResult {
    winners?: number[];
}

export type Clickable = GameObject | Button;

export type Message = string | { format: string, args?: any[] };

export interface IGame {
    run(players: IPlayerConfig[], onUpdateViews?: { (gameViews: GameView[]): void }): Promise<IGameResult>;
    respondToPrompt(playerIndex: number, promptIndex: number): void;
    
    /**
     * @internal
     */
    dispatchUpdateView(): void;

    /**
     * @internal
     */
    get promiseGroup(): PromiseGroup | null;
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
