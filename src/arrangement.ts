import { Bounds, ITransform, Rotation, Vector3 } from "./math/index.js";
import { Random } from "./random.js";

export abstract class Arrangement {
    static readonly DEFAULT_MAX_JITTER_OFFSET = new Vector3(0.25, 0.25, 0);
    static readonly DEFAULT_MAX_JITTER_ROTATION = Rotation.z(5);

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

    protected readonly jitter: boolean;
    protected readonly minJitterOffset: Vector3;
    protected readonly maxJitterOffset: Vector3;
    protected readonly minJitterRotation: Rotation;
    protected readonly maxJitterRotation: Rotation;

    constructor(options?: IArrangementOptions) {
        this.margin = options?.margin ?? Vector3.ZERO;

        this.jitter = options?.jitter ?? false;

        this.maxJitterOffset = options?.maxJitterOffset ?? Arrangement.DEFAULT_MAX_JITTER_OFFSET;
        this.minJitterOffset = options?.minJitterOffset ?? this.maxJitterOffset.mul(-1);
    
        this.maxJitterRotation = options?.maxJitterRotation ?? Arrangement.DEFAULT_MAX_JITTER_ROTATION;
        this.minJitterRotation = options?.minJitterRotation ?? this.maxJitterRotation.inverse;
    }

    generate(boundsArray: Bounds[], parentLocalBounds?: Bounds, jitterSeed?: string): ITransform[] {
        if (boundsArray.length === 0) { 
            return [];
        }

        if (!this.margin.isZero) {
            const halfMargin = this.margin.mul(0.5);
            boundsArray = boundsArray.map(x => x.expand(halfMargin));
        }
        
        let random = new Random(jitterSeed ?? "jitter");

        const localTransforms = this.generateLocal(boundsArray, random, parentLocalBounds);

        if (localTransforms.length !== boundsArray.length) {
            throw new Error("Expected output transform array length to match input length");
        }

        if (this.jitter && jitterSeed != null) {
            random = new Random(jitterSeed);
            localTransforms.forEach(x => {
                const offset = Vector3.lerp(this.minJitterOffset, this.maxJitterOffset, random.float());
                const rotation = Rotation.slerp(this.minJitterRotation, this.maxJitterRotation, random.float());
                x.position = x.position?.add(offset) ?? offset;
                x.rotation = rotation.mul(x.rotation ?? Rotation.IDENTITY);
            });
        }

        return localTransforms;
    }

    protected abstract generateLocal(boundsArray: Bounds[], random: Random, parentLocalBounds?: Bounds): ITransform[];
}

export enum Alignment {
    START,
    CENTER,
    END
}

export interface IArrangementOptions {
    margin?: Vector3;

    jitter?: boolean;
    minJitterOffset?: Vector3;
    maxJitterOffset?: Vector3;
    minJitterRotation?: Rotation;
    maxJitterRotation?: Rotation;
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
            
            const r = this.innerRadius === -1 && boundsArray.length === 1 ? 0 : dist + bounds.size.y * 0.5 + this.margin.y;
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

export interface IPileArrangementOptions extends IArrangementOptions {
    itemRadius?: number;
    localBounds?: Bounds;
}

export class PileArrangement extends Arrangement {
    static readonly FALLBACK = new LinearArrangement({
        axis: "z"
    });

    readonly itemRadius?: number;
    readonly localBounds?: Bounds;

    constructor(options?: IPileArrangementOptions) {
        super({
            ...(options ?? {}),
            jitter: options?.jitter ?? true,
            maxJitterOffset: options?.maxJitterOffset ?? Vector3.ZERO,
            maxJitterRotation: options?.maxJitterRotation ?? Rotation.z(90)
        });

        this.itemRadius = options?.itemRadius;
        this.localBounds = options?.localBounds;
    }

    protected override generateLocal(boundsArray: Bounds[], random: Random, parentLocalBounds?: Bounds): ITransform[] {
        const maxSize = boundsArray.reduce((s, x) => Vector3.max(s, x.size), Vector3.ZERO);
        const radius = this.itemRadius ?? (Math.sqrt(maxSize.x * maxSize.x + maxSize.y * maxSize.y) * 0.25);
        
        const localBounds = this.localBounds ?? parentLocalBounds;

        if (localBounds == null) {
            return PileArrangement.FALLBACK.generate(boundsArray);
        }

        const minX = localBounds.min.x + radius;
        const minY = localBounds.min.y + radius;
        const maxX = localBounds.max.x - radius;
        const maxY = localBounds.max.y - radius;

        if (minX >= maxX && minY >= maxY) {
            return PileArrangement.FALLBACK.generate(boundsArray);
        }

        const height = maxSize.z;

        const result: ITransform[] = [];
        const attempts = 256;

        const diameterSq = radius * radius * 4;

        for (let bounds of boundsArray) {
            let bestX: number;
            let bestY: number;
            let bestZ = Number.POSITIVE_INFINITY;

            for (let i = 0; i < attempts; ++i) {
                const x = minX >= maxX ? (minX + maxX) * 0.5 : random.float(minX, maxX);
                const y = minY >= maxY ? (minY + maxY) * 0.5 : random.float(minY, maxY);

                let z = 0;

                for (let existing of result) {
                    const dX = existing.position.x - x;
                    const dY = existing.position.y - y;

                    if (dX * dX + dY * dY < diameterSq) {
                        z = Math.max(z, existing.position.z + height);
                        continue;
                    }
                }

                if (z < bestZ) {
                    bestX = x;
                    bestY = y;
                    bestZ = z;
                }

                if (z === 0) {
                    break;
                }
            }

            result.push({
                position: new Vector3(bestX, bestY, bestZ)
            });
        }

        return result;
    }
}