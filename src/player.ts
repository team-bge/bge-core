import { ParentMap, RenderContext } from "./display.js";
import { IGame, IPlayerConfig, ITextEmbeddable } from "./interfaces.js";
import { GameObject } from "./object.js";
import { CameraView, Prompt, PromptKind, TextEmbedView, TopBarView } from "./views.js";

interface IPromptInfo {
    parent: PromptHelper;
    index: number;
    groups?: PromptGroup[];
    resolve: { (): void };
    reject: { (reason?: any): void };
}

export class PromptGroup {
    private readonly _prompts = new Set<IPromptInfo>();
    
    add(prompt: IPromptInfo): void {
        this._prompts.add(prompt);
    }

    remove(prompt: IPromptInfo): void {
        this._prompts.delete(prompt);
    }

    cancel(): void {
        const prompts = [...this._prompts];
        this._prompts.clear();

        for (let prompt of prompts) {
            prompt.reject("Cancelled");
        }
    }
}

export class PromptHelper {
    private readonly _player: Player;

    private _nextPromptIndex = 0;
    private readonly _prompts = new Map<GameObject, IPromptInfo>();

    get count(): number {
        return this._prompts.size;
    }

    constructor(player: Player) {
        this._player = player;
    }

    get(object: GameObject): Prompt | undefined {
        const prompt = this._prompts.get(object);
        if (prompt == null) {
            return undefined;
        }

        return {
            index: prompt.index,
            kind: PromptKind.Click
        };
    }

    respond(index: number): void {
        let match: IPromptInfo = null;
        
        for (let [object, prompt] of this._prompts) {
            if (prompt.index === index) {
                match = prompt;
                this._prompts.delete(object);
                break;
            }
        }

        if (match == null) {
            console.log(`Unable to find prompt ${index} for player ${this._player.index}.`);
            return;
        }

        match.resolve();
    }
    
    click(object: GameObject): Promise<undefined>;

    click(object: GameObject, groups: PromptGroup[] | PromptGroup): Promise<undefined>;

    click<TValue>(object: GameObject, value: TValue): Promise<TValue>;

    click<TValue>(object: GameObject, value: TValue, groups: PromptGroup[] | PromptGroup): Promise<TValue>;

    click<TValue>(object: GameObject, valueOrGroups?: TValue | PromptGroup[] | PromptGroup, groups?: PromptGroup[] | PromptGroup): Promise<TValue | undefined> {
        if (this._prompts.get(object) != null) {
            throw new Error("Tried to create multiple prompts from the same player for the same object.");
        }

        let value: TValue;

        if (groups == null) {
            if (valueOrGroups instanceof PromptGroup
                || Array.isArray(valueOrGroups)
                    && valueOrGroups.length > 0
                    && valueOrGroups.every(x => x instanceof PromptGroup)) {
                groups = valueOrGroups;
                value = undefined;
            } else {
                groups = undefined;
                value = valueOrGroups as TValue;
            }
        } else {
            value = valueOrGroups as TValue;
        }

        const promptInfo: IPromptInfo = {
            parent: this,
            index: this._nextPromptIndex++,
            groups: groups == null ? null
                : groups instanceof PromptGroup ? [groups]
                : [...groups],
            resolve: null,
            reject: null
        };
    
        this._prompts.set(object, promptInfo);
        this._player.game._dispatchUpdateView();

        if (promptInfo.groups != null) {
            for (let group of promptInfo.groups) {
                group.add(promptInfo);
            }
        }

        return new Promise((resolve, reject) => {
            promptInfo.resolve = () => {
                this._prompts.delete(object);

                const groups = promptInfo.groups;
                promptInfo.groups = null;

                if (groups != null) {
                    for (let group of groups) {
                        group.remove(promptInfo);
                    }
            
                    for (let group of groups) {
                        group.cancel();
                    }
                }

                resolve(value);
            },

            promptInfo.reject = (reason?: any) => {
                this._prompts.delete(object);
                
                const groups = promptInfo.groups;
                promptInfo.groups = null;

                if (groups != null) {
                    for (let group of groups) {
                        group.remove(promptInfo);
                    }
                }

                reject(reason);
            }
        });
    }

    clickAny<TObject extends GameObject>(objects: ArrayLike<TObject> | Iterable<TObject>, groups?: PromptGroup[] | PromptGroup): Promise<TObject> {
        const objectArray = Array.from(objects);
        
        groups ??= new PromptGroup();

        return Promise.any(objectArray.map(x => this.click(x, x, groups)));
    }
}

export class TopBar {
    private _format?: string;
    private _args?: any[];

    clear(): void {
        this._format = null;
        this._args = null;
    }

    setText(format: string, ...args: any[]): void {
        this._format = format;
        this._args = args;

        if (format != null) {
            let maxIndex = -1;
            
            for(let match of format.matchAll(/\{\s*(?<index>[0-9]+)\s*(?::(?<format>[^}]*))?\}/gi)) {
                const index = parseInt(match.groups["index"]);
                maxIndex = Math.max(maxIndex, index);
            }

            if (maxIndex >= 0 && (args == null || args.length <= maxIndex)) {
                throw new Error(`Expected at least ${maxIndex + 1} args, got ${args?.length ?? 0}.`);
            }
        }
    }

    render(ctx: RenderContext): TopBarView {
        return {
            format: this._format,
            embeds: this._args?.map(x => ctx.renderTextEmbed(x))
        };
    }
}

export class Player implements ITextEmbeddable {
    private _index: number;
    private _config: IPlayerConfig;
    private _game: IGame;

    _oldParentMap?: ParentMap;

    readonly prompt = new PromptHelper(this);
    readonly topBar = new TopBar();

    get game(): IGame {
        return this._game;
    }

    get index(): number {
        return this._index;
    }

    get name(): string {
        return this._config.name;
    }

    // TODO: wrap this
    cameras: CameraView[] = [];

    _init(game: IGame, index: number, config: IPlayerConfig): void {
        if (this._config != null) {
            throw new Error("This player has already been initialized.");
        }

        this._game = game;
        this._index = index;
        this._config = config;
    }
    
    renderTextEmbed(ctx: RenderContext): TextEmbedView {
        return {
            label: this.name
        };
    }
}
