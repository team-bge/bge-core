import { Button, TextInput } from "./button.js";
import { delay } from "./delay.js";
import { game } from "./game.js";
import { Clickable, Message } from "./interfaces.js";
import { GameObject } from "./objects/object.js";
import { Player } from "./player.js";
import { PromiseGroup, anyExclusive, all } from "./promisegroup.js";
import { IPromptResponseEvent, ReplayEventType, replay } from "./replay.js";
import { Prompt, PromptKind } from "./views.js";

interface IPromptInfo {
    parent: PromptHelper;
    index: number;
    kind: PromptKind;
    message: Message;
    showDuringDelays: boolean;
    order: number;
    resolve: { (payload?: any): void }; // eslint-disable-line @typescript-eslint/no-explicit-any
    reject: { (reason?: any): void }; // eslint-disable-line @typescript-eslint/no-explicit-any
}

/**
 * @category Prompts
 */
export interface IPromptOptions {
    /**
     * Sorting order for displaying a message about this prompt in the message bar.
     * Defaults to 0. Messages with the same order value are sorted by newest first.
     */
    order?: number;

    /**
     * Show this prompt when delays are active. Defaults to false.
     */
    showDuringDelays?: boolean;

    /**
     * Only create the prompt if true. Defaults to true.
     */
    if?: boolean;

    /**
     * Optional message to display to the prompted player.
     */
    message?: Message;
}

/**
 * Base options for prompting a player to click on something.
 * @category Prompts
 */
export interface IClickOptions extends IPromptOptions {
}

/**
 * Options for prompting a player to click on a {@link Button}.
 * @category Prompts
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
 * @category Prompts
 */
export interface IReturnClickOptions<TReturn> extends IClickOptions {
    /**
     * When the player responds to the prompt, resolve with this value.
     */
    return: TReturn;
}

/**
 * Options for a prompt to click a {@link GameObject}.
 * @category Prompts
 */
export interface IObjectClickOptions extends IClickOptions {
    /**
     * Required message to display to the prompted player.
     */
    message: Message;
}

/**
 * @category Prompts
 */
export interface IClickAnyOptions extends IObjectClickOptions {
    /**
     * If true, automatically resolve this prompt if there is exactly one object to click on.
     */
    autoResolveIfSingle?: boolean;
}

/**
 * @category Prompts
 */
export interface ITextInputOptions extends IPromptOptions {
    
}

/**
 * Helper to create input prompts for a player.
 * The prompts will be created as promises that:
 * Resolve when the player responds to the prompt
 * Reject when the prompt is cancelled
 * 
 * Prompts will cancel if they are created in an {@link anyExclusive} call, and another prompt
 * or delay created in the same call resolved first. Prompts will also cancel when created in
 * an {@link all} call, and another promise in that call rejected.
 * @category Prompts
 */
export class PromptHelper {
    private readonly _player: Player;

    private _nextPromptIndex = 0;
    private _respondedCount = 0;

    private readonly _promptsByObject = new Map<Clickable, IPromptInfo>();
    private readonly _promptsByIndex = new Map<number, IPromptInfo>();

    /**
     * @param player
     * @internal
     */
    constructor(player: Player) {
        this._player = player;
    }

    /**
     * Number of distinct active prompts for this player.
     */
    get activeCount(): number {
        return this._promptsByIndex.size;
    }

    /**
     * Total number of distinct prompts for this player, both active and historical.
     */
    get totalCount(): number {
        return this._nextPromptIndex;
    }

    /**
     * Total number of valid prompts that this player has responded to.
     */
    get respondedCount(): number {
        return this._respondedCount;
    }

    /**
     * Array of messages describing the active prompts for this player.
     */
    get messages(): readonly Message[] {
        if (this._promptsByIndex.size === 0) {
            return [];
        }

        const set = new Set<Message>();
        const sorted: { message: Message, order: number }[] = [];

        const anyDelays = delay.anyActive;

        for (const [, prompt] of this._promptsByIndex) {
            if (prompt.message == null) {
                continue;
            }

            if (anyDelays && !prompt.showDuringDelays) {
                continue;
            }

            if (set.has(prompt.message)) {
                continue;
            }

            set.add(prompt.message);
            sorted.push({ message: prompt.message, order: prompt.order });
        }

        return sorted.sort((a, b) => a.order - b.order).map(x => x.message);
    }

    /**
     * @param object
     * @internal
     */
    get(object: Clickable): Prompt | undefined {
        const prompt = this._promptsByObject.get(object);
        if (prompt == null) {
            return undefined;
        }

        if (!prompt.showDuringDelays && delay.anyActive) {
            return undefined;
        }

        return {
            index: prompt.index,
            kind: prompt.kind
        };
    }

    /**
     * @param index
     * @param payload
     * @internal
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    respond(index: number, payload?: any): void {
        const prompt = this._promptsByIndex.get(index);

        if (prompt == null || !prompt.showDuringDelays && delay.anyActive) {
            console.log(`Unable to find prompt ${index} for player ${this._player.index}.`);
            return;
        }

        prompt.resolve(payload);
    }

    private remove(index: number, object?: Clickable): boolean {
        return this._promptsByIndex.delete(index) && (object == null || this._promptsByObject.delete(object));
    }

    /**
     * Creates a prompt that resolves when the player clicks on the given button. The button will be
     * displayed in a message seen only by the prompted player. When resolved, the clicked button
     * will be returned.
     * @param object {@link Button} to be clicked.
     * @param options Optional options to configure the prompt.
     * @returns A promise that resolves to the clicked button.
     */
    click<TButton extends Button>(object: TButton, options?: IButtonClickOptions): Promise<TButton>;
    
    /**
     * Creates a prompt that resolves when the player clicks on the given button. The button will be
     * displayed in a message seen only by the prompted player. When resolved, the clicked button
     * will be returned.
     * @param label Text to be displayed on the button.
     * @param options Optional options to configure the prompt.
     * @returns A promise that resolves to {@link label}.
     */
    click(label: string, options?: IButtonClickOptions): Promise<string>;
    
    /**
     * Creates a prompt that resolves when the player clicks on the given button. The button will be
     * displayed in a message seen only by the prompted player. When resolved, the value specified in
     * {@link IReturnClickOptions.return} will be returned.
     * @param object {@link Button} to be clicked.
     * @param options Options to configure the prompt, including the {@link IReturnClickOptions.return} value.
     * @returns A promise that resolves to {@link IReturnClickOptions.return}.
     */
    click<TValue>(object: Button, options: IReturnClickOptions<TValue> & IButtonClickOptions): Promise<TValue>;
    
    
    /**
     * Creates a prompt that resolves when the player clicks on the given button. The button will be
     * displayed in a message seen only by the prompted player. When resolved, the value specified in
     * {@link IReturnClickOptions.return} will be returned.
     * @param label Text to be displayed on the button.
     * @param options Options to configure the prompt, including the {@link IReturnClickOptions.return} value.
     * @returns A promise that resolves to {@link IReturnClickOptions.return}.
     */
    click<TValue>(label: string, options: IReturnClickOptions<TValue> & IButtonClickOptions): Promise<TValue>;

    /**
     * Creates a prompt that resolves when the player clicks on the given {@link GameObject}. An accompanying
     * message must be provided in {@link IObjectClickOptions.message} that will be displayed to the prompted player. When
     * resolved, the clicked object will be returned.
     * @param object {@link GameObject} to be clicked.
     * @param options Options to configure the prompt, including the {@link IObjectClickOptions.message} text.
     * @returns A promise that resolves to the clicked object.
     */
    click<TObject extends Clickable>(object: TObject, options: IObjectClickOptions): Promise<TObject>;

    /**
     * Creates a prompt that resolves when the player clicks on the given {@link GameObject}. An accompanying
     * message must be provided in {@link IObjectClickOptions.message} that will be displayed to the prompted player. When
     * resolved, the value specified in {@link IReturnClickOptions.return} will be returned.
     * @param object {@link GameObject} to be clicked.
     * @param options Options to configure the prompt, including the {@link IObjectClickOptions.message} text and {@link IReturnClickOptions.return} value.
     * @returns A promise that resolves to {@link IReturnClickOptions.return}.
     */
    click<TValue>(object: Clickable, options: IReturnClickOptions<TValue> & IObjectClickOptions): Promise<TValue>;

    async click<TObject extends Clickable | string, TValue>(target: TObject,
        options?: (IButtonClickOptions | IObjectClickOptions) & (IReturnClickOptions<TValue> | object)): Promise<TObject | TValue> {
        if (options?.if === false) {
            return Promise.reject("Prompt condition is false");
        }

        const value = options != null && "return" in options ? options.return : target;
        let object: Clickable;

        if (typeof target === "string") {
            object = new Button(target);
        } else {
            object = target;
        }
        
        if (this._promptsByObject.get(object) != null) {
            throw new Error("Tried to create multiple prompts from the same player for the same object.");
        }

        if (object == null) {
            return Promise.reject("No object provided to click on");
        }
        
        await this.prompt(PromptKind.CLICK, options, object);

        return value;
    }

    /**
     * Creates a prompt that resolves when any of the given {@link GameObject}s are clicked on. An accompanying
     * message must be provided in {@link IObjectClickOptions.message} that will be displayed to the prompted player. When
     * resolved, the clicked object will be returned.
     * @param objects The set of objects to be clicked.
     * @param options Options to configure the prompt, including the {@link IObjectClickOptions.message} text.
     * @returns A promise that resolves to the clicked object.
     */
    clickAny<TObject extends Clickable>(objects: ArrayLike<TObject> | Iterable<TObject>,
        options: IClickAnyOptions): Promise<TObject> {

        if (options?.if === false) {
            return Promise.reject("Prompt condition is false");
        }

        const objectSet = new Set(Array.from(objects).filter(x => x != null));

        if ((options.autoResolveIfSingle ?? false) && objectSet.size === 1) {
            PromiseGroup.current?.itemResolved();
            return Promise.resolve(objectSet.values().next().value);
        }

        return anyExclusive(() => [...objectSet].map(x => this.click(x, {
            return: x,
            message: options.message
        })));
    }

    async textInput(label: string, options?: ITextInputOptions): Promise<string> {
        if (options?.if === false) {
            return Promise.reject("Prompt condition is false");
        }

        const textInput = new TextInput(label);

        return (await this.prompt<string>(PromptKind.TEXT_INPUT, options, textInput)) ?? "";
    }

    private async prompt<T = void>(kind: PromptKind, options?: IPromptOptions, object?: Clickable): Promise<T> {
        const index = this._nextPromptIndex++;

        const promptInfo: IPromptInfo = {
            parent: this,
            index: index,
            kind: kind,
            showDuringDelays: options?.showDuringDelays ?? false,
            message: options?.message ?? { format: "{0}", args: [ object as Button ] },
            order: options?.order ?? 0,
            resolve: null,
            reject: null
        };

        const group = PromiseGroup.current;

        if (object != null) {
            this._promptsByObject.set(object, promptInfo);
        }

        this._promptsByIndex.set(index, promptInfo);

        const event: IPromptResponseEvent = {
            type: ReplayEventType.PROMPT_RESPONSE,
            playerIndex: this._player.index,
            promptIndex: index
        };

        const pending = await replay.pendingEvent(event);
        let result = pending?.payload as T;

        if (pending == null) {
            const promise = new Promise<T>((resolve, reject) => {
                promptInfo.resolve = payload => {
                    if (this.remove(index, object)) {
                        resolve(payload);
                    }
                };
    
                promptInfo.reject = reason => {
                    if (this.remove(index, object)) {
                        reject(reason);
                    }
                };
            });
            
            group?.catch(promptInfo.reject);
    
            if (replay.isRecording && this._promptsByIndex.has(index)) {
                game.dispatchUpdateView();
            }
    
            try {
                result = await promise;
                replay.writeEvent({ ...event, payload: result } );
            } catch (e) {
                group?.itemRejected(e);
                throw e;
            }
        } else if (!this.remove(index, object)) {
            throw new Error("Resolved an invalid prompt");
        }
        
        this._respondedCount += 1;

        group?.itemResolved();

        if (replay.isRecording) {
            game.dispatchUpdateView();
        }

        return result;
    }

    /**
     * Cancels all active prompts for this player.
     * @param reason
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    cancelAll(reason?: any): void {
        for (const info of [...this._promptsByIndex.values()]) {
            info.reject(reason ?? "All prompts cancelled");
        }

        this._promptsByObject.clear();
        this._promptsByIndex.clear();
    }
}
