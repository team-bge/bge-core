import { GameObject, IRenderContext } from "./game";
import { CardView, ImageView, ViewType } from "./views";

export interface ICardFace {
    image?: ImageView;
}

const cardWidthKey = Symbol("width");
const cardHeightKey = Symbol("height");

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

    static getDimensions(CardType: { new(): Card }): { width: number, height: number } {
        return {
            width: Reflect.getMetadata(cardWidthKey, CardType) ?? 10,
            height: Reflect.getMetadata(cardHeightKey, CardType) ?? 10,
        }
    }
    
    render(ctx: IRenderContext): CardView {
        const dims = Card.getDimensions(Object.getPrototypeOf(this).constructor);

        return {
            type: ViewType.Card,
            identity: 0,

            front: this.front.image,
            back: this.back.image,

            cornerRadius: 0.25,

            width: dims.width,
            height: dims.height
        };
    }
}
