import { Bounds, Rotation, Vector3 } from "../math/index.js";

import { Card, CardComparer, CardOrientation } from "./card.js";
import { LinearCardContainer, LinearContainerKind } from "./cardcontainer.js";
import { RenderContext } from "../display.js";
import { CardView, HandView, OutlineStyle, ViewType } from "../views.js";
import { Alignment } from "../arrangement.js";

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
    alignment?: Alignment;

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

    private readonly _cardThickness: number;
    
    promptOutlineStyle = OutlineStyle.SOLID_FILLED;
    emptyOutlineStyle = OutlineStyle.DASHED;
    outlineStyle = OutlineStyle.NONE;

    /**
     * How cards in a hand are positioned when there is free space.
     */
    readonly alignment: Alignment;

    override get localBounds(): Bounds {
        return new Bounds(
            new Vector3(0, 0, this.count * this._cardThickness * 0.5),
            new Vector3(this.width + 2, this.height + 2, this.count * this._cardThickness));
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
        super(CardType, LinearContainerKind.FIRST_IN_LAST_OUT, options?.orientation, options?.autoSort);
    
        const dims = Card.getDimensions(CardType);

        this.width = width;
        this.height = dims.height;
        this._cardThickness = dims.thickness;

        this.alignment = options?.alignment ?? Alignment.CENTER;
    }

    override render(ctx: RenderContext): HandView {
        const dims = this.cardDimensions;

        const prompt = ctx.player?.prompt.get(this);
        
        const view: HandView = {
            type: ViewType.HAND,
            
            prompt: prompt,

            width: this.width,
            height: this.height,

            cards: [],

            outlineStyle: prompt != null
                ? this.promptOutlineStyle
                : this.isEmpty
                    ? this.emptyOutlineStyle
                    : this.outlineStyle
        };
        
        ctx.setParentView(this, view);

        if (this.count > 0) {
            const slack = this.width - dims.width;
            const dx = this.count <= 1 ? 0 : Math.min(slack / (this.count - 1), dims.width * 0.95);
            const innerWidth = dims.width + (this.count - 1) * dx;

            let pivot: number;

            switch (this.alignment) {
                case Alignment.START:
                    pivot = 0;
                    break;

                case Alignment.END:
                    pivot = 1;
                    break;

                default:
                    pivot = 0.5;
                    break;
            }

            for (let i = 0; i < this.count; ++i) {
                const orientation = this.getOrientation(i);
                const isSelected = !ctx.isHidden && this.getSelected(i);
                const cardView = ctx.renderChild(this.getCard(i), this, {
                    position: new Vector3(dims.width * 0.5 - this.width * 0.5 + (this.width - innerWidth) * pivot + i * dx, isSelected ? 1.0 : undefined, dims.thickness * (i + 0.5)),
                    rotation: orientation == CardOrientation.FACE_UP ? undefined : Rotation.y(180),
                    revealedFor: orientation == CardOrientation.FACE_DOWN ? [] : undefined
                }) as CardView;

                view.cards.push(cardView);
            }
        }

        return view;
    }
}
