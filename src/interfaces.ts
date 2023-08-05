import { Button, TextInput } from "./button.js";
import { RenderContext } from "./display.js";
import { Game } from "./game.js";
import { GameObject } from "./objects/object.js";
import { IReplayData } from "./replay.js";
import { GameView, TextEmbedView } from "./views.js";

import { API_VERSION } from "./index.js";

/**
 * Information configuring a player, including their name.
 * @category Core
 */
export interface IPlayerConfig {
    /**
     * Player nickname that can be shown to other players.
     */
    readonly name: string;
}

/**
 * Returned by a game when it ends, describing the final scores.
 * @category Core
 */
export interface IGameResult {
    /**
     * Optional array of scores, indexed the same as @see Game<TPlayer>.players
     */
    scores?: number[];

    /**
     * @internal
     */
    replayIndex?: number;
}

/**
 * Types of objects that can be used in a player click prompt.
 * @category Prompts
 */
export type Clickable = GameObject | Button | TextInput;

/**
 * Types of value that can be embedded in a message.
 * @category Messages
 */
export type MessageEmbed = string | boolean | number | ITextEmbeddable | readonly MessageEmbed[];

/**
 * Describes a message displayed at the top of the screen. Can include embedded buttons or other objects.
 * @category Messages
 */
export type Message = string | { format: string, args?: MessageEmbed[] };

/**
 * @category Core
 */
export interface IRunConfig {
    players: IPlayerConfig[];
    replay?: IReplayData;
    breakPoints?: number[];
    breakUrl?: string;

    onUpdateViews?: { (gameViews: GameView[], spectatorView: GameView): void };
}

/**
 * Base interface for a custom game. You'll want to extend {@link Game<TPlayer>} instead.
 * @category Core
 */
export interface IGame {
    /**
     * Called exactly once by a host to run a game.
     * @param config Configuration containing info like player count and names
     */
    run(config: IRunConfig): Promise<IGameResult>;

    /**
     * Called by a host when a player responds to a prompt.
     */
    respondToPrompt(playerIndex: number, promptIndex: number, payload?: any): void;
    
    /**
     * @internal
     */
    dispatchUpdateView(): void;
    
    /**
     * Describes all of the actions taken so far, so that the game can be resumed later.
     */
    get replayData(): IReplayData;
}

/**
 * @category Settings
 */
export interface ISettings {
    [key: string]: Setting;
}

/**
 * @category Settings
 */
export type Setting =
    | ICheckBoxSetting
    | ISelectSetting;

/**
 * @category Settings
 */
export interface ISetting {
    title?: string;
    description?: string;
}

/**
 * @category Settings
 */
export interface ICheckBoxSetting extends ISetting {
    type: "checkbox";
    default?: boolean;
}

/**
 * @category Settings
 */
export interface ISelectSetting extends ISetting {
    type: "select";
    options: ISelectOption[];
}

/**
 * @category Settings
 */
export interface ISelectOption {
    title?: string;
    description?: string;
    default?: boolean;
}

/**
 * Your game should default export this interface, describing how to configure and play your game.
 * @category Core
 */
export interface IGameConfig {
    /**
     * Describes which version of the BGE API your game was built with.
     * This should be set to {@link API_VERSION} in bge-core.
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

    settings?: ISettings;
}

/**
 * Interface for objects that can be embedded in messages.
 * @category Messages
 */
export interface ITextEmbeddable {
    /**
     * Renders the object for embedding in text.
     * @param ctx Information about the visibility of the object, and who's viewing it.
     */
    renderTextEmbed(ctx: RenderContext): TextEmbedView;
}
