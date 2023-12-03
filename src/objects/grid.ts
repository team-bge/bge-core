import { display } from "../displaycontainer.js";
import { OutlineStyle } from "../views.js";
import { Zone } from "./zone.js";

export interface IGridIndex {
    get hash(): string;
}

export interface IGridOptions {
    autoCreateNeighbors?: boolean;
}

export abstract class Grid<TIndex extends IGridIndex, TValue> extends Zone {
    private readonly _cells = new Map<string, GridCell<TIndex, TValue>>();

    readonly autoCreateNeighbors: boolean;

    get cells(): readonly GridCell<TIndex, TValue>[] {
        return [...this._cells.values()];
    }
    
    get emptyCells(): readonly GridCell<TIndex, TValue>[] {
        return this.cells.filter(x => x.isEmpty);
    }
    
    get occupiedCells(): readonly GridCell<TIndex, TValue>[] {
        return this.cells.filter(x => !x.isEmpty);
    }

    constructor(options?: IGridOptions) {
        super();

        this.autoCreateNeighbors = options?.autoCreateNeighbors ?? false;

        this.outlineStyle = OutlineStyle.NONE;
    }

    getCell(index: TIndex): GridCell<TIndex, TValue> | undefined {
        return this._cells.get(index.hash);
    }

    getOrCreateCell(index: TIndex): GridCell<TIndex, TValue> {
        let cell = this.getCell(index);

        if (cell != null) {
            return cell;
        }

        cell = new GridCell<TIndex, TValue>(this, index);
        this._cells.set(index.hash, cell);

        this.onCreateCell(cell);

        return cell;
    }

    removeCell(index: TIndex): void {
        const cell = this.getCell(index);

        if (cell == null) {
            return;
        }

        this._cells.delete(index.hash);
        this.onRemoveCell(cell);
    }

    getValue(index: TIndex): TValue | undefined {
        return this.getCell(index)?.value;
    }

    setValue(index: TIndex, value?: TValue): void {
        if (value == null) {
            this.removeCell(index);
        } else {
            this.getOrCreateCell(index).value = value;
        }
    }

    getNeighbors(index: TIndex): readonly GridCell<TIndex, TValue>[] {
        return this.onGetNeighbourIndices(index)
            .map(x => this.getCell(x));
    }

    protected abstract onCreateCell(cell: GridCell<TIndex, TValue>): void;
    protected abstract onRemoveCell(cell: GridCell<TIndex, TValue>): void;
    protected abstract onGetNeighbourIndices(index: TIndex): readonly TIndex[];

    _onValueChanged(cell: GridCell<TIndex, TValue>, wasEmpty: boolean): void {
        if (!this.autoCreateNeighbors) {
            return;
        }
        
        if (wasEmpty) {
            for (const index of this.onGetNeighbourIndices(cell.index)) {
                this.getOrCreateCell(index);
            }
        } else {
            const cells = [cell, ...this.getNeighbors(cell.index)];
            for (const cell of cells) {
                if (cell.neighbors.every(x => x.isEmpty)) {
                    cell.remove();
                }
            }
        }
    }
}

export class GridCell<TIndex extends IGridIndex, TValue> extends Zone {
    readonly grid: Grid<TIndex, TValue>;
    readonly index: TIndex;

    private _value?: TValue;

    get neighbors(): readonly GridCell<TIndex, TValue>[] {
        return this.grid.getNeighbors(this.index);
    }

    constructor(grid: Grid<TIndex, TValue>, index: TIndex) {
        super();

        this.grid = grid;
        this.index = index;

        this.outlineStyle = OutlineStyle.NONE;
    }

    @display()
    get value(): TValue | undefined {
        return this._value;
    }

    get isEmpty(): boolean {
        return this._value == null;
    }

    set value(value: TValue | undefined) {
        const wasEmpty = this.isEmpty;
        this._value = value;

        this.grid._onValueChanged(this, wasEmpty);
    }

    remove(): void {
        this.grid.removeCell(this.index);
    }
}

export class GridIndex2D implements IGridIndex {
    readonly x: number;
    readonly y: number;

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }

    get hash(): string {
        return `${this.x},${this.y}`;
    }
}

export interface IRectangleGridOptions extends IGridOptions {
    cellSize?: number;
    cellWidth?: number;
    cellHeight?: number;
    cellMargin?: number;
}

export class RectangleGrid<TValue> extends Grid<GridIndex2D, TValue> {
    readonly cellWidth: number;
    readonly cellHeight: number;
    readonly cellMargin: number;

    constructor(options?: IRectangleGridOptions) {
        super(options);

        this.cellWidth = options?.cellWidth ?? options?.cellSize ?? 1;
        this.cellHeight = options?.cellHeight ?? options?.cellSize ?? 1;
        this.cellMargin = options?.cellMargin ?? 0;    
    }

    protected override onCreateCell(cell: GridCell<GridIndex2D, TValue>): void {
        cell.width = this.cellWidth;
        cell.height = this.cellHeight;
        
        this.children.add(cell, {
            position: {
                x: cell.index.x * (this.cellWidth + this.cellMargin),
                y: cell.index.y * (this.cellHeight + this.cellMargin)
            }
        })
    }

    protected override onRemoveCell(cell: GridCell<GridIndex2D, TValue>): void {
        this.children.remove(cell);
    }

    protected override onGetNeighbourIndices(index: GridIndex2D): readonly GridIndex2D[] {
        return [
            new GridIndex2D(index.x - 1, index.y),
            new GridIndex2D(index.x, index.y - 1),
            new GridIndex2D(index.x + 1, index.y),
            new GridIndex2D(index.x, index.y + 1)
        ];
    }
}
