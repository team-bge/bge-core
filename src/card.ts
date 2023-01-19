import { RenderContext } from "./display.js";
import { _Internal } from "./internal.js";
import { Footprint, GameObject } from "./object.js";
import { CardView, ImageView, ViewType } from "./views.js";

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

export interface ICardDimensions {
    width: number;
    height: number;
    thickness: number;
}

export class Card extends GameObject {
    front: ICardFace = {};
    hidden: ICardFace = {};
    back: ICardFace = {};

    override get footprint(): Footprint {
        return Card.getDimensions(Object.getPrototypeOf(this).constructor);
    }
    
    static width(cm: number): ClassDecorator {
        return Reflect.metadata(cardWidthKey, cm);
    }

    static height(cm: number): ClassDecorator {
        return Reflect.metadata(cardHeightKey, cm);
    }

    static thickness(cm: number): ClassDecorator {
        return Reflect.metadata(cardThicknessKey, cm);
    }

    static getDimensions(CardType: { new(...args: any[]): Card }): ICardDimensions {
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

            prompt: ctx.player?.prompt.get(this),

            front: ctx.isHidden ? this.hidden.image : this.front.image,
            back: this.back.image,

            cornerRadius: 0.25,

            width: dims.width,
            height: dims.height,
            thickness: dims.thickness
        };
    }
}

export interface ICardReceiver<TCard> {
    add(card: TCard): void;
    addRange(cards: TCard[] | Iterable<TCard>): void;
}

export abstract class CardContainer<TCard extends Card> extends GameObject implements ICardReceiver<TCard> {
    private readonly _CardType: { new(...args: any[]): TCard };

    get cardDimensions(): ICardDimensions {
        return Card.getDimensions(this._CardType);
    }

    abstract get count(): number;

    constructor(CardType: { new(...args: any[]): TCard }) {
        super();

        this._CardType = CardType;
    }

    add(card: TCard): void {
        card._lastActionIndex = _Internal.getNextActionIndex();
        this.onAdd(card);
    }

    protected abstract onAdd(card: TCard): void;
    
    addRange(cards: TCard[] | Iterable<TCard>): void {
        for (let card of cards) { 
            this.add(card);
        }
    }

    remove(card: TCard): TCard {
        this.onRemove(card);
        return card;
    }

    protected abstract onRemove(card: TCard): void;
}

export enum LinearContainerKind {
    FirstInFirstOut,
    FirstInLastOut
}

interface ILinearContainerCard<TCard extends Card> {
    card: TCard;
    orientation: CardOrientation;
    childId: number;
}

export abstract class LinearCardContainer<TCard extends Card> extends CardContainer<TCard> implements Iterable<TCard> {
    private readonly _cards: ILinearContainerCard<TCard>[] = [];
    private readonly _kind: LinearContainerKind;

    private _nextChildId: number = 0;

    readonly orientation: CardOrientation;

    constructor(CardType: { new(...args: any[]): TCard }, kind: LinearContainerKind, orientation: CardOrientation = CardOrientation.FaceUp) {
        super(CardType);

        this._kind = kind;

        this.orientation = orientation;
    }

    [Symbol.iterator](): Iterator<TCard> {
        return this._cards.map(x => x.card)[Symbol.iterator]();
    }

    override get footprint(): Footprint {
        const cardDims = this.cardDimensions;
        return {
            width: cardDims.width + 2,
            height: cardDims.height + 2
        };
    }

    get count(): number {
        return this._cards.length;
    }

    get isEmpty(): boolean {
        return this._cards.length == 0;
    }

    getCard(index: number): TCard {
        return this._cards[index].card;
    }

    protected getChildId(index: number): number {
        return this._cards[index].childId;
    }

    getOrientation(index: number): CardOrientation {
        return this._cards[index].orientation;
    }

    protected override onAdd(card: TCard): void {
        this._cards.push({card: card, orientation: this.orientation, childId: this._nextChildId++ });
    }

    protected override onRemove(card: TCard): void {
        for (let i = this._cards.length - 1; i >= 0; i--) {
            if (this._cards[i].card == card) {
                this._cards.splice(i, 1);
                return;
            }
        }
    }

    draw(): TCard {
        return this.drawRange(1)[0];
    }

    drawRange(count: number): TCard[] {
        count = Math.min(this.count, count);

        switch (this._kind) {
            case LinearContainerKind.FirstInLastOut:
                return this._cards.splice(this._cards.length - count, count).reverse().map(x => x.card);

            case LinearContainerKind.FirstInFirstOut:
                return this._cards.splice(0, count).map(x => x.card);

            default:
                throw new Error("Not implemented");
        }
    }

    tryDeal(targets: ICardReceiver<TCard>[], count: number = 1): boolean {
        if (this.count < targets.length * count) {
            return false;
        }

        this.deal(targets, count);
        return true;
    }

    deal(targets: ICardReceiver<TCard>[], count: number = 1): void {
        for (let i = 0; i < count; ++i) {
            for (let target of targets) {
                if (this.isEmpty) return;
                target.add(this.draw());
            }
        }
    }

    shuffle(): void {
        for (let i = 0; i < this._cards.length - 1; ++i) {
            const swapIndex = i + Math.floor(Math.random() * (this._cards.length - i));

            const a = this._cards[i];
            const b = this._cards[swapIndex];
            
            this._cards[i] = b;
            this._cards[swapIndex] = a;
        }
    }
}
