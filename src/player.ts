import { Color } from "./color.js";
import { ChildIndexMap, ParentMap, RenderContext } from "./display.js";
import { IPlayerConfig, ITextEmbeddable } from "./interfaces.js";
import { PromptHelper } from "./prompt.js";
import { CameraView, TextEmbedView } from "./views.js";

/**
 * Represents a player in a game.
 * Use a deriving class to store any per-player properties, like scores or owned objects.
 * Use {@link Player.prompt} to request inputs from a player.
 * @category Core
 */
export class Player implements ITextEmbeddable {
    static readonly DEFAULT_COLORS: readonly Color[] = [
        Color.parse("0000ff"),
        Color.parse("ff0000"),
        Color.parse("ffff00"),
        Color.parse("00ff00")
    ];

    readonly index: number;
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

    /**
     * If true, it's this player's turn, and they'll have a visual indicator that they should act.
     */
    get isActive(): boolean {
        return this.prompt.activeCount > 0;
    }

    get color(): Color {
        return Player.DEFAULT_COLORS[this.index % Player.DEFAULT_COLORS.length];
    }

    constructor(index: number, config: IPlayerConfig) {
        this.index = index;
        this.name = config.name;
    }

    renderTextEmbed(_: RenderContext): TextEmbedView {
        return {
            label: this.name
        };
    }
}
