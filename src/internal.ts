export class _Internal {
    private static _nextActionIndex = 0;

    static getNextActionIndex(): number {
        return this._nextActionIndex++;
    }
}
