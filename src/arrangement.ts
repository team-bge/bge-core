import { Bounds, ITransform, Rotation, Vector3 } from "./math/index.js";
import { Random } from "./random.js";

/**
 * @category Arrangements
 * @summary {@link Arrangement}s handle deciding where to position items based on the local bounds of the parent object.
 * @description Each class extending {@link Arrangement} needs to implement {@link Arrangement.generateLocal}.
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

/**
 * @category Arrangements
 */
export enum Alignment {
    START,
    CENTER,
    END
}

/**
 * @category Arrangements
 * @summary Base options common to all {@link Arrangement} types.
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

/**
 * @category Arrangements
 */
export interface ILinearArrangementOptions extends IArrangementOptions {
    axis?: "x" | "y" | "z";

    xAlign?: Alignment;
    yAlign?: Alignment;
    zAlign?: Alignment;

    offset?: Vector3;

    reverse?: boolean;
}

/**
 * @category Arrangements
 */
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

/**
 * @category Arrangements
 */
export interface IRadialArrangementOptions extends IArrangementOptions {
    innerRadius?: number;
}

/**
 * @category Arrangements
 */
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

/**
 * @category Arrangements
 */
export interface IRectangularArrangementOptions extends IArrangementOptions {
    size: Vector3;
}

/**
 * @category Arrangements
 */
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
 * @category Arrangements
 * @summary Options for {@link ScatterArrangement}.
 */
export interface IScatterArrangementOptions extends IArrangementOptions {
    /**
     * When provided, replaces the size of each child object when arranging.
     */
    itemWidth?: number;

    /**
     * When provided, used instead of the bounds of the parent object when arranging.
     */
    localBounds?: Bounds;
}

/**
 * @category Arrangements
 * @summary Scatter an arbitrary number of objects, which can start to stack items
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
    readonly itemWidth?: number;
    
    /**
     * When provided, used instead of the bounds of the parent object when arranging.
     */
    readonly localBounds?: Bounds;

    /**
     * Arrange an arbitrary number of objects in a pile, which can start to stack items
     * on top of each other if needed. Objects are biased towards the middle of the available
     * space.
     */
    constructor(options?: IScatterArrangementOptions) {
        super({
            ...(options ?? {}),
            jitter: options?.jitter ?? true,
            maxJitterOffset: options?.maxJitterOffset ?? Vector3.ZERO,
            maxJitterRotation: options?.maxJitterRotation ?? Rotation.z(90)
        });

        this.itemWidth = options?.itemWidth;
        this.localBounds = options?.localBounds;
    }

    protected override generateLocal(boundsArray: Bounds[], random: Random, parentLocalBounds?: Bounds): ITransform[] {
        // If itemWidth isn't provided in options, approximate radius based on the largest item bounds

        const maxSize = boundsArray.reduce((s, x) => Vector3.max(s, x.size), Vector3.ZERO);
        const radius = this.itemWidth ?? (Math.sqrt(maxSize.x * maxSize.x + maxSize.y * maxSize.y) * 0.5);
        
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
 * @category Arrangements
 * @summary Options for {@link PileArrangement}.
 */
export interface IPileArrangementOptions extends IScatterArrangementOptions {
    /**
     * When provided, toggles between triangular based and square based pyramids
     */
    triangle?: boolean;

    /**
     * When provided, sets the minium number of items required to build a pyramid
     */
    minQuantityForPyramid?: number;

    /**
     * When provided, sets the maximum width for a pyramid layer
     */
    maxPyramidLayer?: number;

    /**
     * When provided, sets the minimum width for a pyramid layer
     */
    minPyramidLayer?: number;
}

/**
 * @category Arrangements
 * @summary Stack in a pyramid.
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
    readonly itemWidth?: number;
    
    /**
     * When provided, used instead of the bounds of the parent object when arranging.
     */
    readonly localBounds?: Bounds;

     /**
     * When provided, toggles between triangular based and square based pyramids
     */
     readonly triangle?: boolean;
 
     /**
      * When provided, sets the minium number of items required to build a pyramid
      */
     readonly minQuantityForPyramid?: number;
 
     /**
      * When provided, sets the maximum width for a pyramid layer
      */
     readonly maxPyramidLayer?: number;
 
     /**
      * When provided, sets the minimum width for a pyramid layer
      */
     readonly minPyramidLayer?: number;

    /**
     * Arrange an arbitrary number of objects in a pile, which can start to stack items
     * on top of each other if needed. Objects are biased towards the middle of the available
     * space.
     */
    constructor(options?: IPileArrangementOptions) {
        // Calcuate a default margin when radius is provided (10% in x and y)
        let margin = Vector3.ZERO;
        if (options.margin !== undefined && options.margin !== null){
            margin = options.margin;
        } else if (options.itemWidth !== undefined && options.itemWidth !== null){
            margin = new Vector3(options.itemWidth * 0.1, options.itemWidth * 0.1, 0);
        }

        // Calcuate a max jitter rotation when object radius is provided
        let maxJitterRotation = 0;
        let maxXYMargin = Math.max(margin.x, margin.y);
        let width = options.itemWidth;
        if ((maxXYMargin > 0) && (options.itemWidth !== undefined && options.itemWidth !== null)){
            maxJitterRotation = PileArrangement.maxRotationInSpace(options.itemWidth, options.itemWidth + maxXYMargin);
            // If radius is specified, we need to add the margin to it for spacing
            width += maxXYMargin;
        }

        super({
            ...(options ?? {}),
            margin: margin,
            jitter: options?.jitter ?? true,
            maxJitterOffset: Vector3.ZERO,  // Force Jitter offset to zero for pile arrangement, as we push items up next to each other
            maxJitterRotation: Rotation.z(maxJitterRotation),
        });

        this.itemWidth = width;
        this.localBounds = options?.localBounds;
        this.triangle = options?.triangle;
        this.minQuantityForPyramid = options?.minQuantityForPyramid;
        this.maxPyramidLayer = options?.maxPyramidLayer;
        this.minPyramidLayer = options?.minPyramidLayer;

    }

    /**
     * Get the total number of items which will me needed to fill a pyramid layer of a given width
     */
    static getPyramidLayerQuantity(layerSize: number, triangle: boolean): number
    {
        if (triangle) {
            return (layerSize * (layerSize + 1)) / 2;
        }
        // otherwise
        return layerSize * layerSize;
    }

    /**
     * Space placement of layerSize number of items of width 1, centered around 0
     */
    static getPyramidRowDisplacements(layerSize: number): number[]
    {
        const minDisp = -(layerSize - 1)/2;
        let displacementList: number[] = Array.from({ length: layerSize }, (_, i) => i + minDisp);
        return displacementList;
    }

    /**
     * Get X,Y coordinates for all locations on a pyramid layer of a particular width (assuming item spacing of 1)
     */
    static getPyramidLayerXY(layerSize: number, triangle: boolean): [number, number][]
    {
        let coords: [number, number][] = [];

        let xCoords = PileArrangement.getPyramidRowDisplacements(layerSize);

        if (!triangle) {
            for (let x of xCoords){
                for (let y of xCoords){
                    coords.push([x, y]);
                }
            }
        }
        else
        {
            // Triangle
            let yRow = 1;
            for (let x of xCoords){
                let yCoords = PileArrangement.getPyramidRowDisplacements(yRow);
                yRow += 1
                for (let y of yCoords){
                    coords.push([x, y]);
                }
            }
        }

        return coords;
    }

    /**
     * The maximum angle we can rotate a cube of size itemLength, in a box of size boundsLength
     */
    static maxRotationInSpace(itemLength: number, boundsLength: number): number
    {
        let arcsin = Math.asin(boundsLength / (1.414 * itemLength));
        // If arcsin is nan, we can rotate as much as we like
        if (isNaN(arcsin)){
            return 90;
        }
        // Otherwise, take pi/4 (45 degrees)
        return ((arcsin * 180) / Math.PI) - 45;
    }

    /**
     * Rotate a 2d vector by a given number of degrees
     */
    static rotate2d(x: number, y: number, angle: number){
        let radians = angle * Math.PI / 180;
        return [Math.cos(radians) * x - Math.sin(radians) * y,
                Math.sin(radians) * x + Math.cos(radians) * y];
    }

    protected override generateLocal(boundsArray: Bounds[], random: Random, parentLocalBounds?: Bounds): ITransform[] {
        // If itemWidth isn't provided in options, approximate based on the largest item bounds

        const maxSize = boundsArray.reduce((s, x) => Vector3.max(s, x.size), Vector3.ZERO);
        const width = this.itemWidth ?? Math.max(maxSize.x, maxSize.y);  // Only consider radius in x and y for pyramid purposes
        
        let triangle = this.triangle ?? false;

        // Edge case, for exactly 3 items, force use triangle
        if (boundsArray.length == 3){
            triangle = true;
        }

        const localBounds = this.localBounds ?? parentLocalBounds;

        if (localBounds == null) {
            return PileArrangement.FALLBACK.generate(boundsArray);
        }

        const minX = localBounds.min.x;
        const minY = localBounds.min.y;
        const maxX = localBounds.max.x;
        const maxY = localBounds.max.y;

        if (minX >= maxX && minY >= maxY) {
            return PileArrangement.FALLBACK.generate(boundsArray);
        }

        // Work out the base x and y of a pyramid
        const minDimention = Math.min(maxX - minX, maxY - minY);
        let maxPyramidLayer = Math.floor(minDimention / width);
        if ((this.maxPyramidLayer !== undefined && this.maxPyramidLayer !== null) && this.maxPyramidLayer < maxPyramidLayer){
            maxPyramidLayer = this.maxPyramidLayer;
        }

        // Get min required quanitity from config or generate sensible value
        const minQuantityForPyramid = this.minQuantityForPyramid ?? PileArrangement.getPyramidLayerQuantity(maxPyramidLayer, triangle) / 5;

        // If too few, use a scatter arrangement
        if (boundsArray.length <= minQuantityForPyramid) {
            const result = new ScatterArrangement({localBounds:localBounds, itemWidth: width}).generate(boundsArray)
            // Add random rotations (otherwise correct jitter is not applied)
            for (let r of result){
                r.rotation = Rotation.z(random.int(90))
            }
            return result
        }

        // Set a minimum pyramid layer
        let minPyramidLayer = 1;
        if (this.minPyramidLayer !== undefined && this.minPyramidLayer !== null){
            minPyramidLayer = this.minPyramidLayer < maxPyramidLayer ? this.minPyramidLayer : maxPyramidLayer;
        }
        // For small numbers of cubes, if practical, do not stack
        let firstLayerQauntity = triangle ? 3 : 4;
        if ((minPyramidLayer == 1) && (maxPyramidLayer > 1) && (boundsArray.length <= firstLayerQauntity)){
            minPyramidLayer = 2;
        }

        // Work out layers for the pyramid
        let layerList: number[] = [];

        let remainingCubes = boundsArray.length;
        let currentLayerSize = minPyramidLayer

        while (remainingCubes > 0){
            layerList.push(currentLayerSize);
            remainingCubes -= PileArrangement.getPyramidLayerQuantity(currentLayerSize, triangle);
            if (remainingCubes < PileArrangement.getPyramidLayerQuantity(currentLayerSize + 1, triangle)){
                currentLayerSize = currentLayerSize
            } else if (currentLayerSize < maxPyramidLayer){
                currentLayerSize += 1;
            } else {
                currentLayerSize = minPyramidLayer;
            }
        }

        layerList.sort();
        layerList.reverse();

        // Work out maximum rotation allowed for pyramid
        const maxPyramidRotate = PileArrangement.maxRotationInSpace(layerList[0]*width, minDimention);
        // And an actual rotation
        let pyramidRotate = random.int(maxPyramidRotate);

        // Work out the maximum x and y offsets
        let pyramidOrthogonalSpace = layerList[0]*width * (0.5 + Math.abs(Math.cos((90 - pyramidRotate) * Math.PI / 180)));
        let maxXOffset = (maxX - minX)/2 - pyramidOrthogonalSpace;
        let maxYOffset = (maxY - minY)/2 - pyramidOrthogonalSpace;
        maxXOffset = maxXOffset < 0 ? 0 : maxXOffset;
        maxYOffset = maxYOffset < 0 ? 0 : maxYOffset;
        // And get random offsets
        let pyramidXOffset = random.float(-maxXOffset, maxXOffset);
        let pyramidYOffset = random.float(-maxYOffset, maxYOffset);

        // Build pyramid
        remainingCubes = boundsArray.length

        const result: ITransform[] = [];
        let z = 0;
        const height = maxSize.z;

        for (let layerSize of layerList){
            let coords = PileArrangement.getPyramidLayerXY(layerSize, triangle);
            for (let [x, y] of coords){
                // By default, rotate items with the pyramid
                let itemRotation = pyramidRotate;
                // If the layer is size one, and jitter, add some extra rotation
                if (this.jitter && layerSize == 1){
                    itemRotation += random.int(-40, 40);
                }

                // Rotate x,y vector according to pyramid rotation & scale
                let [xRotate, yRotate] = PileArrangement.rotate2d(x * width, y * width, pyramidRotate);

                // Create transform
                result.push({
                    position: new Vector3(pyramidXOffset + xRotate, pyramidYOffset + yRotate, z * height),
                    rotation: Rotation.z(itemRotation)
                });

                // Once we have added all the items, return
                if (result.length >= boundsArray.length){
                    return result;
                }
            }
            z += 1;
        }

        return result;
    }
}
