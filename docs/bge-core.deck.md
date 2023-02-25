<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [bge-core](./bge-core.md) &gt; [Deck](./bge-core.deck.md)

## Deck class

Stores a first-in-last-out stack of cards. Only the top card is visible, but players can see how many cards are in the stack.

**Signature:**

```typescript
export declare class Deck<TCard extends Card> extends LinearCardContainer<TCard> 
```
**Extends:** [LinearCardContainer](./bge-core.linearcardcontainer.md)<!-- -->&lt;TCard&gt;

## Constructors

|  Constructor | Modifiers | Description |
|  --- | --- | --- |
|  [(constructor)(CardType, options)](./bge-core.deck._constructor_.md) |  | Stores a first-in-last-out stack of cards. |

## Properties

|  Property | Modifiers | Type | Description |
|  --- | --- | --- | --- |
|  [alwaysShowCount](./bge-core.deck.alwaysshowcount.md) | <code>readonly</code> | boolean |  |
|  [top](./bge-core.deck.top.md) | <code>readonly</code> | TCard \| null | Top-most card, the one that will be next drawn. This is null for empty decks. |

## Methods

|  Method | Modifiers | Description |
|  --- | --- | --- |
|  [render(ctx)](./bge-core.deck.render.md) |  |  |
