/**
 * @internal
 */
export class Debugging {
    private static _breakPoints: Set<number>;
    private static _lastBreakIndex: number = 0;

    static baseBreakUrl?: string;
    static onBreak?: () => void;

    static get breakPoints(): readonly number[] {
        return [...this._breakPoints];
    }

    static set breakPoints(breakPoints: readonly number[]) {
        this._breakPoints = new Set(breakPoints);
    }

    static get breakIndex(): number {
        return this._lastBreakIndex;
    }

    static get breakUrl(): string {
        return `${this.baseBreakUrl}${this.breakIndex}`;
    }

    static incrementBreakIndex(): boolean {
        const index = ++this._lastBreakIndex;
        if (this._breakPoints == null) {
            return false;
        }

        if (!this._breakPoints.has(index)) {
            return false;
        }

        if (this.onBreak != null) {
            this.onBreak();
        }

        return true;
    }
}
