import { Card, CardComparer, CardOrientation, LinearCardContainer, LinearContainerKind } from "./card.js";
import { RenderContext } from "./display.js";
import { _Internal } from "./internal.js";
import { Footprint } from "./object.js";
import { CardView, HandView, OutlineStyle, ViewType } from "./views.js";

export enum HandAlignment {
    Left,
    Center,
    Right
}

export interface IHandOptions<TCard extends Card> {
    orientation?: CardOrientation;
    alignment?: HandAlignment;
    autoSort?: CardComparer<TCard>;
}

export class Hand<TCard extends Card> extends LinearCardContainer<TCard> {
    readonly width: number;
    readonly alignment: HandAlignment;

    override get footprint(): Footprint {
        const dims = this.cardDimensions;

        return {
            width: this.width + 2,
            height: dims.height + 2
        };
    }

    get first(): TCard | null {
        return this.count === 0 ? null : this.getCard(0);
    }
    
    get last(): TCard | null {
        return this.count === 0 ? null : this.getCard(this.count - 1);
    }

    constructor(CardType: { new(...args: any[]): TCard }, width: number, options?: IHandOptions<TCard>) {
        super(CardType, LinearContainerKind.FirstInLastOut, options?.orientation, options?.autoSort);
    
        this.width = width;
        this.alignment = options?.alignment ?? HandAlignment.Center;
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
        
        ctx.setParentView(this, view);

        if (this.count > 0) {
            const slack = this.width - dims.width;
            const dx = this.count <= 1 ? 0 : Math.min(slack / (this.count - 1), dims.width * 0.95);
            const innerWidth = dims.width + (this.count - 1) * dx;

            let pivot: number;

            switch (this.alignment) {
                case HandAlignment.Left:
                    pivot = 0;
                    break;

                case HandAlignment.Right:
                    pivot = 1;
                    break;

                default:
                    pivot = 0.5;
                    break;
            }

            for (let i = 0; i < this.count; ++i) {
                const orientation = this.getOrientation(i);
                const isSelected = !ctx.isHidden && this.getSelected(i);
                const cardView = ctx.renderChild(this.getCard(i), this, this.getChildId(i), {
                    localPosition: { x: dims.width * 0.5 - this.width * 0.5 + (this.width - innerWidth) * pivot + i * dx, y: dims.thickness * (i + 0.5), z: isSelected ? 1.0 : undefined },
                    localRotation: orientation == CardOrientation.FaceUp ? undefined : { z: 180 },
                    isHidden: orientation == CardOrientation.FaceDown ? true : undefined
                }) as CardView;

                view.cards.push(cardView);
            }
        }

        return view;
    }
}
