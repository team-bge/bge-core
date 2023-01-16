import { Card, CardOrientation, LinearCardContainer, LinearContainerKind } from "./card.js";
import { RenderContext } from "./display.js";
import { _Internal } from "./internal.js";
import { CardView, DeckView, OutlineStyle, ViewType } from "./views.js";

export class Deck<TCard extends Card> extends LinearCardContainer<TCard> {
    constructor(CardType: { new(...args: any[]): TCard }, orientation?: CardOrientation) {
        super(CardType, LinearContainerKind.FirstInLastOut, orientation);
    }

    render(ctx: RenderContext): DeckView {
        const dims = this.cardDimensions;

        const view: DeckView = {
            type: ViewType.Deck,

            width: dims.width,
            height: dims.height,

            count: this.count,

            outlineStyle: OutlineStyle.Dashed
        };

        ctx.setParentView(this, view);

        if (!this.isEmpty) {
            for (let i = 0; i < this.count - 1; ++i) {
                ctx.renderInternalChild(this.getCard(i), this, view, {
                    localPosition: { y: dims.thickness * (i + 0.5) },
                    localRotation: this.orientation == CardOrientation.FaceUp ? undefined : { z: 180 },
                    isHidden: this.orientation == CardOrientation.FaceDown
                });
            }

            view.topCard = ctx.renderChild(this.getCard(this.count - 1), this, 0, {
                localPosition: { y: dims.thickness * (this.count - 0.5) },
                localRotation: this.orientation == CardOrientation.FaceUp ? undefined : { z: 180 },
                isHidden: this.orientation == CardOrientation.FaceDown
            }) as CardView;
        }

        return view;
    }
}
