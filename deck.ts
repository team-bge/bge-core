import { Card, CardOrientation } from "./card";
import { RenderContext } from "./display";
import { GameObject } from "./game";
import { CardView, DeckView, OutlineStyle, ViewType } from "./views";

export class Deck<TCard extends Card> extends GameObject {
    private readonly _CardType: { new(): TCard };
    private readonly _cards: TCard[] = [];

    readonly orientation: CardOrientation;

    constructor(CardType: { new(...args: any[]): TCard }, orientation?: CardOrientation) {
        super();

        this._CardType = CardType;

        this.orientation = orientation;
    }

    get count(): number {
        return this._cards.length;
    }

    get isEmpty(): boolean {
        return this._cards.length == 0;
    }

    add(card: TCard): void {
        this._cards.push(card);
    }

    addRange(cards: TCard[] | Iterable<TCard>): void {
        if (!Array.isArray(cards)) {
            cards = Array.from(cards);
        }

        this._cards.push(...cards);
    }

    draw(): TCard {
        return this.drawRange(1)[0];
    }

    drawRange(count: number): TCard[] {
        count = Math.min(this.count, count);
        return this._cards.splice(this._cards.length - count, count).reverse();
    }

    shuffle(): Promise<void> {
        for (let i = 0; i < this._cards.length - 1; ++i) {
            const swapIndex = i + Math.floor(Math.random() * (this._cards.length - i));

            const a = this._cards[i];
            const b = this._cards[swapIndex];
            
            this._cards[i] = b;
            this._cards[swapIndex] = a;
        }

        return Promise.resolve();
    }

    render(ctx: RenderContext): DeckView {
        const dims = Card.getDimensions(this._CardType);

        const view: DeckView = {
            type: ViewType.Deck,

            width: dims.width,
            height: dims.height,

            count: this._cards.length,

            outlineStyle: OutlineStyle.Dashed
        };

        ctx.setParentView(this, view);

        if (!this.isEmpty) {
            for (let i = 0; i < this._cards.length - 1; ++i) {
                ctx.renderInternalChild(this._cards[i], this, view, {
                    localPosition: { y: dims.thickness * (i + 0.5) },
                    localRotation: this.orientation == CardOrientation.FaceUp ? undefined : { z: 180 },
                    isHidden: this.orientation == CardOrientation.FaceDown
                });
            }

            view.topCard = ctx.renderChild(this._cards[this._cards.length - 1], this, 0, {
                localPosition: { y: dims.thickness * (this.count - 0.5) },
                localRotation: this.orientation == CardOrientation.FaceUp ? undefined : { z: 180 },
                isHidden: this.orientation == CardOrientation.FaceDown
            }) as CardView;
        }

        return view;
    }
}
