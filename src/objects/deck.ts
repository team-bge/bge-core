import { Card, CardOrientation } from "./card.js";
import { LinearCardContainer, LinearContainerKind } from "./cardcontainer.js";
import { RenderContext } from "../display.js";
import { CardView, DeckView, OutlineStyle, ViewType } from "../views.js";
import { Bounds, Rotation, Vector3 } from "../math/index.js";

/**
 * Configuration for a deck.
 */
export interface IDeckOptions {
    /**
     * Optional default card orientation for the deck.
     */
    orientation?: CardOrientation;

    /**
     * If true, the deck count will always be displayed on top of the deck.
     */
    alwaysShowCount?: boolean;
}

/**
 * Stores a first-in-last-out stack of cards. Only the top card is visible, but players can see how many cards are in the stack.
 */
export class Deck<TCard extends Card> extends LinearCardContainer<TCard> {
    readonly alwaysShowCount: boolean;

    promptOutlineStyle = OutlineStyle.SOLID_FILLED;
    emptyOutlineStyle = OutlineStyle.DASHED;
    outlineStyle = OutlineStyle.NONE;

    /**
     * Stores a first-in-last-out stack of cards.
     * @param CardType Constructor for the type of card stored in this container. Used to find the card dimensions.
     * @param options Optional configuration for the deck.
     */
    constructor(CardType: { new(...args: any[]): TCard }, options?: IDeckOptions) {
        super(CardType, LinearContainerKind.FIRST_IN_LAST_OUT, options?.orientation);
    
        this.alwaysShowCount = options?.alwaysShowCount ?? false;
    }

    /**
     * Top-most card, the one that will be next drawn. This is null for empty decks.
     */
    get top(): TCard | null {
        return this.count == 0 ? null : this.getCard(this.count - 1);
    }
    
    override get localBounds(): Bounds {
        const cardDims = this.cardDimensions;
        return new Bounds(
            new Vector3(0, 0, cardDims.thickness * this.count * 0.5),
            new Vector3(cardDims.width + 2, cardDims.height + 2, cardDims.thickness * this.count));
    }

    override render(ctx: RenderContext): DeckView {
        const dims = this.cardDimensions;

        const prompt = ctx.player?.prompt.get(this);

        const view: DeckView = {
            type: ViewType.DECK,
            
            prompt: prompt,

            width: dims.width,
            height: dims.height,

            count: this.count,
            showCount: this.alwaysShowCount,

            outlineStyle: prompt != null
                ? this.promptOutlineStyle
                : this.isEmpty
                    ? this.emptyOutlineStyle
                    : this.outlineStyle
        };

        ctx.setParentView(this, view);

        if (!this.isEmpty) {
            for (let i = 0; i < this.count - 1; ++i) {
                const orientation = this.getOrientation(i);
                ctx.renderInternalChild(this.getCard(i), this, view, {
                    position: new Vector3(0, 0, dims.thickness * (i + 0.5)),
                    rotation: orientation == CardOrientation.FACE_UP ? undefined : Rotation.y(180),
                    revealedFor: orientation == CardOrientation.FACE_DOWN ? [] : undefined
                });
            }

            const topOrientation = this.getOrientation(this.count - 1);
            view.topCard = ctx.renderChild(this.getCard(this.count - 1), this, {
                position: new Vector3(0, 0, dims.thickness * (this.count - 1)),
                rotation: topOrientation == CardOrientation.FACE_UP ? undefined : Rotation.y(180),
                revealedFor: topOrientation == CardOrientation.FACE_DOWN ? [] : undefined
            }) as CardView;
        }

        return view;
    }
}
