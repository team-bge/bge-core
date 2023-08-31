import { RenderContext } from "./display.js";
import { Message, MessageEmbed } from "./interfaces.js";
import { Player } from "./player.js";
import { MessageView } from "./views.js";
import { game } from "./game.js";

/**
 * A single row of the {@link MessageBar}. Use {@link MessageBar.remove} to remove it.
 * @category Messages
 */
export class MessageRow {
    private _message: Message;

    /**
     * Displayed message in the row.
     */
    get message(): Message {
        return this._message;
    }

    /**
     * @param message
     * @internal
     */
    constructor(message: Message) {
        this._message = message;
    }

    /**
     * Replaces the displayed message in the row.
     * @param format A string containing embed points, for example `"Hello {0}"` will insert {@link args}`[0]` after the word "Hello ".
     * @param args Optional array of values to embed in the message.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    update(format: string, ...args: any[]): void {
        MessageBar.validate(format, args);
        this._message = { format: format, args: args };
    }
}

/**
 * Represents a spectator, rather than a player that can act in the game.
 * @category Core
 */
export const SPECTATOR = Symbol("Spectator");

/**
 * Helper for displaying messages at the top of the screen.
 * @category Messages
 */
export class MessageBar {
    /**
     * Validates a message format string, to make sure it matches the given argument array.
     * @param format Message format string.
     * @param args Array of embedded values to include in the message.
     */
    static validate(format: string, args?: MessageEmbed[]): void {
        let maxIndex = -1;
            
        for(const match of format.matchAll(/\{\s*(?<index>[0-9]+)\s*(?::(?<format>[^}]*))?\}/gi)) {
            const index = parseInt(match.groups["index"]);
            maxIndex = Math.max(maxIndex, index);
        }

        if (maxIndex >= 0 && (args == null || args.length <= maxIndex)) {
            throw new Error(`Expected at least ${maxIndex + 1} args, got ${args?.length ?? 0}.`);
        }
    }

    private readonly _playerMap = new Map<Player | typeof SPECTATOR, MessageRow[]>();

    /**
     * Clears all non-prompt messages for all players.
     */
    clear(): void;

    /**
     * Clears all non-prompt messages for the given player.
     * @param player Player to clear messages for.
     */
    clear(player: Player): void;

    /**
     * Clears all non-prompt messages for the given players.
     * @param player Players to clear messages for.
     */
    clear(players: Iterable<Player>): void;

    clear(players?: Player | Iterable<Player>): void {
        if (players == null) {
            this._playerMap.clear();
            return;
        }

        if (players instanceof Player) {
            players = [players];
        }

        for (const player of players) {
            this._playerMap.delete(player);
        }
    }

    /**
     * Clears any existing non-prompt messages, then adds the given formatted message for every player.
     * @param format A string containing embed points, for example `"Hello {0}"` will insert {@link args}`[0]` after the word "Hello ".
     * @param args Optional array of values to embed in the message.
     */
    set(format: string, ...args: MessageEmbed[]): MessageRow;

    /**
     * Clears any existing non-prompt messages, then adds the given formatted message for the given player.
     * @param format A string containing embed points, for example `"Hello {0}"` will insert {@link args}`[0]` after the word "Hello ".
     * @param args Optional array of values to embed in the message.
     * @param player Player to set a message for.
     */
    set(player: Player, format: string, ...args: MessageEmbed[]): MessageRow;
    
    /**
     * Clears any existing non-prompt messages, then adds the given formatted message for the given players.
     * @param format A string containing embed points, for example `"Hello {0}"` will insert {@link args}`[0]` after the word "Hello ".
     * @param args Optional array of values to embed in the message.
     * @param player Players to set a message for.
     */
    set(players: Iterable<Player>, format: string, ...args: MessageEmbed[]): MessageRow;

    set(...args: unknown[]): MessageRow {
        let players: Iterable<Player>;
        let format: string;

        if (typeof args[0] === "string") {
            players = null;
            format = args[0];
            args = args.slice(1);
        } else {
            players = args[0] as Iterable<Player>;
            format = args[1] as string;
            args = args.slice(2);
        }

        this.clear(players);
        return this.add(players, format, ...args as MessageEmbed[]);
    }

    getRows(player: Player): readonly MessageRow[] {
        const rows = this._playerMap.get(player);
        return rows == null ? [] : [...rows];
    }

    get all(): ReadonlyMap<Player | typeof SPECTATOR, readonly MessageRow[]> {
        return new Map([...this._playerMap].map(x => x));
    }

    set all(map: ReadonlyMap<Player | typeof SPECTATOR, readonly MessageRow[]>) {
        this._playerMap.clear();

        if (map == null) {
            return;
        }

        for (const [player, rows] of map) {
            this._playerMap.set(player, [...rows]);
        }
    }

    /**
     * Adds the given formatted message for every player, below any existing non-prompt messages.
     * @param format A string containing embed points, for example `"Hello {0}"` will insert {@link args}`[0]` after the word "Hello ".
     * @param args Optional array of values to embed in the message.
     */
    add(format: string, ...args: MessageEmbed[]): MessageRow;

    /**
     * Adds the given formatted message for the given player, below any existing non-prompt messages.
     * @param format A string containing embed points, for example `"Hello {0}"` will insert {@link args}`[0]` after the word "Hello ".
     * @param args Optional array of values to embed in the message.
     * @param player Player to add a message for.
     */
    add(player: Player, format: string, ...args: MessageEmbed[]): MessageRow;
    
    /**
     * Adds the given formatted message for the given players, below any existing non-prompt messages.
     * @param format A string containing embed points, for example `"Hello {0}"` will insert {@link args}`[0]` after the word "Hello ".
     * @param args Optional array of values to embed in the message.
     * @param player Players to add a message for.
     */
    add(players: Iterable<Player>, format: string, ...args: MessageEmbed[]): MessageRow;

    add(...args: unknown[]): MessageRow {
        let players: Iterable<Player | typeof SPECTATOR>;
        let format: string;

        if (typeof args[0] === "string") {
            players = null;
            format = args[0];
            args = args.slice(1);
        } else {
            players = args[0] as Iterable<Player>;
            format = args[1] as string;
            args = args.slice(2);
        }

        MessageBar.validate(format, args as MessageEmbed[]);

        if (players instanceof Player) {
            players = [players];
        }

        const row = new MessageRow({ format: format, args: args as MessageEmbed[] });

        if (players == null) {
            players = [...game.players, SPECTATOR];
        }

        for (const player of players) {
            let items = this._playerMap.get(player);

            if (items == null) {
                items = [];
                this._playerMap.set(player, items);
            }

            items.push(row);
        }

        return row;
    }

    /**
     * Removes the given message for all players.
     * @param row A previously-added message, as returned by {@link add} or {@link set}.
     */
    remove(row: MessageRow): void;
    
    /**
     * Removes the given message for the given player.
     * @param row A previously-added message, as returned by {@link add} or {@link set}.
     * @param player Player to remove a message for.
     */
    remove(row: MessageRow, player: Player): void;
    
    /**
     * Removes the given message for the given players.
     * @param row A previously-added message, as returned by {@link add} or {@link set}.
     * @param player Players to remove a message for.
     */
    remove(row: MessageRow, players: Iterable<Player>): void;

    remove(row: MessageRow, playerOrPlayers?: Player | Iterable<Player>): void {
        let players: Iterable<Player | typeof SPECTATOR> = playerOrPlayers instanceof Player
            ? [playerOrPlayers] : playerOrPlayers;

        if (players == null) {
            players = this._playerMap.keys();
        }

        for (const player of players) {
            const items = this._playerMap.get(player);

            if (items == null) {
                continue;
            }

            const index = items.indexOf(row);

            if (index !== -1) {
                items.splice(index, 1);
            }
        }
    }

    addOrUpdate(row: MessageRow, format: string, ...args: MessageEmbed[]): MessageRow {
        if (row != null) {
            row.update(format, args);
            return row;
        }

        return this.add(format, args);
    }

    private static renderMessage(ctx: RenderContext, message: Message, prompt: boolean): MessageView {
        if (typeof message === "string") {
            return { format: message, prompt: prompt };
        } else {
            return {
                format: message.format,
                embeds: message.args?.map(x => ctx.renderTextEmbed(x)),
                prompt: prompt
            };
        }
    }

    render(ctx: RenderContext): MessageView[] {
        const views: MessageView[] = [];

        const rows = ctx.player != null
            ? this._playerMap.get(ctx.player)
            : this._playerMap.get(SPECTATOR);

        if (rows != null) {
            for (const row of rows) {
                views.push(MessageBar.renderMessage(ctx, row.message, false));
            }
        }

        if (ctx.player != null) {
            for (const message of ctx.player.prompt.messages) {
                views.push(MessageBar.renderMessage(ctx, message, true));
            }
        }

        return views;
    }
}

/**
 * Helper for displaying messages at the top of the screen.
 * @category Singletons
 * @category Messages
 */
export const message = new MessageBar();