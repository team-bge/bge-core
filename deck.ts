import { Card, CardOrientation } from "./card";
import { RenderContext } from "./display";
import { GameObject } from "./game";
import { CardView, DeckView, OutlineStyle, ViewType } from "./views";

export class Deck<TCard extends Card> extends GameObject {
    private readonly _CardType: { new(): TCard };
    private readonly _cards: TCard[] = [];

    private readonly _addOrientation: CardOrientation;
    private readonly _drawOrientation: CardOrientation;

    constructor(CardType: { new(...args: any[]): TCard },
        addOrientation?: CardOrientation,
        drawOrientation?: CardOrientation) {
        super();

        this._CardType = CardType;
        this._addOrientation = addOrientation;
        this._drawOrientation = drawOrientation;
    }

    get count(): number {
        return this._cards.length;
    }

    get isEmpty(): boolean {
        return this._cards.length == 0;
    }

    add(card: TCard): Promise<void> {
        this._cards.push(card);

        if (this._addOrientation != null) {
            card.orientation = this._addOrientation;
        }

        return Promise.resolve();
    }

    addRange(cards: TCard[] | Iterable<TCard>): Promise<void> {
        if (!Array.isArray(cards)) {
            cards = Array.from(cards);
        }

        this._cards.push(...cards);
        
        if (this._addOrientation != null) {
            for (let card of cards) {
                card.orientation = this._addOrientation;
            }
        }

        return Promise.resolve();
    }

    draw(): Promise<TCard> {
        const topCard = this._cards.splice(this._cards.length - 1, 1)[0];

        if (this._drawOrientation != null) {
            topCard.orientation = this._drawOrientation;
        }

        return Promise.resolve(topCard);
    }

    drawRange(count: number): Promise<TCard[]> {
        count = Math.min(this.count, count);

        if (count == 0) {
            return Promise.resolve([]);
        }

        const cards = this._cards.splice(this._cards.length - count, count);

        if (this._drawOrientation != null) {
            for (let card of cards) {
                card.orientation = this._drawOrientation;
            }
        }

        return Promise.resolve(cards);
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
            view.topCard = ctx.renderChild(this._cards[this._cards.length - 1], this, 0) as CardView;
            
            view.topCard.localPosition = view.topCard.localPosition ?? { };
            view.topCard.localPosition.y = view.topCard.localPosition.y ?? 0.0;
            view.topCard.localPosition.y += view.topCard.thickness * (this.count - 0.5);

            for (let i = 0; i < this._cards.length - 1; ++i) {
                ctx.renderChild(this._cards[i], this);
            }
        }

        return view;
    }
}
