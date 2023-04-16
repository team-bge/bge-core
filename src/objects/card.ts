import { RenderContext } from "../display.js";
import { DisplayContainer } from "../displaycontainer.js";
import { ITextEmbeddable } from "../interfaces.js";
import { GameObject } from "./object.js";
import { CardView, ImageView, TextEmbedView, ViewType } from "../views.js";
import { Bounds, Vector3 } from "../math/index.js";

export class CardFace {
    image?: ImageView;
}

export enum CardShape {
    RECTANGLE,
    HEXAGON
}

const cardDimensionsKey = Symbol("card:dimensions");

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
    shape: CardShape;

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
 * Specify the dimensions of a custom card class.
 * @param width Width in centimeters.
 */
export function rectangleCard(width: number, height: number, thickness: number, cornerRadius: number = 0): ClassDecorator {
    return Reflect.metadata(cardDimensionsKey, {
        shape: CardShape.RECTANGLE,
        width: width,
        height: height,
        thickness: thickness,
        cornerRadius: cornerRadius
    } as ICardDimensions);
}

export function hexagonCard(size: number, thickness: number): ClassDecorator {
    return Reflect.metadata(cardDimensionsKey, {
        shape: CardShape.HEXAGON,
        width: size,
        height: size,
        thickness: thickness
    } as ICardDimensions);
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
        return Reflect.getMetadata(cardDimensionsKey, CardType)
        ?? {
            shape: CardShape.RECTANGLE,
            width: 10,
            height: 10,
            thickness: 0.1,
            cornerRadius: 0
        };
    }

    private readonly _localBounds: Bounds;

    /**
     * Shape of the card (rectangle, hexagon, ...).
     */
    readonly shape: CardShape;

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

        this.shape = dims.shape;
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
            sides: this.shape === CardShape.HEXAGON
                ? 6 : 4,

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
