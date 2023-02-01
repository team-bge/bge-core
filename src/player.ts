import { ParentMap, RenderContext } from "./display.js";
import { IGame, IPlayerConfig, ITextEmbeddable } from "./interfaces.js";
import { PromptHelper } from "./prompt.js";
import { CameraView, TextEmbedView } from "./views.js";

export class Player implements ITextEmbeddable {
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
