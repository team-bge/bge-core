import { RenderContext } from "../display.js";
import { ITextEmbeddable } from "../interfaces.js";
import { Bounds, Vector3 } from "../math/index.js";
import { Face, GameObject } from "./object.js";
import { ShapeView, TextEmbedView, TokenView, ViewType } from "../views.js";
import { Color } from "../color.js";
import { DisplayContainer } from "../displaycontainer.js";

/**
 * Optional configuration for a {@link Token}.
 * @category Game Objects
 */
export interface ITokenOptions {
    /**
     * Sets the name for the token.
     */
    name?: string;
    
    /**
     * If true, the token is oriented upright.
     */
    standing?: boolean;

    /**
     * Thickness of the extruded shape in centimeters, before {@link scale} is applied.
     */
    thickness?: number;

    /**
     * Model tint color, defaults to white.
     */
    color?: Color;
}

/**
 * @category Game Objects
 */
export interface ISvgTokenOptions extends ITokenOptions {
    /**
     * Url of the SVG file to use for this token's shape.
     */
    url: string;

    /**
     * Width of the token in centimeters.
     */
    width: number;

    /**
     * Height of the token in centimeters.
     */
    height: number;
}

/**
 * @category Game Objects
 */
export interface IPolygonTokenOptions extends ITokenOptions {
    /**
     * Number of sides of the regular polygon that will be extruded for this token's shape.
     */
    sides: number;

    /**
     * Diameter in centimeters.
     */
    size: number;
}

/**
 * A playing piece with a 3D model, tint color, and scale.
 * @category Game Objects
 */
export class Token extends GameObject implements ITextEmbeddable {

    private readonly _shapeView: ShapeView;

    /**
     * Model tint color.
     */
    readonly color?: Color;
    
    /**
     * Contains child objects that are displayed on top of this token.
     * This will also contain objects from {@link display} annotated properties,
     * using the property keys as names.
     */
    readonly children = new DisplayContainer();
    
    /**
     * Stores graphical information about the front face of the token, as seen if the token isn't hidden.
     */
    readonly front = new Face();
    
    /**
     * Stores graphical information about the front face of the token, as seen if the token is hidden.
     */
    readonly hidden = new Face();
    
    /**
     * Stores graphical information about the back face of the token.
     */
    readonly back = new Face();

    /**
     * Stores graphical information about the side faces of the token.
     */
    readonly sides = new Face();

    /**
     * A playing piece with a 3D model, tint color, and scale.
     * @param options Optional configuration for a {@link Token}.
     */
    constructor(options: ISvgTokenOptions | IPolygonTokenOptions) {
        super();

        this.name = options.name ?? "Token";

        if ((options as ISvgTokenOptions).url !== undefined) {
            const svgOptions = options as ISvgTokenOptions;
            this._shapeView = {
                url: svgOptions.url,
                thickness: svgOptions.thickness ?? 1.0,
                standing: svgOptions.standing ?? false,
                width: svgOptions.width ?? 1.0,
                height: svgOptions.height ?? 1.0,
                cornerRadius: 0,
                noSides: false
            };
        } else {
            const polygonOptions = options as IPolygonTokenOptions;
            this._shapeView = {
                sides: polygonOptions.sides ?? 4,
                thickness: options.thickness ?? 1.0,
                standing: options.standing ?? false,
                width: polygonOptions.size ?? 1.0,
                height: polygonOptions.size ?? 1.0,
                cornerRadius: 0,
                noSides: false
            };
        }

        this.color = options.color;

        this.children.addProperties(this);
    }

    override get localBounds(): Bounds {
        return new Bounds(new Vector3(this._shapeView.width, this._shapeView.height, this._shapeView.thickness));
    }
    
    override render(ctx: RenderContext): TokenView {
        const view = {
            type: ViewType.TOKEN,
            
            name: ctx.isHidden ? this.hiddenName : this.name,

            shape: this._shapeView,

            prompt: ctx.player?.prompt.get(this),

            scale: 1.0,
            color: this.color?.encoded,
            opacity: this.color?.a,

            front: ctx.isHidden ? this.hidden.imageView ?? this.back.imageView : this.front.imageView,
            back: this.back.imageView,
            sides: this.sides.imageView,

            children: this.children.isEmpty ? undefined : []
        } as TokenView;

        if (!this.children.isEmpty) {
            ctx.setParentView(this, view);
            this.children.render(ctx, this, view.children);
        }

        return view;
    }

    renderTextEmbed(_: RenderContext): TextEmbedView {
        return {
            icon: { url: "https://iili.io/HG55yVS.png", color: this.color, aspectRatio: 1 },
            label: this.name
        };
    }
}