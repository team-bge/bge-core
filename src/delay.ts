import { Game } from "./game.js";
import { ReplayEventType } from "./replay.js";

/**
 * Helper with methods to suspend the game for various amounts of time.
 */
export class Delay {
    private readonly _game: Game<any>;
    private _nextIndex: number;

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
    long(): Promise<void>{
        return this.seconds(3);
    }

    /**
     * Delay for an arbitrary amount of time.
     * @param value How long to delay for, in seconds.
     * @returns A promise that fulfils after the given time.
     */
    async seconds(value: number): Promise<void> {
        const index = this._nextIndex++;
        
        const group = this._game.promiseGroup;

        if (!await this._game.replay.pendingEvent(ReplayEventType.DelayComplete, index)) {
            if (this._game.replay.isRecording) {
                this._game.dispatchUpdateView();
            }

            await new Promise((resolve, reject) => {
                group?.catch(reject);
                setTimeout(resolve, value * 1000);
            });
    
            this._game.replay.writeEvent(ReplayEventType.DelayComplete, index);
        }
        
        group?.itemResolved();
    }
}
