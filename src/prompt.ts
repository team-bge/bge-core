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

export interface IClickOptions {
    if?: boolean;
    message?: Message;
}

export interface IReturnClickOptions<TReturn> extends IClickOptions {
    return: TReturn;
}

export interface IClickAnyOptions {
    if?: boolean;
    message: Message;
}

export class PromptHelper {
    private readonly _player: Player;

    private _nextPromptIndex = 0;
    private readonly _promptsByObject = new Map<Clickable, IPromptInfo>();
    private readonly _promptsByIndex = new Map<number, IPromptInfo>();

    constructor(player: Player) {
        this._player = player;
    }

    private get game() {
        return this._player.game as Game<any>;
    }

    get count(): number {
        return this._promptsByIndex.size;
    }

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

    static messageToString(message: Message): string {
        if (typeof message === "string") {
            return message;
        }

        if (message.format === "{0}" && message.args?.length === 1 && message.args[0] instanceof Button) {
            return message.args[0].label;
        }

        return `{ format: ${message.format}, ${message.args?.map((x, i) => `${i}: ${x}`).join(", ")} }`;
    }

    click<TButton extends Button>(object: TButton, options?: IClickOptions ): Promise<TButton>;
    click<TValue>(object: Button, options: IReturnClickOptions<TValue> ): Promise<TValue>;

    click<TObject extends GameObject>(object: TObject, options: IClickOptions & { message: Message }): Promise<TObject>;
    click<TValue>(object: GameObject, options: IReturnClickOptions<TValue> & { message: Message }): Promise<TValue>;
    
    click<TObject extends Clickable, TValue>(object: TObject, options?: IClickOptions | IReturnClickOptions<TValue>): Promise<TObject | TValue> {
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
            message: options?.message ?? { format: "{0}", args: [ object ] },
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

    clickAny<TObject extends GameObject>(objects: ArrayLike<TObject> | Iterable<TObject>, options: IClickAnyOptions): Promise<TObject> {
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
