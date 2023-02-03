import { Card, CardComparer, CardOrientation, ICardDimensions } from "./card.js";
import { Internal } from "./internal.js";
import { GameObject, Footprint } from "./object.js";
import { Random } from "./random.js";

/**
 * Interface for anything that can receive dealt cards.
 */
export interface ICardReceiver<TCard> {
    get count(): number;

    /**
     * Add a single card to the default place in this container.
     * @param card Card to add.
     */
    add(card: TCard): void;

    /**
     * Add a whole wad of cards to the default place in this container.
     * @param cards Cards to add.
     */
    addRange(cards: TCard[] | Iterable<TCard>): void;
}

/**
 * Base class for general card containers, like decks and hands. We don't assume anything about how cards are stored.
 */
export abstract class CardContainer<TCard extends Card> extends GameObject implements ICardReceiver<TCard> {
    private readonly _CardType: { new(...args: any[]): TCard };

    /**
     * Gets the dimensions of the card type stored in this container.
     */
    get cardDimensions(): ICardDimensions {
        return Card.getDimensions(this._CardType);
    }

    /**
     * Gets the number of cards in this container.
     */
    abstract get count(): number;

    /**
     * If true, this container has no cards.
     */
    get isEmpty(): boolean {
        return this.count == 0;
    }

    constructor(CardType: { new(...args: any[]): TCard }) {
        super();

        this._CardType = CardType;
    }

    /**
     * Add a single card to the default place in this container.
     * @param card Card to add.
     */
    add(card: TCard): void {
        card._lastActionIndex = Internal.getNextActionIndex();
        this.onAdd(card);
    }

    protected abstract onAdd(card: TCard): void;
    
    /**
     * Add a whole wad of cards to the default place in this container.
     * @param cards Cards to add.
     */
    addRange(cards: TCard[] | Iterable<TCard>): void {
        for (let card of cards) { 
            this.add(card);
        }
    }

    /**
     * Remove a specific card from this container. The given card must actually be inside this container.
     * @param card Card to remove.
     * @returns The removed card.
     */
    remove(card: TCard): TCard {
        this.onRemove(card);
        return card;
    }

    protected abstract onRemove(card: TCard): void;

    /**
     * Remove all cards from this container.
     * @returns The removed cards.
     */
    removeAll(): TCard[];

    /**
     * Remove the given cards from this container.
     * @returns The removed cards.
     */
    removeAll(cards: Iterable<TCard>): TCard[];
    
    /**
     * Remove all cards matching a predicate from this container.
     * @param predicate Predicate to match for each card.
     * @returns The removed cards.
     */
    removeAll(predicate: { (card: TCard): boolean }): TCard[];
    removeAll(predicateOrCards?: { (card: TCard): boolean } | Iterable<TCard>): TCard[] {
        if (predicateOrCards == null || typeof predicateOrCards === "function") {
            return this.onRemoveAll(predicateOrCards as { (card: TCard): boolean });
        }

        const array = Array.from(predicateOrCards);

        return this.onRemoveAll(x => array.indexOf(x) !== -1);
    }
    
    protected abstract onRemoveAll(predicate?: { (card: TCard): boolean }): TCard[];
}

export enum LinearContainerKind {
    FirstInFirstOut,
    FirstInLastOut
}

interface ILinearContainerCard<TCard extends Card> {
    card: TCard;
    orientation: CardOrientation;
    selected: boolean;
    childId: number;
}

/**
 * Base class for card containers that store their contents as an ordered list of cards, like hands and decks.
 */
export abstract class LinearCardContainer<TCard extends Card> extends CardContainer<TCard> implements Iterable<TCard> {
    private readonly _cards: ILinearContainerCard<TCard>[] = [];
    private readonly _kind: LinearContainerKind;

    private _nextChildId: number = 0;

    /**
     * Default orientation of cards added to this container.
     */
    defaultOrientation: CardOrientation;

    /**
     * Comparison function to use to automatically sort added cards.
     */
    readonly autoSort?: CardComparer<TCard>;

    constructor(CardType: { new(...args: any[]): TCard }, kind: LinearContainerKind, orientation: CardOrientation = CardOrientation.FaceUp, autoSort?: CardComparer<TCard>) {
        super(CardType);

        this._kind = kind;

        this.defaultOrientation = orientation;
        this.autoSort = autoSort;
    }

    [Symbol.iterator](): Iterator<TCard> {
        return this._cards.map(x => x.card)[Symbol.iterator]();
    }

    override get footprint(): Footprint {
        const cardDims = this.cardDimensions;
        return {
            width: cardDims.width + 2,
            height: cardDims.height + 2
        };
    }

    override get count(): number {
        return this._cards.length;
    }

    /**
     * Gets all cards in this container that aren't marked as selected.
     */
    get unselected(): ReadonlyArray<TCard> {
        const allSelected: TCard[] = [];
        for (let i = 0; i < this.count; ++i) {
            if (!this.getSelected(i)) {
                allSelected.push(this.getCard(i));
            }
        }
        return allSelected;
    }

    /**
     * Gets all cards in this container that are marked as selected.
     */
    get selected(): ReadonlyArray<TCard> {
        const allSelected: TCard[] = [];
        for (let i = 0; i < this.count; ++i) {
            if (this.getSelected(i)) {
                allSelected.push(this.getCard(i));
            }
        }
        return allSelected;
    }

    /**
     * Gets a card by index.
     * @param index Index of the card to get, starting at 0 and strictly less than `count`.
     * @returns Retrieved card.
     */
    getCard(index: number): TCard {
        return this._cards[index].card;
    }

    protected getChildId(index: number): number {
        return this._cards[index].childId;
    }

    protected getProperties(indexOrCard: number | TCard): ILinearContainerCard<TCard> {
        if (typeof indexOrCard !== "number") {
            indexOrCard = this._cards.findIndex(x => x.card == indexOrCard);
        }

        return this._cards[indexOrCard];
    }

    /**
     * Set all cards to the given orientation.
     * @param orientation Orientation to set the cards to.
     */
    setOrientation(orientation: CardOrientation): void;

    /**
     * Sets whether the given card is face up or down.
     * @param index Index of the card to set.
     * @param orientation Orientation to set the card to.
     */
    setOrientation(index: number, orientation: CardOrientation): void;
    
    /**
     * Sets whether the given card is face up or down.
     * @param card Card to set.
     * @param orientation Orientation to set the card to.
     */
    setOrientation(card: TCard, orientation: CardOrientation): void;

    setOrientation(arg0: number | TCard | CardOrientation, orientation?: CardOrientation): void {
        if (orientation === undefined) {
            this.defaultOrientation = arg0 as CardOrientation;
            for (let card of this._cards) {
                card.orientation = this.defaultOrientation;
            }
            return;
        }

        this.getProperties(arg0).orientation = orientation;
    }

    /**
     * Gets whether the given card is face up or down.
     * @param index Index of the card to get.
     * @returns Orientation of the given card.
     */
    getOrientation(index: number): CardOrientation;
    
    /**
     * Gets whether the given card is face up or down.
     * @param card Card to get.
     * @returns Orientation of the given card.
     */
    getOrientation(card: TCard): CardOrientation;
    getOrientation(indexOrCard: number | TCard): CardOrientation {
        return this.getProperties(indexOrCard).orientation;
    }

    /**
     * Set all cards to be either selected or deselected.
     * @param selected Selection state to set all cards to.
     */
    setSelected(selected: boolean): void;

    /**
     * Sets whether the given card is marked as selected.
     * @param index Index of the card to set.
     * @param selected Selection state to set the card to.
     */
    setSelected(index: number, selected: boolean): void;
    
    /**
     * Sets whether the given card is marked as selected.
     * @param card Card to set.
     * @param selected Selection state to set the card to.
     */
    setSelected(card: TCard, selected: boolean): void;

    setSelected(indexOrCardOrSelected: number | TCard | boolean, selected?: boolean): void {
        if (typeof indexOrCardOrSelected === "boolean") {
            selected = indexOrCardOrSelected;

            for (let card of this._cards) {
                card.selected = selected;
            }

            return;
        }
        
        this.getProperties(indexOrCardOrSelected).selected = selected;
    }

    toggleSelected(index: number): boolean;
    toggleSelected(card: TCard): boolean;
    toggleSelected(indexOrCard: number | TCard): boolean {
        const properties = this.getProperties(indexOrCard);
        return properties.selected = !properties.selected;
    }

    /**
     * Gets whether the given card is marked as selected.
     * @param index Index of the card to get.
     * @returns Selection state of the given card.
     */
    getSelected(index: number): boolean;
    
    /**
     * Gets whether the given card is marked as selected.
     * @param card Card to get.
     * @returns Selection state of the given card.
     */
    getSelected(card: TCard): boolean;
    getSelected(indexOrCard: number | TCard): boolean {
        return this.getProperties(indexOrCard).selected;
    }

    private createCardWrapper(card: TCard): ILinearContainerCard<TCard> {
        return {card: card, orientation: this.defaultOrientation, selected: false, childId: this._nextChildId++};
    }

    private assertNoAutoSort(): void {
        if (this.autoSort != null) {
            throw new Error("Can't insert into an auto-sorted container");
        }
    }

    /**
     * Add a single card to the given place in this container.
     * @param index Where to insert the card, starting at 0.
     * @param card Card to add.
     */
    insert(index: number, card: TCard): void {
        this.assertNoAutoSort();
        card._lastActionIndex = Internal.getNextActionIndex();
        this._cards.splice(index, 0, this.createCardWrapper(card));
    }

    /**
     * Add a wad of cards to the given place in this container.
     * @param index Where to insert the cards, starting at 0.
     * @param cards Cards to add.
     */
    insertRange(index: number, cards: TCard[] | Iterable<TCard>): void {
        this.assertNoAutoSort();
        for (let card of cards) {
            card._lastActionIndex = Internal.getNextActionIndex();
        }
        this._cards.splice(index, 0, ...Array.from(cards).map(x => this.createCardWrapper(x)));
    }

    protected override onAdd(card: TCard): void {
        this._cards.push(this.createCardWrapper(card));

        if (this.autoSort != null) {
            this._cards.sort((a, b) => this.autoSort(a.card, b.card));
        }
    }

    protected override onRemove(card: TCard): void {
        for (let i = this._cards.length - 1; i >= 0; i--) {
            if (this._cards[i].card == card) {
                this._cards.splice(i, 1);
                return;
            }
        }
        
        if (this.autoSort != null) {
            this._cards.sort((a, b) => this.autoSort(a.card, b.card));
        }
    }

    protected override onRemoveAll(predicate?: (card: TCard) => boolean): TCard[] {
        if (predicate == null) {
            return this._cards.splice(0, this._cards.length).map(x => x.card);
        }

        const removed: TCard[] = [];
        for (let i = this._cards.length - 1; i >= 0; i--) {
            if (predicate(this._cards[i].card)) {
                removed.push(this._cards[i].card);
                this._cards.splice(i, 1);
            }
        }

        switch (this._kind) {
            case LinearContainerKind.FirstInLastOut:
                return removed;

            case LinearContainerKind.FirstInFirstOut:
                return removed.reverse();

            default:
                throw new Error("Not implemented");
        }
    }

    /**
     * Take a single card from this container. The index of the card depends on the container type.
     * @returns Drawn card.
     */
    draw(): TCard {
        return this.drawRange(1)[0];
    }

    /**
     * Take a number of cards from this container. The index and order of the cards depend on the container type.
     * @param count Number of cards to draw.
     * @returns Drawn cards.
     */
    drawRange(count: number): TCard[] {
        count = Math.min(this.count, count);

        switch (this._kind) {
            case LinearContainerKind.FirstInLastOut:
                return this._cards.splice(this._cards.length - count, count).reverse().map(x => x.card);

            case LinearContainerKind.FirstInFirstOut:
                return this._cards.splice(0, count).map(x => x.card);

            default:
                throw new Error("Not implemented");
        }
    }

    /**
     * If this container holds enough cards, deals the given number to each target and returns true. Otherwise nothing is dealt and returns false.
     * @param targets Recipients of the deal.
     * @param count Exact number of cards to deal to each recipient, if possible.
     * @returns True if the given number of cards were dealt, otherwise false.
     */
    tryDeal(targets: ICardReceiver<TCard>[], count: number = 1): boolean {
        if (this.count < targets.length * count) {
            return false;
        }

        this.deal(targets, count);
        return true;
    }

    /**
     * Deal up to the given number of cards to each target.
     * @param targets Recipients of the deal.
     * @param count Maximum number of cards to deal to each recipient.
     * @param firstTargetIndex Index of the first recipient in `targets`.
     */
    deal(targets: ICardReceiver<TCard>[], count: number = 1, firstTargetIndex: number = 0): void {
        for (let i = 0; i < count; ++i) {
            for (let j = 0; j < targets.length; ++j) {
                if (this.isEmpty) return;
                targets[(j + firstTargetIndex) % targets.length].add(this.draw());
            }
        }
    }

    /**
     * Deals up to the given total number of cards, divided between the given targets.
     * @param targets Recipients of the deal.
     * @param totalCount Maximum number of cards to deal in total.
     * @param firstTargetIndex Index of the first recipient in `targets`.
     */
    dealTotal(targets: ICardReceiver<TCard>[], totalCount: number, handLimit?: number, firstTargetIndex: number = 0): void {
        while (totalCount > 0 && this.count > 0 && (handLimit == null || targets.some(x => x.count < handLimit))) {
            for (let j = 0; j < targets.length; ++j) {
                if (this.isEmpty || totalCount <= 0) return;
                const target = targets[(j + firstTargetIndex) % targets.length];
                if (handLimit != null && target.count < handLimit) {
                    target.add(this.draw());
                    --totalCount;
                }
            }
        }
    }

    /**
     * Shuffle all cards in this container.
     * @param random Random number generator to use.
     */
    shuffle(random: Random): void;

    /**
     * Shuffle a range of cards in this container.
     * @param random Random number generator to use.
     * @param from Start of the range to shuffle, from 0.
     * @param to Exclusive end of the range to shuffle.
     */
    shuffle(random: Random, from: number, to: number): void;
    
    shuffle(random: Random, from?: number, to?: number): void {
        from ??= 0;
        to ??= this._cards.length;

        for (let i = from; i < to - 1; ++i) {
            const swapIndex = random.int(i, to);

            const a = this._cards[i];
            const b = this._cards[swapIndex];
            
            this._cards[i] = b;
            this._cards[swapIndex] = a;
        }
    }
}