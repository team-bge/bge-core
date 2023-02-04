import { Button } from "./button.js";
import { Game } from "./game.js";
import { Clickable, Message } from "./interfaces.js";
import { GameObject } from "./object.js";
import { Player } from "./player.js";
import { Prompt, PromptKind } from "./views.js";

interface IPromptInfo {
    parent: PromptHelper;
    index: number;
    message: Message;
    resolve: { (): void };
    reject: { (reason?: any): void };
}

/**
 * Base options for prompting a player to click on something.
 */
export interface IClickOptions {
    /**
     * Only create the prompt if true. Defaults to true.
     */
    if?: boolean;
}

/**
 * Options for prompting a player to click on a `Button`.
 */
export interface IButtonClickOptions extends IClickOptions {
    /**
     * Optional message to display to the prompted player. You'll need to include
     * the button somewhere in the message, otherwise the player can't click it!
     * Defaults to just showing the button.
     */
    message?: Message;
}

/**
 * Options for a prompt with a custom return value.
 */
export interface IReturnClickOptions<TReturn> extends IClickOptions {
    /**
     * When the player responds to the prompt, resolve with this value.
     */
    return: TReturn;
}

/**
 * Options for a prompt to click a `GameObject`.
 */
export interface IObjectClickOptions extends IClickOptions {
    /**
     * Required message to display to the prompted player.
     */
    message: Message;
}

/**
 * @summary Helper to create input prompts for a player.
 * @description The prompts will be created as promises that:
 * * Resolve when the player responds to the prompt
 * * Reject when the prompt is cancelled
 * 
 * Prompts will cancel if they are created in a `Game.exclusiveAny()` call, and another prompt
 * or delay created in the same call resolved first. Prompts will also cancel when created in
 * a `Game.all()` call, and another promise in that call rejected.
 */
export class PromptHelper {
    private readonly _player: Player;

    private _nextPromptIndex = 0;
    private readonly _promptsByObject = new Map<Clickable, IPromptInfo>();
    private readonly _promptsByIndex = new Map<number, IPromptInfo>();

    /**
     * @internal
     */
    constructor(player: Player) {
        this._player = player;
    }

    private get game() {
        return this._player.game as Game<any>;
    }

    /**
     * Total number of distinct active prompts for this player.
     */
    get count(): number {
        return this._promptsByIndex.size;
    }

    /**
     * Array of messages describing the active prompts for this player.
     */
    get messages(): readonly Message[] {
        if (this._promptsByIndex.size === 0) {
            return [];
        }

        const set = new Set<Message>();
        const sorted: Message[] = [];

        for (let [_, prompt] of this._promptsByIndex) {
            if (prompt.message == null) {
                continue;
            }

            if (set.has(prompt.message)) {
                continue;
            }

            set.add(prompt.message);
            sorted.push(prompt.message);
        }

        return sorted;
    }

    /**
     * @internal
     */
    get(object: Clickable): Prompt | undefined {
        const prompt = this._promptsByObject.get(object);
        if (prompt == null) {
            return undefined;
        }

        return {
            index: prompt.index,
            kind: PromptKind.Click
        };
    }

    /**
     * @internal
     */
    respond(index: number): void {
        const prompt = this._promptsByIndex.get(index);

        if (prompt == null) {
            console.log(`Unable to find prompt ${index} for player ${this._player.index}.`);
            return;
        }

        prompt.resolve();
    }

    private remove(object: Clickable, index: number): boolean {
        return this._promptsByObject.delete(object) && this._promptsByIndex.delete(index);
    }

    private static messageToString(message: Message): string {
        if (typeof message === "string") {
            return message;
        }

        if (message.format === "{0}" && message.args?.length === 1 && message.args[0] instanceof Button) {
            return message.args[0].label;
        }

        return `{ format: ${message.format}, ${message.args?.map((x, i) => `${i}: ${x}`).join(", ")} }`;
    }

    /**
     * Creates a prompt that resolves when the player clicks on the given button. The button will be
     * displayed in a message seen only by the prompted player. When resolved, the clicked button
     * will be returned.
     * @param object `Button` to be clicked.
     * @param options Optional options to configure the prompt.
     * @returns A promise that resolves to the clicked button.
     */
    click<TButton extends Button>(object: TButton, options?: IButtonClickOptions): Promise<TButton>;
    
    /**
     * Creates a prompt that resolves when the player clicks on the given button. The button will be
     * displayed in a message seen only by the prompted player. When resolved, the value specified in
     * `options.return` will be returned.
     * @param object `Button` to be clicked.
     * @param options Options to configure the prompt, including the `return` value.
     * @returns A promise that resolves to `options.return`.
     */
    click<TValue>(object: Button, options: IReturnClickOptions<TValue> & IButtonClickOptions): Promise<TValue>;

    /**
     * Creates a prompt that resolves when the player clicks on the given `GameObject`. An accompanying
     * message must be provided in `options.message` that will be displayed to the prompted player. When
     * resolved, the clicked object will be returned.
     * @param object `GameObject` to be clicked.
     * @param options Options to configure the prompt, including the `message` text.
     * @returns A promise that resolves to the clicked object.
     */
    click<TObject extends GameObject>(object: TObject, options: IObjectClickOptions): Promise<TObject>;

    /**
     * Creates a prompt that resolves when the player clicks on the given `GameObject`. An accompanying
     * message must be provided in `options.message` that will be displayed to the prompted player. When
     * resolved, the value specified in `options.return` will be returned.
     * @param object `GameObject` to be clicked.
     * @param options Options to configure the prompt, including the `message` text and `return` value.
     * @returns A promise that resolves to `options.return`.
     */
    click<TValue>(object: GameObject, options: IReturnClickOptions<TValue> & IObjectClickOptions): Promise<TValue>;
    
    click<TObject extends Clickable, TValue>(object: TObject,
        options?: (IButtonClickOptions | IObjectClickOptions) & (IReturnClickOptions<TValue> | {})): Promise<TObject | TValue> {
        if (options?.if === false) {
            return Promise.reject("Prompt condition is false");
        }
        
        if (this._promptsByObject.get(object) != null) {
            throw new Error("Tried to create multiple prompts from the same player for the same object.");
        }

        if (object == null) {
            return Promise.reject("No object provided to click on");
        }

        const value = "return" in options ? options.return : object;
        const index = this._nextPromptIndex++;

        const promptInfo: IPromptInfo = {
            parent: this,
            index: index,
            message: options?.message ?? { format: "{0}", args: [ object as Button ] },
            resolve: null,
            reject: null
        };

        const group = this.game.promiseGroup;

        const promise = new Promise<TObject | TValue>((resolve, reject) => {
            promptInfo.resolve = () => {
                if (this.remove(object, index)) {
                    console.log(`Resolving ${index} (${PromptHelper.messageToString(promptInfo.message)})`);
                    group?.itemResolved();
                    resolve(value);
                }
            },

            promptInfo.reject = (reason?: any) => {
                if (this.remove(object, index)) {
                    console.log(`Rejecting ${index} (${PromptHelper.messageToString(promptInfo.message)})`);

                    try {
                        group?.itemRejected(reason);
                    } finally {
                        reject(reason);
                    }
                }
            }
        });
    
        this._promptsByObject.set(object, promptInfo);
        this._promptsByIndex.set(index, promptInfo);

        group?.catch(reason => {
            promptInfo.reject(reason);
        });

        if (this._promptsByIndex.has(index)) {
            this.game.dispatchUpdateView();
        }

        return promise;
    }

    /**
     * Creates a prompt that resolves when any of the given `GameObject`s are clicked on. An accompanying
     * message must be provided in `options.message` that will be displayed to the prompted player. When
     * resolved, the clicked object will be returned.
     * @param objects The set of objects to be clicked.
     * @param options Options to configure the prompt, including the `message` text.
     * @returns A promise that resolves to the clicked object.
     */
    clickAny<TObject extends GameObject>(objects: ArrayLike<TObject> | Iterable<TObject>,
        options: IObjectClickOptions): Promise<TObject> {

        if (options?.if === false) {
            return Promise.reject("Prompt condition is false");
        }

        const objectArray = Array.from(objects);

        return this.game.anyExclusive(() => objectArray.map(x => this.click(x, {
            return: x,
            message: options.message
        })));
    }
}
