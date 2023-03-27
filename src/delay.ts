import { Game } from "./game.js";
import { ReplayEventType } from "./replay.js";

interface IDelay {
    index: number;
    duration: number;
    reject: { (reason?: any): void };
}

/**
 * Helper with methods to suspend the game for various amounts of time.
 */
export class Delay {
    private readonly _game: Game<any>;
    private _nextIndex: number;

    private readonly _active = new Map<number, IDelay>();

    constructor(game: Game<any>) {
        this._game = game;
        this._nextIndex = 0;
    }

    /**
     * Very short delay of 1 second.
     * @returns A promise that fulfils after 1 seconds
     */
    beat(): Promise<void> {
        return this.seconds(1);
    }

    /**
     * Short delay of 1 second.
     * @returns A promise that fulfils after 2 seconds.
     */
    short(): Promise<void> {
        return this.seconds(2);
    }

    /**
     * Long delay of 2 seconds.
     * @returns A promise that fulfils after 3 seconds.
     */
    long(): Promise<void> {
        return this.seconds(3);
    }

    /**
     * True if any delays are currently running.
     */
    get anyActive(): boolean {
        return this._active.size > 0;
    }

    /**
     * Delay for an arbitrary amount of time.
     * @param value How long to delay for, in seconds.
     * @returns A promise that fulfils after the given time.
     */
    async seconds(value: number): Promise<void> {
        const index = this._nextIndex++;
        
        const group = this._game.promiseGroup;

        if (await this._game.replay.pendingEvent(ReplayEventType.DELAY_COMPLETE, index)) {
            group?.itemResolved();
            return;
        }

        if (this._game.replay.isRecording) {
            this._game.dispatchUpdateView();
        }

        const promise = new Promise<void>((resolve, reject) => {
            const info = {
                index: index,
                duration: value,
                reject: reject
            } as IDelay;

            this._active.set(index, info);

            group?.catch(reject);

            setTimeout(resolve, value * 1000);
        });

        try {
            await promise;

            if (this._active.delete(index)) {
                this._game.replay.writeEvent(ReplayEventType.DELAY_COMPLETE, index);
                group?.itemResolved();
                this._game.dispatchUpdateView();
            }
        } catch (e) {
            if (this._active.delete(index)) {
                group?.itemRejected(e);
                throw e;
            }
        }
    }

    cancelAll(reason?: any): void {
        for (let info of [...this._active.values()]) {
            info.reject(reason ?? "All delays cancelled");
        }
    }
}
