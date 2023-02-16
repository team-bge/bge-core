import { Game } from "./game";

export enum ReplayEventType {
    PromptResponse,
    DelayComplete
}

export interface IReplayData {
    seed: string;
    events: IReplayEvent[];
}

export interface IReplayEvent {
    type: ReplayEventType;
    indices: number[];
}

class ReplayPromise {
    private _resolve: { (): void };

    readonly promise: Promise<void>;

    constructor() {
        this.promise = new Promise<void>((resolve, reject) => {
            this._resolve = resolve;
        });
    }

    resolve(): void {
        this._resolve();
    }
}

export class Replay {
    readonly game: Game;
    readonly events: IReplayEvent[];

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

    writeEvent(type: ReplayEventType, ...indices: number[]): void {
        if (!this.isRecording) {
            throw new Error("Tried to write in the middle of replay playback");
        }

        this.events.push({
            type: type,
            indices: indices
        });

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
                nextPromise?.resolve();
            } catch (e) {
                console.log(`Error during replay playback (event ${this._playbackIndex} of ${this.events.length}).\n${e}`);
                this.events.splice(this._playbackIndex);
                return false;
            }
        }

        return true;
    }

    async pendingEvent(type: ReplayEventType, ...indices: number[]): Promise<boolean> {
        if (this.isRecording) {
            return false;
        }
        
        for (let index = this._playbackIndex; index < this.events.length; ++index) {
            const event = this.events[index];

            if (event.type !== type || event.indices.length !== indices.length) {
                continue;
            }

            let match = true;
            
            for (let i = 0; i < indices.length; ++i) {
                if (indices[i] !== event.indices[i]) {
                    match = false;
                    break;
                }
            }

            if (match) {
                while (index >= this._promises.length) {
                    this._promises.push(null);
                }

                await (this._promises[index] ??= new ReplayPromise()).promise;
                return true;
            }
        }

        return false;
    }
}
