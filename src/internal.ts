export class Internal {
    private static _nextActionIndex = 0;

    static getNextActionIndex(): number {
        return this._nextActionIndex++;
    }
}

export abstract class PromiseGroup {
    private readonly _handlers: { (reason?: any): void }[] = [];

    private _hasRejected = false;
    private _rejectReason?: any;

    private readonly _parent?: PromiseGroup;

    constructor(parent?: PromiseGroup) {
        this._parent = parent;
        this._parent?.catch(reason => {
            this.reject(reason);
        });
    }

    catch(handler: { (reason?: any): void }): void {
        if (this._hasRejected) {
            handler(this._rejectReason);
            return;
        }

        this._handlers.push(handler);
    }

    abstract itemResolved(): void;
    abstract itemRejected(reason?: any): void;

    reject(reason?: any): void {
        if (this._hasRejected) {
            return;
        }

        this._hasRejected = true;
        this._rejectReason = reason;

        const handlers = this._handlers.splice(0, this._handlers.length);

        let errors: Error[] = [];

        for (let handler of handlers) {
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

export class AnyGroup extends PromiseGroup {
    private _anyResolved = false;

    itemResolved(): void {
        if (this._anyResolved) {
            throw new Error("Already resolved");
        }

        this._anyResolved = true;
        this.reject("AnyGroup resolved");
    }

    itemRejected(reason?: any): void {
        // 
    }
}

export class AllGroup extends PromiseGroup {
    private _anyRejected = false;

    itemResolved(): void {
        //
    }

    itemRejected(reason?: any): void {
        if (this._anyRejected) {
            return;
        }

        this._anyRejected = true;
        this.reject(reason ?? "AllGroup rejected");
    }
}
