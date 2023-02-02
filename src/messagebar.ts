import { RenderContext } from "./display.js";
import { Message } from "./interfaces.js";
import { Player } from "./player.js";
import { MessageView } from "./views.js";

export class MessageRow {
    readonly message: Message;

    constructor(message: Message) {
        this.message = message;
    }
}

interface IPlayerSource {
    get players(): readonly Player[];
}

export class MessageBar {
    static validate(format: string, args: any[]): void {
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

    constructor(game: IPlayerSource) {
        this._game = game;
    }

    clear(): void;

    clear(player: Player): void;

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

    set(format: string, ...args: any[]): MessageRow;

    set(player: Player, format: string, ...args: any[]): MessageRow;
    
    set(players: Iterable<Player>, format: string, ...args: any[]): MessageRow;

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

    add(format: string, ...args: any[]): MessageRow;

    add(player: Player, format: string, ...args: any[]): MessageRow;
    
    add(players: Iterable<Player>, format: string, ...args: any[]): MessageRow;

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

    remove(row: MessageRow): void;
    remove(row: MessageRow, player: Player): void;
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

    renderMessage(ctx: RenderContext, message: Message, prompt: boolean): MessageView {
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
                views.push(this.renderMessage(ctx, row.message, false));
            }
        }

        if (ctx.player != null) {
            for (let message of ctx.player.prompt.messages) {
                views.push(this.renderMessage(ctx, message, true));
            }
        }

        return views;
    }
}
