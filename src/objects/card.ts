import { RenderContext } from "../display.js";
import { DisplayContainer } from "../displaycontainer.js";
import { ITextEmbeddable } from "../interfaces.js";
import { GameObject } from "./object.js";
import { CardView, ImageView, TextEmbedView, ViewType } from "../views.js";
import { Bounds, Vector3 } from "../math/index.js";

export class CardFace {
    image?: ImageView;
}

const cardWidthKey = Symbol("width");
const cardHeightKey = Symbol("height");
const cardThicknessKey = Symbol("thickness");
const cardCornerRadiusKey = Symbol("cornerRadius");

/**
 * Describes whether a card is face up or down.
 */
export enum CardOrientation {
    /**
     * The front face of the card is visible.
     */
    FACE_UP,

    /**
     * The back of the card is visible, and the front face is hidden.
     */
    FACE_DOWN
}

export type CardComparer<TCard extends Card> = { (a: TCard, b: TCard): number };

/**
 * Describes the dimensions of a rectangular card in centimeters.
 */
export interface ICardDimensions {
    /**
     * Width of the card in centimeters.
     */
    width: number;
    
    /**
     * Height of the card in centimeters.
     */
    height: number;
    
    /**
     * Thickness of the card in centimeters.
     */
    thickness: number;

    /**
     * Corner radius of the card in centimeters.
     */
    cornerRadius: number;
}

/**
 * Specify the width of a custom card class.
 * @param cm Width in centimeters.
 */
export function width(cm: number): ClassDecorator {
    return Reflect.metadata(cardWidthKey, cm);
}

/**
 * Specify the height of a custom card class.
 * @param cm Height in centimeters.
 */
export function height(cm: number): ClassDecorator {
    return Reflect.metadata(cardHeightKey, cm);
}

/**
 * Specify the thickness of a custom card class.
 * @param cm Thickness in centimeters.
 */
export function thickness(cm: number): ClassDecorator {
    return Reflect.metadata(cardThicknessKey, cm);
}

/**
 * Specify the corner radius of a custom card class.
 * @param cm Radius in centimeters.
 */
export function cornerRadius(cm: number): ClassDecorator {
    return Reflect.metadata(cardCornerRadiusKey, cm);
}

/**
 * @summary A game object representing a rectangular playing card.
 * @description Can have arbitrary front and back images, dimensions (including thickness), and rounded corners.
 * Specify dimensions using the `@Card.width()`, `@Card.height()`, and `@Card.thickness` decorators on your custom class.
 */
export class Card extends GameObject implements ITextEmbeddable {
    /**
     * Get the dimensions of a card class, as specified by `width` / `height` / `thickness` decorators.
     * @param CardType Type of card to get the dimensions of.
     * @returns Width, height, and thickness of the card in centimeters.
     */
    static getDimensions(CardType: { new(...args: any[]): Card }): ICardDimensions {
        return {
            width: Reflect.getMetadata(cardWidthKey, CardType) ?? 10,
            height: Reflect.getMetadata(cardHeightKey, CardType) ?? 10,
            thickness: Reflect.getMetadata(cardThicknessKey, CardType) ?? 0.02,
            cornerRadius: Reflect.getMetadata(cardCornerRadiusKey, CardType) ?? 0.25
        };
    }

    private readonly _localBounds: Bounds;

    /**
     * Width of the card in centimeters.
     */
    readonly width: number;
    
    /**
     * Height of the card in centimeters.
     */
    readonly height: number;
    
    /**
     * Thickness of the card in centimeters.
     */
    readonly thickness: number;

    /**
     * Corner radius of the card in centimeters.
     */
    readonly cornerRadius: number;

    /**
     * Stores graphical information about the front face of the card, as seen if the card isn't hidden.
     */
    readonly front = new CardFace();
    
    /**
     * Stores graphical information about the front face of the card, as seen if the card is hidden.
     */
    readonly hidden = new CardFace();
    
    /**
     * Stores graphical information about the back face of the card.
     */
    readonly back = new CardFace();

    /**
     * @summary Contains child objects that are displayed on top of this card.
     * @description This will also contain objects from `@display()` annotated properties,
     * using the property keys as names.
     */
    readonly children = new DisplayContainer();

    constructor() {
        super();

        const dims = Card.getDimensions(Object.getPrototypeOf(this).constructor);

        this.width = dims.width;
        this.height = dims.height;
        this.thickness = dims.thickness;

        this._localBounds = new Bounds(new Vector3(dims.width, dims.height, dims.thickness));

        this.cornerRadius = dims.cornerRadius;

        this.children.addProperties(this);
    }

    override get localBounds(): Bounds {
        return this._localBounds;
    }
    
    override render(ctx: RenderContext): CardView {
        let view = {
            type: ViewType.CARD,

            prompt: ctx.player?.prompt.get(this),

            front: ctx.isHidden ? this.hidden.image : this.front.image,
            back: this.back.image,

            width: this.width,
            height: this.height,
            thickness: this.thickness,
            cornerRadius: this.cornerRadius,

            children: this.children.isEmpty ? undefined : []
        } as CardView;
        
        if (!this.children.isEmpty) {
            ctx.setParentView(this, view);
            this.children.render(ctx, this, view.children);
        }

        return view;
    }
    
    renderTextEmbed(ctx: RenderContext): TextEmbedView {
        return {
            icon: { ...this.front.image, aspectRatio: this.width / this.height },
            label: this.name
        };
    }
}
