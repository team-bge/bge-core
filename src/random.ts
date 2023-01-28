import { IGame } from "./interfaces.js";

/**
 * Helper with methods to generate random numbers.
 */
export class Random {
    private readonly _game: IGame;

    constructor(game: IGame) {
        this._game = game;
    }

    private source(): number {
        // TODO: determinism
        return Math.random();
    }

    /**
     * Generates a uniformly-distributed floating-point number between 0 (inclusive) and 1 (exclusive).
     */
    float(): number;

    /**
     * Generates a uniformly-distributed floating-point number between 0 (inclusive) and `max` (exclusive).
     * @param max The generated number will be less than this value.
     */
    float(max: number): number;

    /**
     * Generates a uniformly-distributed floating-point number between `min` (inclusive) and `max` (exclusive).
     * @param min The generated number will be at least this value.
     * @param max The generated number will be less than this value.
     */
    float(min: number, max: number): number;

    float(minOrMax?: number, max?: number): number {
        if (minOrMax === undefined) {
            return this.source();
        }

        let min = minOrMax;

        if (max === undefined) {
            min = 0;
            max = minOrMax;
        }
        
        if (min > max) {
            throw new Error("Expected min <= max");
        }

        if (min === max) {
            return min;
        }

        return min + this.source() * (max - min);
    }

    /**
     * Generates a uniformly-distributed integer between 0 (inclusive) and `max` (exclusive).
     * @param max The generated number will be less than this value. 
     */
    int(max: number): number;
    
    /**
     * Generates a uniformly-distributed integer between `min` (inclusive) and `max` (exclusive).
     * @param min The generated number will be at least this value.
     * @param max The generated number will be less than this value.
     */
    int(min: number, max: number): number;

    int(minOrMax: number, max?: number): number {
        let min = minOrMax;

        if (max === undefined) {
            min = 0;
            max = minOrMax;
        }

        min = Math.ceil(min);
        max = Math.floor(max);

        if (min > max) {
            throw new Error("Expected min <= max");
        }

        if (min >= max - 1) {
            return min;
        }

        return min + Math.floor(this.source() * (max - min));
    }

    /**
     * Returns `true` with the given `probability`, which is 0.5 by default (50%).
     * @param probability Chance of returning true, between 0 and 1.
     */
    chance(probability: number = 0.5): boolean {
        if (probability <= 0.0) {
            return false;
        }

        if (probability >= 1.0) {
            return true;
        }

        return this.source() <= probability;
    }

    /**
     * Returns a uniformly selected random item from an array.
     * @param items Array of items to select from.
     * @returns An item chosed from the given array.
     */
    item<TItem>(items: ReadonlyArray<TItem>): TItem {
        if (items.length < 1) {
            throw new Error("Expected at least one item");
        }

        return items[this.int(items.length)];
    }
}