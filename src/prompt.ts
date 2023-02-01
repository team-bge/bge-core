import { Button } from "./button.js";
import { GameObject } from "./object.js";
import { Player } from "./player.js";
import { ITopBarRow, TopBar } from "./topbar.js";
import { Prompt, PromptKind } from "./views.js";

interface IPromptInfo {
    parent: PromptHelper;
    index: number;
    groups?: PromptGroup[];
    resolve: { (): void };
    reject: { (reason?: any): void };
}

interface ITopBarCase extends ITopBarRow {
    readonly condition?: { (player: Player): boolean };
    readonly priority: number;
}

export class PromptGroup {
    private readonly _prompts = new Set<IPromptInfo>();
    
    private readonly _topBarCases: ITopBarCase[] = [];

    addSummary(format: string, ...args: any[]): void;
    addSummary<TPlayer extends Player>(
        condition: { (player: TPlayer): boolean },
        format: string, ...args: any[]): void;

    addSummary<TPlayer extends Player>(...args: any[]): void {
        let condition: { (player: TPlayer): boolean };
        let format: string;
        let priority = 0;

        if (typeof args[0] === "string") {
            const buttons = args.filter(x => x instanceof Button);
            condition = player => buttons.every(btn => player.prompt.get(btn) != null);
            format = args[0];
            args = args.slice(1);
            priority = buttons.length;
        } else {
            condition = args[0];
            format = args[1];
            args = args.slice(2);
            priority = Number.MAX_VALUE;
        }
        
        TopBar.validate(format, args);

        this._topBarCases.push({
            condition: condition,
            priority: priority,
            format: format,
            args: args
        });
    }

    getTopBarRow(player: Player): ITopBarRow | null {
        let bestMatch: ITopBarCase = null;
        let bestPriority = -1;

        for (let item of this._topBarCases) {
            if (item.condition != null && !item.condition(player)) {
                continue;
            }

            if (item.priority <= bestPriority) {
                continue;
            }

            bestMatch = item;
            bestPriority = item.priority;
        }

        return bestMatch;
    }
    
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

    constructor(player: Player) {
        this._player = player;
    }

    get count(): number {
        return this._prompts.size;
    }

    get groups(): readonly PromptGroup[] {
        const groups = new Set<PromptGroup>();

        for (let [obj, prompt] of this._prompts) {
            if (prompt.groups == null) {
                continue;
            }

            for (let group of prompt.groups) {
                groups.add(group);
            }
        }

        return [...groups];
    }

    get topBarRows(): readonly ITopBarRow[] {
        const allContent = [];
        
        for (let group of this.groups) {
            const content = group.getTopBarRow(this._player);
            if (content != null) {
                allContent.push(content);
            }
        }

        return allContent;
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

        if (object == null) {
            return Promise.reject("No object provided to click on");
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
