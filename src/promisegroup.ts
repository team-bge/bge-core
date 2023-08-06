/**
 * @category Async
 */
export abstract class PromiseGroup {
    private static _promiseGroups: (PromiseGroup | null)[] = [];

    /**
     * @internal
     */
    static get current(): PromiseGroup | null {
        return this._promiseGroups.length > 0
            ? this._promiseGroups[this._promiseGroups.length - 1]
            : null;
    }
        
    /**
     * @param group
     * @internal
     */
    static wrapPromises<T>(func: { (): T }, group: PromiseGroup): T {
        this._promiseGroups.push(group);

        let result: T;
        let matchingGroup: boolean;

        try {
            result = func();
        } finally {
            matchingGroup = this._promiseGroups.pop() == group;
        }

        if (!matchingGroup) {
            throw new Error("Expected different PromiseGroup");
        }

        return result;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private readonly _handlers: { (reason?: any): void }[] = [];

    private _hasRejected = false;
    private _rejectReason?: any; // eslint-disable-line @typescript-eslint/no-explicit-any

    private readonly _parent?: PromiseGroup;

    constructor(parent?: PromiseGroup) {
        this._parent = parent;
        this._parent?.catch(reason => {
            this.reject(reason);
        });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    catch(handler: { (reason?: any): void }): void {
        if (this._hasRejected) {
            handler(this._rejectReason);
            return;
        }

        this._handlers.push(handler);
    }

    abstract itemResolved(): void;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    abstract itemRejected(reason?: any): void;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    reject(reason?: any): void {
        if (this._hasRejected) {
            return;
        }

        this._hasRejected = true;
        this._rejectReason = reason;

        const handlers = this._handlers.splice(0, this._handlers.length);

        const errors: Error[] = [];

        for (const handler of handlers) {
            try {
                handler(reason);
            } catch (e) {
                errors.push(e);
            }
        }

        if (this._parent instanceof AnyGroup) {
            this._parent?.reject(reason);
        }

        if (errors.length > 0) {
            throw new AggregateError(errors);
        }
    }
}

/**
 * @category Async
 */
export class AnyGroup extends PromiseGroup {
    private _anyResolved = false;

    itemResolved(): void {
        if (this._anyResolved) {
            return;
        }

        this._anyResolved = true;
        this.reject("AnyGroup resolved");
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    itemRejected(_?: any): void {
        // 
    }
}

/**
 * @category Async
 */
export class AllGroup extends PromiseGroup {
    private _anyRejected = false;

    itemResolved(): void {
        //
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    itemRejected(reason?: any): void {
        if (this._anyRejected) {
            return;
        }

        this._anyRejected = true;
        this.reject(reason ?? "AllGroup rejected");
    }
}

/**
 * Creates a Promise that is resolved with an array of results when all of the provided Promises
 * resolve, or rejected when any Promise is rejected. Wraps Promise.all<T>.
 * @param createPromises A function that should return an array or iterable of Promises. The promises should
 * be created inside this function.
 * @returns A new Promise.
 * @category Async
 */
export function all<T>(createPromises: { (): Iterable<T | PromiseLike<T>> }) {
    return Promise.all(PromiseGroup.wrapPromises(createPromises, new AllGroup(PromiseGroup.current)));
}

/**
 * Creates a Promise that is fulfilled by the first given Promise to be fulfilled, or rejected with
 * an AggregateError containing an array of rejection reasons if all of the given promises are rejected.
 * All the given promises can still independently fulfill after the first one, unlike with anyExclusive<T>.
 * Wraps Promise.all<T>.
 * @param createPromises A function that should return an array or iterable of Promises. The promises should
 * be created inside this function.
 * @returns A new Promise.
 * @category Async
 */
export function any<T extends readonly unknown[] | []>(createPromises: { (): T }): Promise<Awaited<T[number]>> {
    return Promise.any(createPromises());
}

/**
 * Creates a Promise that is fulfilled by the first given Promise to be fulfilled, or rejected with
 * an AggregateError containing an array of rejection reasons if all of the given promises are rejected.
 * Unlike any<T>, after any of the given promises fulfills an inner prompt or delay, the other promises
 * are forcibly rejected. This is useful for letting players select from a range of actions, where responding
 * to the first prompt of any action commits that player to only that action.
 * Note that you must pass in a function that returns an array of Promises. That function will be invoked
 * once, and only any promises created during invokation will be exclusive. If that function returns promises
 * that were previously created elsewhere, they won't be exclusive.
 * @param createPromises A function that should return an array or iterable of Promises. The promises should
 * be created inside this function.
 * @returns A new Promise.
 * @category Async
 */
export function anyExclusive<T extends readonly unknown[] | []>(createPromises: { (): T }): Promise<Awaited<T[number]>>;
/**
 *
 */
export function anyExclusive<T>(createPromises: { (): Iterable<T | PromiseLike<T>> }): Promise<Awaited<T>> {
    return Promise.any(PromiseGroup.wrapPromises(createPromises, new AnyGroup(PromiseGroup.current)));
}
