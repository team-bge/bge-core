import { RenderContext } from "./display.js";
import { ITextEmbeddable } from "./interfaces.js";
import { Footprint, GameObject } from "./object.js";
import { CardView, ImageView, TextEmbedView, ViewType } from "./views.js";

export interface ICardFace {
    image?: ImageView;
}

const cardWidthKey = Symbol("width");
const cardHeightKey = Symbol("height");
const cardThicknessKey = Symbol("thickness");

/**
 * Describes whether a card is face up or down.
 */
export enum CardOrientation {
    /**
     * The front face of the card is visible.
     */
    FaceUp,

    /**
     * The back of the card is visible, and the front face is hidden.
     */
    FaceDown
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
}

/**
 * @summary A game object representing a rectangular playing card.
 * @description Can have arbitrary front and back images, dimensions (including thickness), and rounded corners.
 * Specify dimensions using the `@Card.width()`, `@Card.height()`, and `@Card.thickness` decorators on your custom class.
 */
export class Card extends GameObject implements ITextEmbeddable {
    /**
     * Specify the width of a custom card class.
     * @param cm Width in centimeters.
     */
    static width(cm: number): ClassDecorator {
        return Reflect.metadata(cardWidthKey, cm);
    }

    /**
     * Specify the height of a custom card class.
     * @param cm Height in centimeters.
     */
    static height(cm: number): ClassDecorator {
        return Reflect.metadata(cardHeightKey, cm);
    }

    /**
     * Specify the thickness of a custom card class.
     * @param cm Thickness in centimeters.
     */
    static thickness(cm: number): ClassDecorator {
        return Reflect.metadata(cardThicknessKey, cm);
    }

    /**
     * Get the dimensions of a card class, as specified by `width` / `height` / `thickness` decorators.
     * @param CardType Type of card to get the dimensions of.
     * @returns Width, height, and thickness of the card in centimeters.
     */
    static getDimensions(CardType: { new(...args: any[]): Card }): ICardDimensions {
        return {
            width: Reflect.getMetadata(cardWidthKey, CardType) ?? 10,
            height: Reflect.getMetadata(cardHeightKey, CardType) ?? 10,
            thickness: Reflect.getMetadata(cardThicknessKey, CardType) ?? 0.02
        };
    }

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
     * Stores graphical information about the front face of the card, as seen if the card isn't hidden.
     */
    front: ICardFace = {};
    
    /**
     * Stores graphical information about the front face of the card, as seen if the card is hidden.
     */
    hidden: ICardFace = {};
    
    /**
     * Stores graphical information about the back face of the card.
     */
    back: ICardFace = {};

    constructor() {
        super();

        const dims = Card.getDimensions(Object.getPrototypeOf(this).constructor);

        this.width = dims.width;
        this.height = dims.height;
        this.thickness = dims.thickness;
    }

    override get footprint(): Footprint {
        return {
            width: this.width,
            height: this.height
        };
    }
    
    render(ctx: RenderContext): CardView {
        return {
            type: ViewType.Card,

            prompt: ctx.player?.prompt.get(this),

            front: ctx.isHidden ? this.hidden.image : this.front.image,
            back: this.back.image,

            cornerRadius: 0.25,

            width: this.width,
            height: this.height,
            thickness: this.thickness
        };
    }
    
    renderTextEmbed(ctx: RenderContext): TextEmbedView {
        return {
            icon: { ...this.front.image, aspectRatio: this.width / this.height },
            label: this.name
        };
    }
}
