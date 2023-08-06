import { game } from "./game.js";
import { PromiseGroup } from "./promisegroup.js";
import { ReplayEvent, ReplayEventType, replay } from "./replay.js";

interface IDelay {
    index: number;
    duration: number;
    reject: { (reason?: any): void };
}

/**
 * Helper with methods to suspend the game for various amounts of time.
 * @category Async
 */
export class Delay {
    private _nextIndex: number;

    private readonly _active = new Map<number, IDelay>();

    constructor() {
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
        
        const group = PromiseGroup.current;
        const event: ReplayEvent = {
            type: ReplayEventType.DELAY_COMPLETE,
            delayIndex: index
        };

        if (await replay.pendingEvent(event) != null) {
            group?.itemResolved();
            return;
        }

        if (replay.isRecording) {
            game.dispatchUpdateView();
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
                replay.writeEvent(event);
                group?.itemResolved();
                game.dispatchUpdateView();
            }
        } catch (e) {
            if (this._active.delete(index)) {
                group?.itemRejected(e);
                throw e;
            }
        }
    }

    cancelAll(reason?: any): void {
        for (const info of [...this._active.values()]) {
            info.reject(reason ?? "All delays cancelled");
        }
    }
}

/**
 * Helper with methods to suspend the game for various amounts of time.
 * @category Singletons
 * @category Async
 */
export const delay = new Delay();
