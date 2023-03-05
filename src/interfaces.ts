import { Button } from "./button.js";
import { RenderContext } from "./display.js";
import { PromiseGroup } from "./promisegroup.js";
import { GameObject } from "./objects/object.js";
import { IReplayData } from "./replay.js";
import { GameView, TextEmbedView } from "./views.js";

/**
 * Information configuring a player, including their name.
 */
export interface IPlayerConfig {
    /**
     * Player nickname that can be shown to other players.
     */
    name: string;
}

/**
 * Returned by a game when it ends, describing the final scores.
 */
export interface IGameResult {
    /**
     * Optional array of scores, indexed the same as @see Game<TPlayer>.players
     */
    scores?: number[];
}

/**
 * Types of objects that can be used in a player click prompt.
 */
export type Clickable = GameObject | Button;

/**
 * Types of value that can be embedded in a message.
 */
export type MessageEmbed = string | boolean | number | ITextEmbeddable | readonly MessageEmbed[];

/**
 * Describes a message displayed at the top of the screen. Can include embedded buttons or other objects.
 */
export type Message = string | { format: string, args?: MessageEmbed[] };

/**
 * @internal
 */
export interface IRunConfig {
    players: IPlayerConfig[];
    replay?: IReplayData;
    breakPoints?: IBreakPointData[];

    onLog?: { (entry: ILogEntry): void };
    onUpdateViews?: { (gameViews: GameView[]): void };
}

/**
 * Base interface for a custom game. You'll want to extend @see Game<TPlayer> instead.
 */
export interface IGame {
    /**
     * @internal
     */
    run(config: IRunConfig): Promise<IGameResult>;

    /**
     * @internal
     */
    respondToPrompt(playerIndex: number, promptIndex: number): void;
    
    /**
     * @internal
     */
    dispatchUpdateView(): void;

    /**
     * @internal
     */
    get promiseGroup(): PromiseGroup | null;

    /**
     * @internal
     */
    get replayData(): IReplayData;
}

/**
 * Your game should default export this interface, describing how to configure and play your game.
 */
export interface IGameConfig {
    /**
     * Describes which version of the BGE API your game was built with.
     * This should be set to API_VERSION in bge-core.
     */
    apiVersion: number;

    /**
     * Constructor for your custom game class. Your game must have a parameterless constructor.
     */
    Game: new() => IGame;

    /**
     * Minimum number of players your game supports.
     */
    minPlayers: number;

    /**
     * Maximum number of players your game supports.
     */
    maxPlayers: number;
}

/**
 * Interface for objects that can be embedded in messages.
 */
export interface ITextEmbeddable {
    /**
     * Renders the object for embedding in text.
     * @param ctx Information about the visibility of the object, and who's viewing it.
     */
    renderTextEmbed(ctx: RenderContext): TextEmbedView;
}


export enum LogLevel {
    INIT = -1,
    TRACE = 0,
    INFO = 1,
    LOG = 2,
    WARNING = 3,
    ERROR = 4
}

export interface IBreakPointData {
    category: string;
    index: number;
}

export interface ILogEntry extends IBreakPointData {
    level: LogLevel;
    data: any[];
}
