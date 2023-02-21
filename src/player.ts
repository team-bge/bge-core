import { ChildIndexMap, ParentMap, RenderContext } from "./display.js";
import { IGame, IPlayerConfig, ITextEmbeddable } from "./interfaces.js";
import { PromptHelper } from "./prompt.js";
import { CameraView, TextEmbedView } from "./views.js";

/**
 * @summary Represents a player in a game.
 * @description Use a deriving class to store any per-player properties, like scores or owned objects.
 * Use `Player.prompt` to request inputs from a player.
 */
export class Player implements ITextEmbeddable {
    private _index: number;
    private _config: IPlayerConfig;
    private _game: IGame;

    /**
     * @internal
     */
    _oldChildIndexMap?: ChildIndexMap;
    
    /**
     * @internal
     */
    _oldParentMap?: ParentMap;

    readonly prompt = new PromptHelper(this);

    /**
     * Which game this player was created by.
     */
    get game(): IGame {
        return this._game;
    }

    /**
     * Index of this player in the `Game.players` array.
     */
    get index(): number {
        return this._index;
    }

    /**
     * Displayable nickname of this player.
     */
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
