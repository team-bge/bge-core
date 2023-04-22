import { Game } from "./game.js";
import { IPlayerConfig } from "./interfaces.js";

export enum ReplayEventType {
    PROMPT_RESPONSE,
    DELAY_COMPLETE
}

export interface IReplayData {
    seed: string;
    players: readonly IPlayerConfig[];
    events: readonly ReplayEvent[];
}

export type ReplayEvent =
    | IPromptResponseEvent
    | IDelayCompleteEvent;

export interface IPromptResponseEvent {
    type: ReplayEventType.PROMPT_RESPONSE;
    playerIndex: number;
    promptIndex: number;
    payload?: any;
}

export interface IDelayCompleteEvent {
    type: ReplayEventType.DELAY_COMPLETE;
    delayIndex: number;
}

class ReplayPromise {
    private _resolve: { (event: ReplayEvent): void };

    readonly promise: Promise<ReplayEvent>;

    constructor() {
        this.promise = new Promise<ReplayEvent>((resolve, reject) => {
            this._resolve = resolve;
        });
    }

    resolve(event: ReplayEvent): void {
        this._resolve(event);
    }
}

export class Replay {
    readonly game: Game;
    readonly events: ReplayEvent[];

    private readonly _promises: ReplayPromise[];
    private _playbackIndex: number;

    get playbackIndex(): number {
        return this._playbackIndex;
    }

    get isRecording(): boolean {
        return this._playbackIndex === this.events.length;
    }

    constructor(game: Game) {
        this.game = game;
        this.events = [];

        this._promises = [];
        this._playbackIndex = 0;
    }

    writeEvent<T extends ReplayEvent>(event: T): void {
        if (!this.isRecording) {
            throw new Error("Tried to write in the middle of replay playback");
        }

        this.events.push(event);

        this._playbackIndex++;
    }

    async run(data: IReplayData): Promise<boolean> {
        this.events.splice(0);
        this._promises.splice(0);
        this._playbackIndex = 0;

        this.events.push(...data.events);

        function yieldAsync() {
            return new Promise<void>((resolve) => {
                setTimeout(resolve, 0);
            });
        }

        while (this._playbackIndex < this.events.length) {
            await yieldAsync();

            const nextEvent = this.events[this._playbackIndex];
            const nextPromise = this._playbackIndex < this._promises.length
                ? this._promises[this._playbackIndex]
                : null;

            if (nextPromise == null) {
                console.log(`Error during replay playback (event ${this._playbackIndex} of ${this.events.length}).\nEvent was never awaited.`);
                this.events.splice(this._playbackIndex);
                return false;
            }
            
            ++this._playbackIndex;

            try {
                nextPromise?.resolve(nextEvent);
            } catch (e) {
                console.log(`Error during replay playback (event ${this._playbackIndex} of ${this.events.length}).\n${e}`);
                this.events.splice(this._playbackIndex);
                return false;
            }
        }

        return true;
    }

    async pendingEvent<T extends ReplayEvent>(event: T): Promise<T | null> {
        if (this.isRecording) {
            return null;
        }

        let keys = Object.getOwnPropertyNames(event) as (keyof T)[];
        
        for (let index = this._playbackIndex; index < this.events.length; ++index) {
            const pending = this.events[index];

            if (pending.type !== event.type) {
                continue;
            }

            let match = true;
            
            for (let key of keys) {
                if (event[key] !== (pending as T)[key]) {
                    match = false;
                    break;
                }
            }

            if (match) {
                while (index >= this._promises.length) {
                    this._promises.push(null);
                }

                return await (this._promises[index] ??= new ReplayPromise()).promise as T;
            }
        }

        return null;
    }
}
