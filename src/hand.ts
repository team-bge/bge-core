import { Card, CardOrientation, LinearCardContainer, LinearContainerKind } from "./card.js";
import { RenderContext } from "./display.js";
import { _Internal } from "./internal.js";
import { Footprint } from "./object.js";
import { CardView, HandView, OutlineStyle, ViewType } from "./views.js";

export class Hand<TCard extends Card> extends LinearCardContainer<TCard> {
    readonly width: number;

    override get footprint(): Footprint {
        const dims = this.cardDimensions;

        return {
            width: this.width + 2,
            height: dims.height + 2
        };
    }

    constructor(CardType: { new(...args: any[]): TCard }, width: number, orientation?: CardOrientation) {
        super(CardType, LinearContainerKind.FirstInLastOut, orientation);
    
        this.width = width;
    }

    render(ctx: RenderContext): HandView {
        const dims = this.cardDimensions;

        const view: HandView = {
            type: ViewType.Hand,
            
            prompt: ctx.player?.prompt.get(this),

            width: this.width,
            height: dims.height,

            cards: [],

            outlineStyle: OutlineStyle.Dashed
        };

        if (this.count > 0) {
            const slack = this.width - dims.width;
            const dx = this.count <= 1 ? 0 : Math.min(slack / (this.count - 1), dims.width * 0.95);
            const innerWidth = dims.width + (this.count - 1) * dx;

            ctx.setParentView(this, view);

            for (let i = 0; i < this.count; ++i) {
                const orientation = this.getOrientation(i);
                const cardView = ctx.renderChild(this.getCard(i), this, this.getChildId(i), {
                    localPosition: { x: innerWidth * -0.5 + dims.width * 0.5 + i * dx, y: dims.thickness * (i + 0.5), z: this.getSelected(i) ? 1.0 : undefined },
                    localRotation: orientation == CardOrientation.FaceUp ? undefined : { z: 180 },
                    isHidden: orientation == CardOrientation.FaceDown
                }) as CardView;

                view.cards.push(cardView);
            }
        }

        return view;
    }
}
