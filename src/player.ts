import { Color } from "./color.js";
import { ChildIndexMap, ParentMap, RenderContext } from "./display.js";
import { IGame, IPlayerConfig, ITextEmbeddable } from "./interfaces.js";
import { PromptHelper } from "./prompt.js";
import { CameraView, TextEmbedView } from "./views.js";

/**
 * @summary Represents a player in a game.
 * @description Use a deriving class to store any per-player properties, like scores or owned objects.
 * Use {@link Player.prompt} to request inputs from a player.
 */
export class Player<TGame extends IGame = IGame> implements ITextEmbeddable {
    static readonly DEFAULT_COLORS: readonly Color[] = [
        Color.parse("0000ff"),
        Color.parse("ff0000"),
        Color.parse("ffff00"),
        Color.parse("00ff00")
    ];

    readonly index: number;
    readonly game: TGame;
    readonly name: string;

    /**
     * @internal
     */
    _oldChildIndexMap?: ChildIndexMap;
    
    /**
     * @internal
     */
    _oldParentMap?: ParentMap;

    readonly prompt: PromptHelper = new PromptHelper(this);

    // TODO: wrap this
    cameras: CameraView[] = [];

    get color(): Color {
        return Player.DEFAULT_COLORS[this.index % Player.DEFAULT_COLORS.length];
    }

    constructor(game: TGame, index: number, config: IPlayerConfig) {
        this.game = game;
        this.index = index;
        this.name = config.name;
    }
    
    renderTextEmbed(ctx: RenderContext): TextEmbedView {
        return {
            label: this.name
        };
    }
}
