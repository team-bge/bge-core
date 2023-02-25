<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [bge-core](./bge-core.md) &gt; [LinearCardContainer](./bge-core.linearcardcontainer.md) &gt; [(constructor)](./bge-core.linearcardcontainer._constructor_.md)

## LinearCardContainer.(constructor)

Base class for card containers that store their contents as an ordered list of cards, like hands and decks.

**Signature:**

```typescript
constructor(CardType: {
        new (...args: any[]): TCard;
    }, kind: LinearContainerKind, orientation?: CardOrientation, autoSort?: CardComparer<TCard>);
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  CardType | { new (...args: any\[\]): TCard; } | Constructor for the type of card stored in this container. Used to find the card dimensions. |
|  kind | [LinearContainerKind](./bge-core.linearcontainerkind.md) | Describes in which order items are added or removed from a linear container. |
|  orientation | [CardOrientation](./bge-core.cardorientation.md) | _(Optional)_ Are newly added cards face up or face down. |
|  autoSort | [CardComparer](./bge-core.cardcomparer.md)<!-- -->&lt;TCard&gt; | _(Optional)_ Optional comparison function to auto-sort newly added cards. |
