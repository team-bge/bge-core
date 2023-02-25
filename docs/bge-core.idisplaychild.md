<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [bge-core](./bge-core.md) &gt; [IDisplayChild](./bge-core.idisplaychild.md)

## IDisplayChild interface

Describes how a child object is displayed.

**Signature:**

```typescript
export interface IDisplayChild 
```

## Properties

|  Property | Modifiers | Type | Description |
|  --- | --- | --- | --- |
|  [childId](./bge-core.idisplaychild.childid.md) |  | number | Ordinal for this child, to help renderers maintain identity when animating. |
|  [object](./bge-core.idisplaychild.object.md) |  | [GameObject](./bge-core.gameobject.md) \| { (): [GameObject](./bge-core.gameobject.md)<!-- -->; } | Child object, or a function that returns the child object. |
|  [options](./bge-core.idisplaychild.options.md) |  | [IDisplayOptions](./bge-core.idisplayoptions.md) | Positioning, style, and visibility options. |
