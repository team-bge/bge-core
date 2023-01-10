import { Card } from "./card";
import { GameObject, IRenderContext } from "./game";
import { DeckView, OutlineStyle, ViewType } from "./views";

export class Deck<TCard extends Card> extends GameObject {
    private readonly _CardType: { new(): TCard };
    private readonly _cards: TCard[] = [];

    constructor(CardType: { new(...args: any[]): TCard }) {
        super();

        this._CardType = CardType;
    }

    get count(): number {
        return this._cards.length;
    }

    get isEmpty(): boolean {
        return this._cards.length == 0;
    }

    add(card: TCard): Promise<void> {
        this._cards.push(card);

        return Promise.resolve();
    }

    draw(): Promise<TCard> {
        const topCard = this._cards.splice(this._cards.length - 1, 1)[0];
        return Promise.resolve(topCard);
    }

    addRange(cards: TCard[] | Iterable<TCard>): Promise<void> {
        if (!Array.isArray(cards)) {
            cards = Array.from(cards);
        }

        this._cards.push(...cards);

        return Promise.resolve();
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

    render(ctx: IRenderContext): DeckView {
        const dims = Card.getDimensions(this._CardType);

        return {
            type: ViewType.Deck,
            identity: 0,

            width: dims.width,
            height: dims.height,

            count: this._cards.length,

            outlineStyle: OutlineStyle.Dashed,

            topCard: this._cards.length == 0 ? null : this._cards[this._cards.length - 1].render(ctx)
        };
    }
}
