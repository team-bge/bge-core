import { RenderContext } from "./display.js";
import { IGame } from "./interfaces.js";
import { Player } from "./player.js";
import { TopBarView } from "./views.js";

export interface ITopBarRow {
    readonly format?: string;
    readonly args?: any[];
}

export class TopBarRow implements ITopBarRow {
    readonly format?: string;
    readonly args?: any[];

    constructor(format?: string, args?: any[]) {
        this.format = format;
        this.args = args;
    }
}

interface IPlayerSource {
    get players(): readonly Player[];
}

export class TopBar {
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
    private readonly _playerMap = new Map<Player, TopBarRow[]>();

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

    set(format: string, ...args: any[]): TopBarRow;

    set(player: Player, format: string, ...args: any[]): TopBarRow;
    
    set(players: Iterable<Player>, format: string, ...args: any[]): TopBarRow;

    set(...args: any[]): TopBarRow {
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

    add(format: string, ...args: any[]): TopBarRow;

    add(player: Player, format: string, ...args: any[]): TopBarRow;
    
    add(players: Iterable<Player>, format: string, ...args: any[]): TopBarRow;

    add(...args: any[]): TopBarRow {
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

        TopBar.validate(format, args);

        if (players instanceof Player) {
            players = [players];
        }

        const row = new TopBarRow(format, args);

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

    remove(row: TopBarRow): void;
    remove(row: TopBarRow, player: Player): void;
    remove(row: TopBarRow, players: Iterable<Player>): void;
    remove(row: TopBarRow, playerOrPlayers?: Player | Iterable<Player>): void {
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

    render(ctx: RenderContext): TopBarView[] {
        const views: TopBarView[] = [];

        const rows = ctx.player != null
            ? this._playerMap.get(ctx.player)
            : null;
            
        if (rows != null) {
            for (let row of rows) {
                views.push({
                    format: row.format,
                    embeds: row.args?.map(x => ctx.renderTextEmbed(x))
                });
            }
        }

        if (ctx.player != null) {
            for (let row of ctx.player.prompt.topBarRows) {
                views.push({
                    format: row.format,
                    embeds: row.args?.map(x => ctx.renderTextEmbed(x))
                });
            }
        }

        return views;
    }
}
