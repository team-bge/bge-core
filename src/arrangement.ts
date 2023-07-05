import { Bounds, ITransform, Rotation, Vector3 } from "./math/index.js";
import { Random } from "./random.js";

/**
 * {@link Arrangement}s handle deciding where to position items based on the local bounds of the parent object.
 * 
 * Each class extending {@link Arrangement} needs to implement {@link Arrangement.generateLocal}.
 * Features like {@link IArrangementOptions.margin} and {@link IArrangementOptions.jitter} are handled in the base {@link Arrangement} class.
 */
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

    /**
     * Generates the transformations for a bunch of child objects, given the bounds of the containing object.
     * @param boundsArray Axis aligned offsets and sizes of each child object.
     * @param parentLocalBounds Offset and size of the containing object.
     * @param jitterSeed Seed used to deterministically apply jitter to the generated arrangement.
     * @returns Array of generated transformations, one for each element in {@link boundsArray}.
     */
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

    /**
     * When implemented in a deriving class, generates the base transformations for an array of objects.
     * The returned array must contain exactly one element for each item in {@link boundsArray}.
     * There's no need to handle {@link margin} or {@link jitter} here, those features are implemented
     * in the base class.
     * @param boundsArray Axis aligned offsets and sizes of each child object.
     * @param random Random number generator available for adding variance to the generated transforms. Will produce the same sequence of samples between calls on the same instance.
     * @param parentLocalBounds Offset and size of the containing object.
     */
    protected abstract generateLocal(boundsArray: Bounds[], random: Random, parentLocalBounds?: Bounds): ITransform[];
}

export enum Alignment {
    START,
    CENTER,
    END
}

/**
 * Base options common to all {@link Arrangement} types.
 */
export interface IArrangementOptions {
    /**
     * How much to expand the bounds of each child object, in each axis.
     * Defaults to zero.
     */
    margin?: Vector3;

    /**
     * If true, apply some random variance to the position and / or rotation
     * of each child object. Uses {@link minJitterOffset}, {@link maxJitterOffset},
     * {@link minJitterRotation} and {@link maxJitterRotation} to decide the range
     * of offsets / rotations.
     */
    jitter?: boolean;

    /**
     * 
     */
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

/**
 * Options for {@link PileArrangement}.
 */
export interface IPileArrangementOptions extends IArrangementOptions {
    /**
     * When provided, replaces the size of each child object when arranging.
     */
    itemRadius?: number;

    /**
     * When provided, used instead of the bounds of the parent object when arranging.
     */
    localBounds?: Bounds;
}

/**
 * Scatter an arbitrary number of objects, which can start to stack items
 * on top of each other if needed. Objects are biased towards the middle of the available
 * space.
 */
export class ScatterArrangement extends Arrangement {
    /**
     * Arrangement used if the available space can't be determined.
     */
    static readonly FALLBACK = new LinearArrangement({
        axis: "z"
    });

    /**
     * When provided, replaces the size of each child object when arranging.
     */
    readonly itemRadius?: number;
    
    /**
     * When provided, used instead of the bounds of the parent object when arranging.
     */
    readonly localBounds?: Bounds;

    /**
     * Arrange an arbitrary number of objects in a pile, which can start to stack items
     * on top of each other if needed. Objects are biased towards the middle of the available
     * space.
     */
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
        // If itemRadius isn't provided in options, approximate based on the largest item bounds

        const maxSize = boundsArray.reduce((s, x) => Vector3.max(s, x.size), Vector3.ZERO);
        const radius = this.itemRadius ?? (Math.sqrt(maxSize.x * maxSize.x + maxSize.y * maxSize.y) * 0.25);
        
        const localBounds = this.localBounds ?? parentLocalBounds;

        if (localBounds == null) {
            return ScatterArrangement.FALLBACK.generate(boundsArray);
        }

        const minX = localBounds.min.x + radius;
        const minY = localBounds.min.y + radius;
        const maxX = localBounds.max.x - radius;
        const maxY = localBounds.max.y - radius;

        if (minX >= maxX && minY >= maxY) {
            return ScatterArrangement.FALLBACK.generate(boundsArray);
        }

        // Rejection sample, trying to find positions for each item that
        // are stacked the least high. We'll pick the best position after
        // 256 attempts for each item.

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

/**
 * Stack in a pyramid
 */
 export class PileArrangement extends Arrangement {
    /**
     * Arrangement used if the available space can't be determined.
     */
    static readonly FALLBACK = new LinearArrangement({
        axis: "z"
    });

    /**
     * When provided, replaces the size of each child object when arranging.
     */
    readonly itemRadius?: number;
    
    /**
     * When provided, used instead of the bounds of the parent object when arranging.
     */
    readonly localBounds?: Bounds;

    /**
     * Arrange an arbitrary number of objects in a pile, which can start to stack items
     * on top of each other if needed. Objects are biased towards the middle of the available
     * space.
     */
    constructor(options?: IPileArrangementOptions) {
        super(options);

        this.itemRadius = options?.itemRadius;
        this.localBounds = options?.localBounds;
    }

    protected override generateLocal(boundsArray: Bounds[], random: Random, parentLocalBounds?: Bounds): ITransform[] {
        // If itemRadius isn't provided in options, approximate based on the largest item bounds

        const maxSize = boundsArray.reduce((s, x) => Vector3.max(s, x.size), Vector3.ZERO);
        const radius = this.itemRadius ?? (Math.sqrt(maxSize.x * maxSize.x + maxSize.y * maxSize.y) * 0.25);
        
        const percentGap = 0.1 // TODO: Parameterise

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

        // Work out the base x and y of a pyramid, assuming we want full rotation options for it, so 1/sqrt(2) times the shortest constraint
        const pyramidSpacing = Math.max(maxSize.x, maxSize.y) * (1 + percentGap);
        const minDimention = Math.min(maxX - minX, maxY - minY);
        const maxPyramidLayer = Math.floor(0.707 * minDimention / pyramidSpacing);

        // TODO Allow an overwriteable config for this also
        const minForPyramid = (maxPyramidLayer * maxPyramidLayer) / 2

        // If too few, use a scatter arrangement
        if (boundsArray.length <= minForPyramid) {
            const result = new ScatterArrangement({localBounds:localBounds, itemRadius: radius}).generate(boundsArray)
            // Add random rotations (otherwise correct jitter is not applied)
            for (let r of result){
                r.rotation = Rotation.z(random.int(90))
            }
            return result
        }

        // Work out layers for the pyramid
        let layerList: number[] = [];

        let remainingCubes = boundsArray.length;
        let currentLayerSize = 1

        while (remainingCubes > 0){
            layerList.push(currentLayerSize);
            remainingCubes -= currentLayerSize * currentLayerSize;
            if (remainingCubes < (currentLayerSize + 1) * (currentLayerSize + 1)){
                currentLayerSize = currentLayerSize
            } else if (currentLayerSize < maxPyramidLayer){
                currentLayerSize += 1;
            } else {
                currentLayerSize = 1;
            }
        }

        layerList.sort();
        layerList.reverse();

        // Build pyramid
        remainingCubes = boundsArray.length

        const result: ITransform[] = [];
        let z = 0;
        const height = maxSize.z;

        for (let layerSize of layerList){
            for (let x = 0; x < layerSize; x++){
                for (let y = 0; y < layerSize; y++){
                    // TODO Center pyramids
                    // TODO Rotate pyramids
                    // TODO Randomise pyramid center
                    // TODO Jitter pyramids
                    result.push({
                        position: new Vector3(x * pyramidSpacing, y * pyramidSpacing, z * height)
                    });
                    if (result.length >= boundsArray.length){
                        return result
                    }
                }
            }
            z += 1
        }

        return result;
    }
}
