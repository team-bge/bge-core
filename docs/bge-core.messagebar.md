<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [bge-core](./bge-core.md) &gt; [MessageBar](./bge-core.messagebar.md)

## MessageBar class

Helper for displaying messages at the top of the screen.

**Signature:**

```typescript
export declare class MessageBar 
```

## Remarks

The constructor for this class is marked as internal. Third-party code should not call the constructor directly or create subclasses that extend the `MessageBar` class.

## Methods

|  Method | Modifiers | Description |
|  --- | --- | --- |
|  [add(format, args)](./bge-core.messagebar.add.md) |  | Adds the given formatted message for every player, below any existing non-prompt messages. |
|  [add(player, format, args)](./bge-core.messagebar.add_1.md) |  | Adds the given formatted message for the given player, below any existing non-prompt messages. |
|  [add(players, format, args)](./bge-core.messagebar.add_2.md) |  | Adds the given formatted message for the given players, below any existing non-prompt messages. |
|  [clear()](./bge-core.messagebar.clear.md) |  | Clears all non-prompt messages for all players. |
|  [clear(player)](./bge-core.messagebar.clear_1.md) |  | Clears all non-prompt messages for the given player. |
|  [clear(players)](./bge-core.messagebar.clear_2.md) |  | Clears all non-prompt messages for the given players. |
|  [remove(row)](./bge-core.messagebar.remove.md) |  | Removes the given message for all players. |
|  [remove(row, player)](./bge-core.messagebar.remove_1.md) |  | Removes the given message for the given player. |
|  [remove(row, players)](./bge-core.messagebar.remove_2.md) |  | Removes the given message for the given players. |
|  [render(ctx)](./bge-core.messagebar.render.md) |  |  |
|  [set(format, args)](./bge-core.messagebar.set.md) |  | Clears any existing non-prompt messages, then adds the given formatted message for every player. |
|  [set(player, format, args)](./bge-core.messagebar.set_1.md) |  | Clears any existing non-prompt messages, then adds the given formatted message for the given player. |
|  [set(players, format, args)](./bge-core.messagebar.set_2.md) |  | Clears any existing non-prompt messages, then adds the given formatted message for the given players. |
|  [validate(format, args)](./bge-core.messagebar.validate.md) | <code>static</code> | Validates a message format string, to make sure it matches the given argument array. |
