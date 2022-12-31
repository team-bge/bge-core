import { Image } from "./image";

export interface ICardFace {
    image: Image;
}

export class Card {
    front: ICardFace;
    hidden: ICardFace;
    back: ICardFace;
    
    static width(cm: number): ClassDecorator {
        return (target: Function) => {
            // TODO
        };
    }

    static height(cm: number): ClassDecorator {
        return (target: Function) => {
            // TODO
        };
    }
}
