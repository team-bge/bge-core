import { IGame } from "./interfaces.js";

/**
 * Helper with methods to suspend the game for various amounts of time.
 */
export class Delay {
    private readonly _game: IGame;

    constructor(game: IGame) {
        this._game = game;
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
    seconds(value: number): Promise<void> {
        this._game._dispatchUpdateView();
        return new Promise(resolve => setTimeout(resolve, value * 1000));
    }
}
