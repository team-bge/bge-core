import { Card, CardOrientation } from "./card.js";
import { LinearCardContainer, LinearContainerKind } from "./cardcontainer.js";
import { RenderContext } from "./display.js";
import { CardView, DeckView, OutlineStyle, ViewType } from "./views.js";

export interface IDeckOptions {
    orientation?: CardOrientation;
    alwaysShowCount?: boolean;
}

/**
 * Stores a first-in-last-out stack of cards. Only the top card is visible, but players can see how many cards are in the stack.
 */
export class Deck<TCard extends Card> extends LinearCardContainer<TCard> {
    readonly alwaysShowCount: boolean;

    constructor(CardType: { new(...args: any[]): TCard }, options?: IDeckOptions) {
        super(CardType, LinearContainerKind.FirstInLastOut, options?.orientation);
    
        this.alwaysShowCount = options?.alwaysShowCount ?? false;
    }

    /**
     * Top-most card, the one that will be next drawn. This is null for empty decks.
     */
    get top(): TCard | null {
        return this.count == 0 ? null : this.getCard(this.count - 1);
    }

    render(ctx: RenderContext): DeckView {
        const dims = this.cardDimensions;

        const view: DeckView = {
            type: ViewType.Deck,
            
            prompt: ctx.player?.prompt.get(this),

            width: dims.width,
            height: dims.height,

            count: this.count,
            showCount: this.alwaysShowCount,

            outlineStyle: OutlineStyle.Dashed
        };

        ctx.setParentView(this, view);

        if (!this.isEmpty) {
            for (let i = 0; i < this.count - 1; ++i) {
                const orientation = this.getOrientation(i);
                ctx.renderInternalChild(this.getCard(i), this, view, {
                    localPosition: { y: dims.thickness * (i + 0.5) },
                    localRotation: orientation == CardOrientation.FaceUp ? undefined : { z: 180 },
                    isHidden: orientation == CardOrientation.FaceDown
                });
            }

            const topOrientation = this.getOrientation(this.count - 1);
            view.topCard = ctx.renderChild(this.getCard(this.count - 1), this, this.getChildId(this.count - 1), {
                localPosition: { y: dims.thickness * (this.count - 0.5) },
                localRotation: topOrientation == CardOrientation.FaceUp ? undefined : { z: 180 },
                isHidden: topOrientation == CardOrientation.FaceDown
            }) as CardView;
        }

        return view;
    }
}
