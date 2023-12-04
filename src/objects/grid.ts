import { display } from "../displaycontainer.js";
import { OutlineStyle } from "../views.js";
import { Zone } from "./zone.js";

export interface IGridIndex<T extends IGridIndex<T>> {
    get hash(): string;

    to(other: T): T;
    equals(other: T): boolean;
}

export interface IGridOptions {
    autoCreateNeighbors?: boolean;
}

export abstract class Grid<TIndex extends IGridIndex<TIndex>, TValue> extends Zone {
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

export class GridCell<TIndex extends IGridIndex<TIndex>, TValue> extends Zone {
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

export class GridIndex2D implements IGridIndex<GridIndex2D> {
    static readonly ZERO = new GridIndex2D(0, 0);

    readonly x: number;
    readonly y: number;

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }

    get hash(): string {
        return `${this.x},${this.y}`;
    }

    north(steps = 1) {
        return new GridIndex2D(this.x, this.y + steps);
    }
    
    west(steps = 1) {
        return new GridIndex2D(this.x - steps, this.y);
    }

    south(steps = 1) {
        return new GridIndex2D(this.x, this.y - steps);
    }

    east(steps = 1) {
        return new GridIndex2D(this.x + steps, this.y);
    }

    to(other: GridIndex2D): GridIndex2D {
        return new GridIndex2D(other.x - this.x, other.y - this.y);
    }

    equals(other: GridIndex2D): boolean {
        return other.x === this.x && other.y === this.y;
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
        });
    }

    protected override onRemoveCell(cell: GridCell<GridIndex2D, TValue>): void {
        this.children.remove(cell);
    }

    protected override onGetNeighbourIndices(index: GridIndex2D): readonly GridIndex2D[] {
        return [
            index.west(),
            index.north(),
            index.east(),
            index.south()
        ];
    }
}

export class HexGridIndex implements IGridIndex<HexGridIndex> {
    static readonly ZERO = new HexGridIndex(0, 0);

    readonly x: number;
    readonly y: number;

    get z() {
        return this.x + this.y;
    }

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }

    get hash(): string {
        return `${this.x},${this.y}`;
    }

    north(steps = 1) {
        return new HexGridIndex(this.x, this.y + steps);
    }
    
    northWest(steps = 1) {
        return new HexGridIndex(this.x - steps, this.y + steps);
    }

    northEast(steps = 1) {
        return new HexGridIndex(this.x + steps, this.y);
    }

    south(steps = 1) {
        return new HexGridIndex(this.x, this.y - steps);
    }

    southWest(steps = 1) {
        return new HexGridIndex(this.x - steps, this.y);
    }

    southEast(steps = 1) {
        return new HexGridIndex(this.x + steps, this.y - steps);
    }

    to(other: HexGridIndex): HexGridIndex {
        return new HexGridIndex(other.x - this.x, other.y - this.y);
    }

    distance(other?: HexGridIndex): number {
        other ??= HexGridIndex.ZERO;

        const x = Math.abs(this.x - other.x);
        const y = Math.abs(this.y - other.y);
        const z = Math.abs(this.z - other.z);

        return Math.min(x + y, y + z, z + x);
    }

    equals(other: HexGridIndex): boolean {
        return other.x === this.x && other.y === this.y;
    }
}

export interface IHexGridOptions extends IGridOptions {
    cellSize?: number;
    cellMargin?: number;
}

export class HexGrid<TValue> extends Grid<HexGridIndex, TValue> {
    static readonly ROOT_0_75 = Math.sqrt(0.75);

    readonly cellSize: number;
    readonly cellMargin: number;

    constructor(options?: IHexGridOptions) {
        super(options);

        this.cellSize = options?.cellSize ?? 1;
        this.cellMargin = options?.cellMargin ?? 0;    
    }

    protected override onCreateCell(cell: GridCell<HexGridIndex, TValue>): void {
        cell.width = this.cellSize;
        cell.height = this.cellSize;
        
        this.children.add(cell, {
            position: {
                x: cell.index.x * HexGrid.ROOT_0_75 * (this.cellSize + this.cellMargin),
                y: (cell.index.y + 0.5 * cell.index.x) * (this.cellSize + this.cellMargin)
            }
        });
    }

    protected override onRemoveCell(cell: GridCell<HexGridIndex, TValue>): void {
        this.children.remove(cell);
    }

    protected override onGetNeighbourIndices(index: HexGridIndex): readonly HexGridIndex[] {
        return [
            index.northWest(),
            index.north(),
            index.northEast(),
            index.southEast(),
            index.south(),
            index.southWest()
        ];
    }
}