import { IGame } from "./interfaces.js";

/**
 * Helper with methods to generate random numbers.
 * @category Core
 * @example Use the global shared instance:
 * ```ts
 * let value = bge.random.int(10, 20);
 * ```
 * Create an instance with a seed string:
 * ```ts
 * let myRandom = new bge.Random("my cool seed");
 * let value = myRandom.int(10, 20);
 * ```
 */
export class Random {
    // Adapted from https://stackoverflow.com/a/47593316

    private static cyrb128(str: string): [a: number, b: number, c: number, d: number] {
        let h1 = 1779033703, h2 = 3144134277,
            h3 = 1013904242, h4 = 2773480762;
        for (let i = 0, k; i < str.length; i++) {
            k = str.charCodeAt(i);
            h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
            h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
            h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
            h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
        }
        h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
        h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
        h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
        h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
        return [(h1^h2^h3^h4)>>>0, (h2^h1)>>>0, (h3^h1)>>>0, (h4^h1)>>>0];
    }

    private static sfc32(a: number, b: number, c: number, d: number): { (): number } {
        return () => {
          a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0; 
          var t = (a + b) | 0;
          a = b ^ b >>> 9;
          b = c + (c << 3) | 0;
          c = (c << 21 | c >>> 11);
          d = d + 1 | 0;
          t = t + d | 0;
          c = c + t | 0;
          return (t >>> 0) / 4294967296;
        }
    }

    private _seed: string;
    private _source: { (): number };

    /**
     * Seed string used when creating this instance.
     * @example Print the seed of the shared instance:
     * ```ts
     * console.log(bge.random.seed);
     * ```
     */
    get seed(): string {
        return this._seed;
    }

    private get isInitialized(): boolean {
        return this._source != null;
    }

    /**
     * @internal
     */
    constructor();

    /**
     * Create an instance of {@link Random} with a given seed. Instances created
     * with the same seed will output the same sequence of values, as long as each
     * method is called in the same order each time.
     * @param seed String to be hashed and used as an initial state.
     * @example Create an instance with a seed string:
     * ```ts
     * let myRandom = new bge.Random("my cool seed");
     * let value = myRandom.int(10, 20);
     * ```
     */
    constructor(seed: string);

    constructor(seed?: string) {
        if (seed != null) {
            this.initialize(seed);
        }
    }

    /**
     * @internal
     */
    initialize(seed: string): void {
        if (this.isInitialized) {
            throw new Error("Attempted to initialize Random more than once!")
        }

        this._seed = seed;
        this._source = Random.sfc32(...Random.cyrb128(seed));

        for (let i = 0; i < 20; ++i) {
            this._source();
        }
    }

    /**
     * Generates a uniformly-distributed floating-point number between 0 (inclusive) and 1 (exclusive).
     * @example Generate a floating-point value between 0 and 1:
     * ```ts
     * let value = bge.random.float();
     * ```
     */
    float(): number;

    /**
     * Generates a uniformly-distributed floating-point number between 0 (inclusive) and {@link max} (exclusive).
     * @param max The generated number will be less than this value.
     * @example Generate a floating-point value between 0 and 10:
     * ```ts
     * let value = bge.random.float(10);
     * ```
     */
    float(max: number): number;

    /**
     * Generates a uniformly-distributed floating-point number between {@link min} (inclusive) and {@link max} (exclusive).
     * @param min The generated number will be at least this value.
     * @param max The generated number will be less than this value.
     * @example Generate a floating-point value between 10 and 20:
     * ```ts
     * let value = bge.random.float(10, 20);
     * ```
     */
    float(min: number, max: number): number;

    float(minOrMax?: number, max?: number): number {
        if (!this.isInitialized) {
            throw new Error("Random number generator isn't initialized yet!");
        }

        if (minOrMax === undefined) {
            return this._source();
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

        return min + this._source() * (max - min);
    }

    /**
     * Generates a uniformly-distributed integer between 0 (inclusive) and {@link max} (exclusive).
     * @param max The generated number will be less than this value. 
     * @example Generate an integer value between 0 and 9 (inclusive):
     * ```ts
     * let value = bge.random.int(10);
     * ```
     */
    int(max: number): number;
    
    /**
     * Generates a uniformly-distributed integer between {@link min} (inclusive) and {@link max} (exclusive).
     * @param min The generated number will be at least this value.
     * @param max The generated number will be less than this value.
     * @example Generate an integer value between 10 and 19 (inclusive):
     * ```ts
     * let value = bge.random.int(10, 20);
     * ```
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

        return min + Math.floor(this.float() * (max - min));
    }

    /**
     * Returns `true` with the given {@link probability}, which is 0.5 by default (50%).
     * @param probability Chance of returning true, between 0 and 1.
     * @example Fair coin flip:
     * ```ts
     * console.log(bge.random.chance() ? "Heads" : "Tails");
     * ```
     * Weighted coin flip, with a 75% bias towards heads:
     * ```ts
     * console.log(bge.random.chance(0.75) ? "Heads" : "Tails");
     * ```
     */
    chance(probability: number = 0.5): boolean {
        if (probability <= 0.0) {
            return false;
        }

        if (probability >= 1.0) {
            return true;
        }

        return this.float() <= probability;
    }

    /**
     * Returns a uniformly selected random item from an array.
     * @param items Array of items to select from.
     * @returns An item chosen from the given array.
     * @example Pick a random name from a list:
     * ```ts
     * let list = ["Alice", "Bob", "Charlie"];
     * let name = bge.random.item(list);
     * ```
     */
    item<TItem>(items: ReadonlyArray<TItem>): TItem {
        if (items.length < 1) {
            throw new Error("Expected at least one item");
        }

        return items[this.int(items.length)];
    }

    /**
     * Shuffles all items of the given array in-place.
     * @param array Array of items to shuffle
     * @example Shuffle a list of numbers:
     * ```ts
     * let list = [1, 2, 3, 4, 5];
     * bge.random.shuffle(list);
     * ```
     */
    shuffle<TItem>(array: TItem[]): void;
    
    /**
     * Shuffles a range of items of the given array in-place.
     * @param array Array of items to shuffle.
     * @param from Start of the range to shuffle, from 0.
     * @param to Exclusive end of the range to shuffle.
     * @example Shuffle the middle 3 items of a list with 5 numbers:
     * ```ts
     * let list = [1, 2, 3, 4, 5];
     * bge.random.shuffle(list, 1, 4);
     * ```
     */
    shuffle<TItem>(array: TItem[], from: number, to: number): void;

    shuffle<TItem>(array: TItem[], from?: number, to?: number): void {
        from ??= 0;
        to ??= array.length;

        for (let i = from; i < to - 1; ++i) {
            const swapIndex = this.int(i, to);

            const a = array[i];
            const b = array[swapIndex];
            
            array[i] = b;
            array[swapIndex] = a;
        }
    }
}

/**
 * Shared random number generator instance, seeded when the game starts.
 * To ensure replay function correctly, make sure you only use this instance in a deterministic way.
 * @category Core
 * @category Singletons
 * @example Use the global shared instance:
 * ```ts
 * let value = bge.random.int(10, 20);
 * ```
 */
export const random = new Random();