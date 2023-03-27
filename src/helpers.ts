export class Helpers {
    /**
     * Gets the element from the given collection with the smallest value returned by {@link getValue}.
     * If the collection is empty, returns undefined.
     */
    static minBy<T>(collection: Iterable<T>, getValue: { (item: T): number }): T | undefined {
        let bestValue = Number.MAX_VALUE;
        let bestItem: T = undefined;

        for (let item of collection) {
            const value = getValue(item);

            if (value < bestValue) {
                bestValue = value;
                bestItem = item;
            }
        }

        return bestItem;
    }

    /**
     * Gets the element from the given collection with the largest value returned by {@link getValue}.
     * If the collection is empty, returns undefined.
     */
    static maxBy<T>(collection: Iterable<T>, getValue: { (item: T): number }): T | undefined {
        let bestValue = -Number.MAX_VALUE;
        let bestItem: T = undefined;

        for (let item of collection) {
            const value = getValue(item);

            if (value > bestValue) {
                bestValue = value;
                bestItem = item;
            }
        }

        return bestItem;
    }

    /**
     * Sorts the given array in place, ensuring that equivalent items maintain the same ordering.
     * Returns the same array as was passed in.
     * @param array Array to sort.
     * @param comparer Function used to determine the order of the elements. It is expected to return a
     * negative value if the first argument is less than the second argument, zero if they're equal,
     * and a positive value otherwise.
     * @returns The same array as was passed in, now sorted.
     */
    static sortStable<T>(array: T[], compareFn: { (a: T, b: T): number }): T[] {
        const withIndex = array.map((x, i) => ({ value: x, index: i }));

        withIndex.sort((a, b) => {
            const comparison = compareFn(a.value, b.value);
            return comparison === 0
                ? a.index - b.index
                : comparison;
        })

        array.splice(0, array.length, ...withIndex.map(x => x.value));

        return array;
    }

    static printError(e: any): void {
        console.error(e);

        if (e instanceof AggregateError) {
            for (let inner of e.errors) {
                this.printError(inner);
            }
        }
    }
}
