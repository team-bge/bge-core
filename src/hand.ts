import { Card, CardComparer, CardOrientation } from "./card.js";
import { LinearCardContainer, LinearContainerKind } from "./cardcontainer.js";
import { RenderContext } from "./display.js";
import { Footprint } from "./object.js";
import { CardView, HandView, OutlineStyle, ViewType } from "./views.js";

/**
 * How cards in a hand are positioned when there is free space.
 */
export enum HandAlignment {
    /**
     * Align to the left edge of the hand.
     */
    Left,

    /**
     * Center the cards in the hand.
     */
    Center,

    /**
     * Align to the right edge of the hand.
     */
    Right
}

/**
 * Options for creating a `Hand<TCard>`.
 */
export interface IHandOptions<TCard extends Card> {
    /**
     * Default orientation of new cards added to the hand.
     */
    orientation?: CardOrientation;

    /**
     * How cards in a hand are positioned when there is free space.
     */
    alignment?: HandAlignment;

    /**
     * Optional comparison function to auto-sort newly added cards.
     */
    autoSort?: CardComparer<TCard>;
}

/**
 * Holds a wad of cards, where each card is displayed separately.
 */
export class Hand<TCard extends Card> extends LinearCardContainer<TCard> {
    /** 
     * Maximum width of the area that hand cards are displayed in, in centimeters.
     */
    readonly width: number;

    /**
     * Height of the area that hand cards are displayed in, in centimeters. Matches the card height.
     */
    readonly height: number;

    /**
     * How cards in a hand are positioned when there is free space.
     */
    readonly alignment: HandAlignment;

    override get footprint(): Footprint {
        return {
            width: this.width + 2,
            height: this.height + 2
        };
    }

    /**
     * Left-most card in the hand. The oldest added, and next to be drawn.
     */
    get first(): TCard | null {
        return this.count === 0 ? null : this.getCard(0);
    }
    
    /**
     * Right-most card in the hand. The most recently added, and last to be drawn.
     */
    get last(): TCard | null {
        return this.count === 0 ? null : this.getCard(this.count - 1);
    }

    /**
     * Holds a wad of cards, where each card is displayed separately.
     * @param CardType Constructor for the type of card stored in this container. Used to find the card dimensions.
     * @param width Maximum width of the area that hand cards are displayed in, in centimeters.
     * @param options Optional configuration options.
     */
    constructor(CardType: { new(...args: any[]): TCard }, width: number, options?: IHandOptions<TCard>) {
        super(CardType, LinearContainerKind.FirstInLastOut, options?.orientation, options?.autoSort);
    
        const dims = Card.getDimensions(CardType);

        this.width = width;
        this.height = dims.height;

        this.alignment = options?.alignment ?? HandAlignment.Center;
    }

    render(ctx: RenderContext): HandView {
        const dims = this.cardDimensions;

        const view: HandView = {
            type: ViewType.Hand,
            
            prompt: ctx.player?.prompt.get(this),

            width: this.width,
            height: this.height,

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
