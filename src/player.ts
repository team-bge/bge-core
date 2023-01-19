import { ParentMap } from "./display.js";
import { IGame, IPlayerConfig } from "./interfaces.js";
import { GameObject } from "./object.js";
import { Prompt, PromptKind } from "./views.js";

interface IPromptInfo {
    index: number;
    group?: PromptGroup;
    resolve: { (): void };
    reject: { (): void };
}

export class PromptGroup {

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

        if (match.group != null) {
            const toDelete: GameObject[] = [];
            const toReject: IPromptInfo[] = [];

            for (let [object, prompt] of this._prompts) {
                if (prompt.group == match.group) {
                    toDelete.push(object);
                    toReject.push(prompt);
                }
            }

            for (let object of toDelete) {
                this._prompts.delete(object);
            }

            for (let prompt of toReject) {
                prompt.reject();
            }
        }

        match.resolve();
    }

    clickAny<TObject extends GameObject>(objects: ArrayLike<TObject> | Iterable<TObject>): Promise<TObject> {
        const objectArray = Array.from(objects);
        const group = new PromptGroup();
        return Promise.any(objectArray.map(async x => {
            await this.click(x, group);
            return x;
        }));
    }

    click(object: GameObject, group?: PromptGroup): Promise<void> {
        if (this._prompts.get(object) != null) {
            throw new Error("Tried to create multiple prompts for the same object.");
        }

        const promptInfo: IPromptInfo = {
            index: this._nextPromptIndex++,
            group: group,
            resolve: null,
            reject: null
        };
    
        this._prompts.set(object, promptInfo);
        this._player.game._dispatchUpdateView();

        return new Promise((resolve, reject) => {
            promptInfo.resolve = resolve;
            promptInfo.reject = reject;
        });
    }
}

export class Player {
    private _index: number;
    private _config: IPlayerConfig;
    private _game: IGame;

    _oldParentMap?: ParentMap;

    readonly prompt = new PromptHelper(this);

    get game(): IGame {
        return this._game;
    }

    get index(): number {
        return this._index;
    }

    get name(): string {
        return this._config.name;
    }

    _init(game: IGame, index: number, config: IPlayerConfig): void {
        if (this._config != null) {
            throw new Error("This player has already been initialized.");
        }

        this._game = game;
        this._index = index;
        this._config = config;
    }
}
