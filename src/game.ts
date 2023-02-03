import { Delay } from "./delay.js";
import { RenderContext, DisplayContainer, Arrangement, IDisplayChild } from "./display.js";
import { IGame, IGameResult, IPlayerConfig } from "./interfaces.js";
import { AllGroup, AnyGroup, PromiseGroup } from "./internal.js";
import { Footprint } from "./object.js";
import { Player } from "./player.js";
import { Random } from "./random.js";
import { MessageBar } from "./messagebar.js";
import { CameraView, GameView, TableView, ViewType } from "./views.js";
import { Zone } from "./zone.js";

export interface IZoneCameraOptions {
    zoom?: number;
    pitch?: number;
    yaw?: number;
}

export interface IPlayerZoneOptions {
    avoid?: Footprint;
    arrangement?: Arrangement;
    isHidden?: boolean;

    globalCameras?: IZoneCameraOptions[];
    playerCamera?: IZoneCameraOptions;
}

/**
 * Base class for a custom game, using a custom Player type.
 */
export abstract class Game<TPlayer extends Player> implements IGame {
    private readonly _PlayerType: { new(): TPlayer };
    private _players: TPlayer[];
    private _actionIndex: number;

    private _onUpdateViews?: { (gameViews: GameView[]): void };
    private _scheduledUpdateView: boolean;

    private readonly _promiseGroups: (PromiseGroup | null)[] = [];

    /**
     * @internal
     */
    get promiseGroup(): PromiseGroup | null {
        return this._promiseGroups.length > 0
            ? this._promiseGroups[this._promiseGroups.length - 1]
            : null;
    }

    /**
     * Helper with methods to suspend the game for various amounts of time.
     */
    readonly delay: Delay;

    /**
     * Helper with methods to generate random numbers.
     */
    readonly random: Random;

    /**
     * Helper for displaying text, buttons and images in the top bar.
     */
    readonly message: MessageBar;
    
    /**
     * Dynamically add or remove objects to be displayed here.
     */
    readonly children: DisplayContainer;

    /**
     * Base constructor for `Game<TPlayer>`. You need to pass in your player type here so that BGE knows how to make instances of it.
     * 
     * @param PlayerType Constructor for your custom player type.
     */
    protected constructor(PlayerType: { new(): TPlayer }) {
        this._PlayerType = PlayerType;
        this._actionIndex = 0;
        this.delay = new Delay(this);
        this.random = new Random(this);
        this.message = new MessageBar(this);
        this.children = new DisplayContainer();
    }

    /**
     * Array of all the players in this running game. Only valid after `init()` has been called.
     */
    get players(): readonly TPlayer[] {
        return this._players;
    }

    /**
     * Called exactly once by a host to run a game.
     * @param players Information about who's playing.
     * @param onUpdateViews Callback that will be invoked when the game renders a new view for each player.
     */
    async run(players: IPlayerConfig[], onUpdateViews?: { (gameViews: GameView[]): void }): Promise<IGameResult> {
        this._players = [];
        this._onUpdateViews = onUpdateViews;

        for (let i = 0; i < players.length; ++i) {
            const player = new this._PlayerType();
            player._init(this, i, players[i]);
            this._players.push(player);
        }

        const result = await this.onRun();

        this.dispatchUpdateView();

        return result;
    }

    /**
     * Override this to implement your game, moving objects around as players respond to prompts.
     */
    protected abstract onRun(): Promise<IGameResult>;
    
    addPlayerZones<TZone extends Zone>(
        zoneMap: { (player: TPlayer): TZone },
        options?: IPlayerZoneOptions): IDisplayChild[] {
        
        const zones = this.children.addRange("__playerZones",
            this.players.map(zoneMap),
            {
                avoid: options?.avoid,
                arrangement: options?.arrangement,
                childOptions: this.players.map(x => ({ isHidden: options?.isHidden ?? false, owner: x, label: x.name }))
            });

        // Set up cameras

        const playerCameras = options?.playerCamera === null ? []
            : zones.map(child => {
                return {
                    zoom: options?.playerCamera?.zoom ?? 0.3,
                    pitch: options?.playerCamera?.pitch ?? 75,
                    target: child.options.localPosition,
                    yaw: (options?.playerCamera?.yaw ?? 0) + child.options.localRotation?.y
                } as CameraView;
            });

        const globalCameras = options?.globalCameras ?? [{}];

        for (let player of this.players) {
            for (let globalCamera of globalCameras) {
                player.cameras.push({
                    zoom: globalCamera?.zoom ?? 0.4,
                    pitch: globalCamera?.pitch ?? 85,
                    yaw: globalCamera?.yaw ?? 0
                });
            }

            for (let i = 0; i < playerCameras.length; ++i) {
                player.cameras.push(playerCameras[(i + player.index) % playerCameras.length]);
            }
        }

        return zones;
    }

    /**
     * Called by the host when a player has responded to a prompt for input.
     * @param playerIndex Which player responded.
     * @param promptIndex Which prompt did they respond to.
     */
    respondToPrompt(playerIndex: number, promptIndex: number): void {
        const player = this._players[playerIndex];
        player.prompt.respond(promptIndex);
    }

    /**
     * Used internally to schedule renders to be sent to players.
     * @internal
     */
    dispatchUpdateView(): void {
        if (this._scheduledUpdateView) return;

        this._scheduledUpdateView = true;

        setTimeout(() => {
            this._scheduledUpdateView = false;

            if (this._onUpdateViews == null) return;

            const views: GameView[] = [];

            for (let i = 0; i < this.players.length; ++i) {
                views[i] = this.render(i);
            }

            this._onUpdateViews(views);
        }, 10);
    }

    private render(playerIndex?: number): GameView {
        const player = playerIndex !== undefined ? this.players[playerIndex] : null;
        const ctx = new RenderContext(player, player._oldParentMap ?? new Map());

        player._oldParentMap = ctx.newParentMap;

        const table: TableView = {
            type: ViewType.Table,
            children: []
        };

        ctx.setParentView(this, table);
        ctx.renderProperties(this, table.children);
        this.children.render(ctx, this, table.children);
        
        ctx.processAnimations();

        return {
            hasPrompts: player.prompt.count > 0,
            messages: this.message.render(new RenderContext(player, new Map())),
            table: table,
            cameras: player.cameras
        };
    }

    /**
     * Returns the player following the given one in clockwise turn order.
     * @param player Previous player in clockwise turn order.
     * @returns Next player in clockwise turn order.
     */
    getNextPlayer(player: TPlayer): TPlayer {
        const index = this._players.indexOf(player);
        return this._players[(index + 1) % this._players.length];
    }
    
    /**
     * Creates a Promise that is resolved with an array of results when all of the provided Promises
     * resolve, or rejected when any Promise is rejected. Wraps Promise.all<T>.
     * 
     * @param createPromises A function that should return an array or iterable of Promises. The promises should
     * be created inside this function.
     * 
     * @returns A new Promise.
     */
    all<T>(createPromises: { (): Iterable<T | PromiseLike<T>> }) {
        return Promise.all(this.wrapPromises(createPromises, new AllGroup(this.promiseGroup)));
    }

    /**
     * Creates a Promise that is fulfilled by the first given Promise to be fulfilled, or rejected with
     * an AggregateError containing an array of rejection reasons if all of the given promises are rejected.
     * All the given promises can still independently fulfill after the first one, unlike with anyExclusive<T>.
     * Wraps Promise.all<T>.
     * 
     * @param createPromises A function that should return an array or iterable of Promises. The promises should
     * be created inside this function.
     * 
     * @returns A new Promise.
     */
    any<T extends readonly unknown[] | []>(createPromises: { (): T }): Promise<Awaited<T[number]>>;
    any<T>(createPromises: { (): Iterable<T | PromiseLike<T>> }): Promise<Awaited<T>> {
        return Promise.any(createPromises());
    }

    /**
     * Creates a Promise that is fulfilled by the first given Promise to be fulfilled, or rejected with
     * an AggregateError containing an array of rejection reasons if all of the given promises are rejected.
     * Unlike any<T>, after any of the given promises fulfills an inner prompt or delay, the other promises
     * are forcibly rejected. This is useful for letting players select from a range of actions, where responding
     * to the first prompt of any action commits that player to only that action.
     * 
     * Note that you must pass in a function that returns an array of Promises. That function will be invoked
     * once, and only any promises created during invokation will be exclusive. If that function returns promises
     * that were previously created elsewhere, they won't be exclusive.
     * 
     * @param createPromises A function that should return an array or iterable of Promises. The promises should
     * be created inside this function.
     * 
     * @returns A new Promise.
     */
    anyExclusive<T extends readonly unknown[] | []>(createPromises: { (): T }): Promise<Awaited<T[number]>>;
    anyExclusive<T>(createPromises: { (): Iterable<T | PromiseLike<T>> }): Promise<Awaited<T>> {
        return Promise.any(this.wrapPromises(createPromises, new AnyGroup(this.promiseGroup)));
    }

    /**
     * @internal
     */
    wrapPromises<T>(func: { (): T }, group: PromiseGroup): T {
        this._promiseGroups.push(group);

        let result: T;

        try {
            result = func();
        } finally {
            if (this._promiseGroups.pop() != group) {
                throw new Error("Expected different PromiseGroup");
            }
        }

        return result;
    }
}
