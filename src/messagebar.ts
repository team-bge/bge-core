import { RenderContext } from "./display.js";
import { Message, MessageEmbed } from "./interfaces.js";
import { Player } from "./player.js";
import { MessageView } from "./views.js";

/**
 * A single row of the `MessageBar`. Use `MessageBar.remove(row)` to remove it.
 */
export class MessageRow {
    /**
     * Displayed message in the row.
     */
    readonly message: Message;

    /**
     * @internal
     */
    constructor(message: Message) {
        this.message = message;
    }
}

interface IPlayerSource {
    get players(): readonly Player[];
}

/**
 * Helper for displaying messages at the top of the screen.
 */
export class MessageBar {
    /**
     * Validates a message format string, to make sure it matches the given argument array.
     * @param format Message format string.
     * @param args Array of embedded values to include in the message.
     */
    static validate(format: string, args?: any[]): void {
        let maxIndex = -1;
            
        for(let match of format.matchAll(/\{\s*(?<index>[0-9]+)\s*(?::(?<format>[^}]*))?\}/gi)) {
            const index = parseInt(match.groups["index"]);
            maxIndex = Math.max(maxIndex, index);
        }

        if (maxIndex >= 0 && (args == null || args.length <= maxIndex)) {
            throw new Error(`Expected at least ${maxIndex + 1} args, got ${args?.length ?? 0}.`);
        }
    }

    private readonly _game: IPlayerSource;
    private readonly _playerMap = new Map<Player, MessageRow[]>();

    /**
     * @internal
     */
    constructor(game: IPlayerSource) {
        this._game = game;
    }

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

        for (let player of players) {
            this._playerMap.delete(player);
        }
    }

    /**
     * Clears any existing non-prompt messages, then adds the given formatted message for every player.
     * @param format A string containing embed points, for example `"Hello {0}"` will insert `args[0]` after the word "Hello ".
     * @param args Optional array of values to embed in the message.
     */
    set(format: string, ...args: MessageEmbed[]): MessageRow;

    /**
     * Clears any existing non-prompt messages, then adds the given formatted message for the given player.
     * @param format A string containing embed points, for example `"Hello {0}"` will insert `args[0]` after the word "Hello ".
     * @param args Optional array of values to embed in the message.
     * @param player Player to set a message for.
     */
    set(player: Player, format: string, ...args: MessageEmbed[]): MessageRow;
    
    /**
     * Clears any existing non-prompt messages, then adds the given formatted message for the given players.
     * @param format A string containing embed points, for example `"Hello {0}"` will insert `args[0]` after the word "Hello ".
     * @param args Optional array of values to embed in the message.
     * @param player Players to set a message for.
     */
    set(players: Iterable<Player>, format: string, ...args: MessageEmbed[]): MessageRow;

    set(...args: any[]): MessageRow {
        let players: Iterable<Player>;
        let format: string;

        if (typeof args[0] === "string") {
            players = null;
            format = args[0];
            args = args.slice(1);
        } else {
            players = args[0];
            format = args[1];
            args = args.slice(2);
        }
        
        this.clear(players);
        return this.add(players, format, ...args);
    }

    /**
     * Adds the given formatted message for every player, below any existing non-prompt messages.
     * @param format A string containing embed points, for example `"Hello {0}"` will insert `args[0]` after the word "Hello ".
     * @param args Optional array of values to embed in the message.
     */
    add(format: string, ...args: MessageEmbed[]): MessageRow;

    /**
     * Adds the given formatted message for the given player, below any existing non-prompt messages.
     * @param format A string containing embed points, for example `"Hello {0}"` will insert `args[0]` after the word "Hello ".
     * @param args Optional array of values to embed in the message.
     * @param player Player to add a message for.
     */
    add(player: Player, format: string, ...args: MessageEmbed[]): MessageRow;
    
    /**
     * Adds the given formatted message for the given players, below any existing non-prompt messages.
     * @param format A string containing embed points, for example `"Hello {0}"` will insert `args[0]` after the word "Hello ".
     * @param args Optional array of values to embed in the message.
     * @param player Players to add a message for.
     */
    add(players: Iterable<Player>, format: string, ...args: MessageEmbed[]): MessageRow;

    add(...args: any[]): MessageRow {
        let players: Iterable<Player>;
        let format: string;

        if (typeof args[0] === "string") {
            players = null;
            format = args[0];
            args = args.slice(1);
        } else {
            players = args[0];
            format = args[1];
            args = args.slice(2);
        }

        MessageBar.validate(format, args);

        if (players instanceof Player) {
            players = [players];
        }

        const row = new MessageRow({ format: format, args: args });

        if (players == null) {
            players = this._game.players;
        }

        for (let player of players) {
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
     * @param row A previously-added message, as returned by `add()` or `set()`.
     */
    remove(row: MessageRow): void;
    
    /**
     * Removes the given message for the given player.
     * @param row A previously-added message, as returned by `add()` or `set()`.
     * @param player Player to remove a message for.
     */
    remove(row: MessageRow, player: Player): void;
    
    /**
     * Removes the given message for the given players.
     * @param row A previously-added message, as returned by `add()` or `set()`.
     * @param player Players to remove a message for.
     */
    remove(row: MessageRow, players: Iterable<Player>): void;

    remove(row: MessageRow, playerOrPlayers?: Player | Iterable<Player>): void {
        let players = playerOrPlayers instanceof Player
            ? [playerOrPlayers] : playerOrPlayers;

        if (players == null) {
            players = this._playerMap.keys();
        }

        for (let player of players) {
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
            : null;
            
        if (rows != null) {
            for (let row of rows) {
                views.push(MessageBar.renderMessage(ctx, row.message, false));
            }
        }

        if (ctx.player != null) {
            for (let message of ctx.player.prompt.messages) {
                views.push(MessageBar.renderMessage(ctx, message, true));
            }
        }

        return views;
    }
}
