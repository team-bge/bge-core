import { RenderContext } from "./display.js";
import { ITextEmbeddable } from "./interfaces.js";
import { Footprint, GameObject } from "./object.js";
import { Color, TextEmbedView, TokenView, ViewType } from "./views.js";

/**
 * Model shape for a {@link Token}.
 */
export enum TokenShape {
    Cube
}

/**
 * Optional configuration for a {@link Token}.
 */
export interface ITokenOptions {
    /**
     * Sets the name for the token.
     */
    name?: string;
    
    /**
     * Model shape, defaults to {@link TokenShape.Cube}.
     */
    shape?: TokenShape;

    /**
     * Model scale, defaults to 1.
     * For a cube, this is the width in centimeters.
     */
    scale?: number;

    /**
     * Model tint color, defaults to `{r: 255, g: 255, b: 255}`.
     */
    color?: Color;
}

/**
 * A playing piece with a 3D model, tint color, and scale.
 */
export class Token extends GameObject implements ITextEmbeddable {

    /**
     * Model shape.
     */
    readonly shape: TokenShape;
    
    /**
     * Model scale.
     * For a cube, this is the width in centimeters.
     */
    readonly scale: number;

    /**
     * Model tint color.
     */
    readonly color: Color;
    
    /**
     * A playing piece with a 3D model, tint color, and scale.
     * @param options Optional configuration for a {@link Token}.
     */
    constructor(options: ITokenOptions) {
        super();

        this.name = options.name ?? "Token";

        this.shape = options.shape ?? TokenShape.Cube;
        this.scale = options.scale ?? 1;
        this.color = options.color == null
            ? { r: 255, g: 255, b: 255 }
            : {
                r: options.color?.r ?? 0,
                g: options.color?.g ?? 0,
                b: options.color?.b ?? 0
            };
    }

    get footprint(): Footprint {
        return {
            width: this.scale,
            height: this.scale
        };
    }
    
    render(ctx: RenderContext): TokenView {
        return {
            type: ViewType.Token,

            prompt: ctx.player?.prompt.get(this),

            scale: this.scale,
            color: this.color,
        };
    }

    renderTextEmbed(ctx: RenderContext): TextEmbedView {
        return {
            icon: { url: "https://iili.io/HG55yVS.png", color: this.color, aspectRatio: 1 },
            label: this.name
        };
    }
}