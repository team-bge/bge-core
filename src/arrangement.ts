import { Bounds, ITransform, Rotation, Vector3 } from "./math/index.js";

export abstract class Arrangement {
    protected static getPivot(alignment: Alignment): number {
        switch (alignment) {
            case Alignment.START:
                return 0.5;
            case Alignment.CENTER:
                return 0;
            case Alignment.END:
                return -0.5;
            default:
                throw new Error("Unexpected alignment");
        }
    }

    protected readonly margin: Vector3;

    constructor(options?: IArrangementOptions) {
        this.margin = options?.margin ?? Vector3.ZERO;
    }

    generate(boundsArray: Bounds[]): ITransform[] {
        if (boundsArray.length === 0) { 
            return [];
        }

        if (!this.margin.isZero) {
            const halfMargin = this.margin.mul(0.5);
            boundsArray = boundsArray.map(x => x.expand(halfMargin));
        }

        let localTransforms = this.generateLocal(boundsArray);

        if (localTransforms.length !== boundsArray.length) {
            throw new Error("Expected output transform array length to match input length");
        }

        return localTransforms;
    }

    protected abstract generateLocal(boundsArray: Bounds[]): ITransform[];
}

export enum Alignment {
    START,
    CENTER,
    END
}

export interface IArrangementOptions {
    margin?: Vector3;
}

export interface ILinearArrangementOptions extends IArrangementOptions {
    axis?: "x" | "y" | "z";

    xAlign?: Alignment;
    yAlign?: Alignment;
    zAlign?: Alignment;

    offset?: Vector3;

    reverse?: boolean;
}

export class LinearArrangement extends Arrangement {
    readonly axis: Vector3;
    readonly offAxis: Vector3;
    readonly pivot: Vector3;
    readonly offset: Vector3;
    readonly reverse: boolean;

    constructor(options?: ILinearArrangementOptions) {
        super(options);

        switch (options?.axis ?? "x") {
            case "x":
                this.axis = Vector3.UNIT_X;
                break;

            case "y":
                this.axis = Vector3.UNIT_Y;
                break;

            case "z":
                this.axis = Vector3.UNIT_Z;
                break;

            default:
                throw new Error("Invalid axis name");
        }

        this.offAxis = Vector3.ONE.sub(this.axis);

        this.pivot = new Vector3(
            Arrangement.getPivot(options?.xAlign ?? Alignment.CENTER),
            Arrangement.getPivot(options?.yAlign ?? Alignment.CENTER),
            Arrangement.getPivot(options?.zAlign ?? Alignment.START)
        );

        this.offset = options?.offset ?? Vector3.ZERO;
        this.reverse = options?.reverse ?? false;
    }
    
    protected override generateLocal(boundsArray: Bounds[]): ITransform[] {
        const offAxisMaxSize = boundsArray.reduce((s, x) => Vector3.max(s, x.size), Vector3.ZERO).mul(this.offAxis);
        const alongAxisTotalSize = boundsArray.reduce((s, x) => s + x.size.dot(this.axis), 0);

        const output: ITransform[] = [];
        let pos = offAxisMaxSize.mul(this.pivot).add(
            this.axis.mul(alongAxisTotalSize * (this.pivot.dot(this.axis) - 0.5)));

        for (let bounds of boundsArray) {
            const alongAxisSize = bounds.size.dot(this.axis);
            const offAxisSize = bounds.size.mul(this.offAxis);

            pos = pos.add(this.axis.mul(alongAxisSize * 0.5));

            output.push({
                position: pos
                    .sub(bounds.center)
                    .add(offAxisMaxSize
                        .sub(offAxisSize)
                        .mul(this.pivot))
                    .add(new Vector3(0, 0, bounds.min.z))
            });

            pos = pos.add(this.axis.mul(alongAxisSize * 0.5)).add(this.offset);
        }

        if (this.reverse) {
            output.reverse();
        }

        return output;
    }
}

export interface IRadialArrangementOptions extends IArrangementOptions {
    innerRadius?: number;
}

export class RadialArrangement extends Arrangement {
    readonly innerRadius: number;

    constructor(options?: IRadialArrangementOptions) {
        super(options);

        this.innerRadius = options?.innerRadius ?? -1;
    }
    
    protected override generateLocal(boundsArray: Bounds[]): ITransform[] {
        const maxWidth = boundsArray.reduce((s, x) => Math.max(s, x.size.x), 0) + this.margin.x;
        const deltaTheta = 2 * Math.PI / boundsArray.length;
        const dist = Math.max(this.innerRadius, boundsArray.length < 2 ? 0 : maxWidth / (2 * Math.tan(deltaTheta * 0.5)));
               
        const output: ITransform[] = [];

        for (let i = 0; i < boundsArray.length; i++) {
            const bounds = boundsArray[i];
            
            const r = this.innerRadius === -1 && boundsArray.length === 0 ? 0 : dist + bounds.size.y * 0.5 + this.margin.y;
            const theta = Math.PI + deltaTheta * i;

            output.push({
                position: new Vector3(Math.sin(theta) * r, Math.cos(theta) * r),
                rotation: Rotation.z(-theta * 180 / Math.PI + 180)
            });
        }

        return output;
    }
}

export interface IRectangularArrangementOptions extends IArrangementOptions {
    size: Vector3;
}

export class RectangularArrangement extends Arrangement {
    readonly size: Vector3;

    constructor(options: IRectangularArrangementOptions) {
        super(options);

        this.size = options.size;
    }

    private generateLinear(boundsArray: Bounds[], position: Vector3, rotation: Rotation): ITransform[] {
        const arrangement = new LinearArrangement({
            axis: "x",
            margin: this.margin,
            yAlign: Alignment.END
        });

        const transforms = arrangement.generate(boundsArray);

        for (let transform of transforms) {
            transform.position = position.add(rotation.rotate(transform.position ?? Vector3.ZERO));
            transform.rotation = rotation.mul(transform.rotation ?? Rotation.IDENTITY);
        }

        return transforms;
    }
    
    protected override generateLocal(boundsArray: Bounds[]): ITransform[] {
        // TODO: handle different-sized footprints
        const aspectRatio = this.size.x / this.size.y;
        const maxSize = boundsArray.reduce((s, x) => Vector3.max(s, x.size), Vector3.ZERO);

        const totalWeight = 2 + aspectRatio * 2;
        const horzWeight = 1 / totalWeight;
        const vertWeight = aspectRatio / totalWeight;

        const sides = [
            { weight: horzWeight, count: 0 },
            { weight: horzWeight * (boundsArray.length == 3 ? 1.5 : 1), count: 0 },
            { weight: vertWeight, count: 0 },
            { weight: vertWeight, count: 0 }
        ];

        for (let i = 0; i < boundsArray.length; ++i) {
            let bestScore = Number.MAX_VALUE;
            let bestIndex = 0;
            for (let j = 0; j < sides.length; ++j) {
                const score = sides[j].weight * (sides[j].count + 1);
                if (score < bestScore) {
                    bestScore = score;
                    bestIndex = j;
                }
            }

            sides[bestIndex].count += 1;
        }

        const width = Math.max(this.size.x, sides[0].count * maxSize.x, sides[1].count * maxSize.x);
        const height = Math.max(this.size.y, sides[2].count * maxSize.x, sides[3].count * maxSize.x);

        let addedCount = 0;

        const output: ITransform[] = [];

        output.push(...this.generateLinear(boundsArray.slice(addedCount, addedCount += sides[0].count),
            new Vector3(0, -height * 0.5, 0), Rotation.IDENTITY).reverse());
        output.push(...this.generateLinear(boundsArray.slice(addedCount, addedCount += sides[3].count),
            new Vector3(-width * 0.5, 0, 0), Rotation.z(-90)).reverse());
        output.push(...this.generateLinear(boundsArray.slice(addedCount, addedCount += sides[1].count),
            new Vector3(0, height * 0.5, 0), Rotation.z(180)).reverse());
        output.push(...this.generateLinear(boundsArray.slice(addedCount, addedCount += sides[2].count),
            new Vector3(width * 0.5, 0, 0), Rotation.z(90)).reverse());
   
        return output;
    }
}
