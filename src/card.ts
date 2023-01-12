import { RenderContext } from "./display";
import { GameObject } from "./game";
import { CardView, ImageView, ViewType } from "./views";

export interface ICardFace {
    image?: ImageView;
}

const cardWidthKey = Symbol("width");
const cardHeightKey = Symbol("height");
const cardThicknessKey = Symbol("thickness");

export enum CardOrientation {
    FaceUp,
    FaceDown
}

export class Card extends GameObject {
    front: ICardFace = {};
    hidden: ICardFace = {};
    back: ICardFace = {};
    
    static width(cm: number): ClassDecorator {
        return Reflect.metadata(cardWidthKey, cm);
    }

    static height(cm: number): ClassDecorator {
        return Reflect.metadata(cardHeightKey, cm);
    }

    static thickness(cm: number): ClassDecorator {
        return Reflect.metadata(cardThicknessKey, cm);
    }

    static getDimensions(CardType: { new(): Card }): { width: number, height: number, thickness: number } {
        return {
            width: Reflect.getMetadata(cardWidthKey, CardType) ?? 10,
            height: Reflect.getMetadata(cardHeightKey, CardType) ?? 10,
            thickness: Reflect.getMetadata(cardThicknessKey, CardType) ?? 0.02
        };
    }
    
    render(ctx: RenderContext): CardView {
        const dims = Card.getDimensions(Object.getPrototypeOf(this).constructor);

        return {
            type: ViewType.Card,

            front: ctx.isHidden ? this.hidden.image : this.front.image,
            back: this.back.image,

            cornerRadius: 0.25,

            width: dims.width,
            height: dims.height,
            thickness: dims.thickness
        };
    }
}
