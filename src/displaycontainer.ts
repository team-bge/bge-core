import { IDisplayOptions, RenderContext } from "./display.js";
import { Footprint, GameObject } from "./object.js";
import { Vector3, ITransformView, IView } from "./views.js";

interface IDisplayChild {
    childId: number;
    options: IDisplayOptions;
}

/**
 * Ways to arrange a set of child objects.
 */
export enum Arrangement {
    /**
     * Guess the best arrangement based on object count and dimensions.
     */
    Auto,

    /**
     * Put all the objects in a line on the x-axis.
     */
    Linear,

    /**
     * Put the objects around the edges of a rectangle.
     */
    Rectangular,

    /**
     * Put the N objects around the edges of an N-sided polygon.
     */
    Radial
}

/**
 * Options to use with `DisplayContainer.addRange(objects)`.
 */
export interface IRangeDisplayOptions {
    /**
     * Optional area to avoid when positioning child objects.
     */
    avoid?: Footprint;

    /**
     * Strategy to use when arranging child objects, defaults to `Auto`.
     */
    arrangement?: Arrangement;

    /**
     * Either a single `IDisplayOptions` that will be used with every child object,
     * or an array containing separate options for each child.
     */
    childOptions?: IDisplayOptions | IDisplayOptions[];
}

const displayOptionsKey = Symbol("display:options");
const displayListKey = Symbol("display:list");

/**
 * Decorates a property to be displayed as a child of the containing object.
 * Supported for `GameObject` values, or `string` / `number` values to display them as text.
 * @param options Optional positioning and styling options.
 */
export function display(options?: IDisplayOptions) : PropertyDecorator {
    return (target, propertyKey) => {
        Reflect.defineMetadata(displayOptionsKey, options ?? { }, target, propertyKey);
        const displayList = Reflect.getOwnMetadata(displayListKey, target.constructor) ?? [];
        displayList.push(propertyKey);
        Reflect.defineMetadata(displayListKey, displayList, target.constructor);
    };
}

/**
 * Container for dynamically adding, removing, and repositioning objects for display.
 */
export class DisplayContainer {
    private _nextChildId = 0;
    private readonly _children = new Map<GameObject | { (): GameObject }, IDisplayChild>();

    /**
     * Total number of child objects added to this container.
     */
    get count(): number {
        return this._children.size;
    }

    getOptions(child: GameObject | { (): GameObject }): IDisplayOptions {
        return this._children.get(child)?.options;
    }

    add(object: GameObject | { (): GameObject }, options?: IDisplayOptions): IDisplayOptions {
        if (this._children.get(object)) {
            throw new Error("Object is already a child of this container.");
        }
        
        const info = {
            childId: this._nextChildId++,
            options: options ?? { }
        } as IDisplayChild;

        this._children.set(object, info);

        return info.options;
    }
    
    addRange<T extends GameObject>(objects: T[], options?: IRangeDisplayOptions): { child: T, display: IDisplayOptions }[] {
        const footprints = objects.map(x => x.footprint ?? { width: 0, height: 0 });
        const arrangement = DisplayContainer.generateArrangement(footprints, options?.avoid,
            options?.arrangement ?? Arrangement.Auto);

        const children: { child: T, display: IDisplayOptions }[] = [];

        if (Array.isArray(options?.childOptions) && options.childOptions.length !== objects.length) {
            throw new Error("Expected childOptions array length to match objects array.");
        }

        for (let i = 0; i < objects.length; ++i) {
            const object = objects[i];
            const transform = arrangement[i];

            let childOptions: IDisplayOptions;

            if (options?.childOptions != null) {
                const baseOptions = Array.isArray(options.childOptions)
                    ? options.childOptions[i]
                    : options.childOptions;

                childOptions = { ...baseOptions };
                DisplayContainer.applyTransform(baseOptions, transform, childOptions);
            } else {
                childOptions = { ...transform };
            }

            children.push({ child: object, display: this.add(object, childOptions) });
        }

        return children;
    }

    /**
     * Remove the given child object. Returns true if the child was in this container.
     * @param object Child object to remove.
     */
    remove(object: GameObject | { (): GameObject }): boolean {
        return this._children.delete(object);
    }

    /**
     * Removes all of the given child objects.
     * @param objects Array of objects to remove.
     */
    removeRange(objects: GameObject[]): void {
        for (let child of objects) {
            this.remove(child);
        }
    }

    /**
     * @summary Adds all properties of `parent` annotated with `@display()`.
     * @description The value of each property will be fetched each time this container is rendered,
     * so new values assigned after `addProperties()` is called will always be displayed.
     * @param parent Object to search through the properties of.
     */
    addProperties(parent: Object): void {
        const displayList = Reflect.getOwnMetadata(displayListKey, Object.getPrototypeOf(parent).constructor);
        if (displayList == null || displayList.length === 0) {
            return;
        }

        for (let key of displayList) {
            const options: IDisplayOptions = Reflect.getMetadata(displayOptionsKey, parent, key);

            if (options == null) {
                continue;
            }
            
            let value: any;
            
            try {
                value = (parent as any)[key];
            } catch (e) {
                value = null;
            }

            if (typeof value !== "function") {
                value = () => (parent as any)[key];
            }

            this.add(value, options);
        }
    }

    private static generateLinearArrangement(footprints: Footprint[], center: Vector3, pivot: number, angle: number): ITransformView[] {
        if (footprints.length === 0) {
            return [];
        }

        const totalWidth = footprints.reduce((s, x) => s + x.width, 0);

        let offsetX = totalWidth * -0.5;
        
        const arrangement: ITransformView[] = [];

        const xx = Math.cos(angle);
        const xy = Math.sin(angle);
        
        const yx = -Math.sin(angle);
        const yy = Math.cos(angle);

        for (let i = 0; i < footprints.length; i++) {
            const footprint = footprints[i];
            const offsetZ = (pivot - 0.5) * footprint.height;

            offsetX += footprint.width * 0.5;

            arrangement.push({
                localPosition: { x: (center.x ?? 0) + xx * offsetX + xy * offsetZ, y: center.y, z: (center.z ?? 0) + yx * offsetX + yy * offsetZ },
                localRotation: { y: angle * 180 / Math.PI }
            });

            offsetX += footprint.width * 0.5;
        }

        return arrangement;
    }

    private static generateArrangement(footprints: Footprint[], avoid?: Footprint, type: Arrangement = Arrangement.Auto): ITransformView[] {
        if (type === Arrangement.Auto) {
            const aspect = (avoid?.width ?? 1) / (avoid?.height ?? 1);
            type = footprints.length <= 4 || Math.max(aspect, 1 / aspect) > 2 ? Arrangement.Rectangular : Arrangement.Radial;
        }

        const maxFootprint: Footprint = {
            width: Math.max(...footprints.map(x => x.width)),
            height: Math.max(...footprints.map(x => x.height))
        };
        
        const arrangement: ITransformView[] = [];

        switch (type) {
            case Arrangement.Linear: {
                if (avoid == null) {
                    return DisplayContainer.generateLinearArrangement(footprints, { }, 0.5, 0);
                } else {
                    return DisplayContainer.generateLinearArrangement(footprints, { z: avoid.height * -0.5 }, 0, 0);
                }
            }

            case Arrangement.Rectangular: {
                // TODO: handle different-sized footprints
                const aspectRatio = avoid?.width / avoid?.height ?? 1;

                const totalWeight = 2 + aspectRatio * 2;
                const horzWeight = 1 / totalWeight;
                const vertWeight = aspectRatio / totalWeight;

                const sides = [
                    { weight: horzWeight, count: 0 },
                    { weight: horzWeight * (footprints.length == 3 ? 1.5 : 1), count: 0 },
                    { weight: vertWeight, count: 0 },
                    { weight: vertWeight, count: 0 }
                ];

                for (let i = 0; i < footprints.length; ++i) {
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

                const width = Math.max(avoid?.width ?? 0, sides[0].count * maxFootprint.width, sides[1].count * maxFootprint.width);
                const height = Math.max(avoid?.height ?? 0, sides[2].count * maxFootprint.width, sides[3].count * maxFootprint.width);

                let addedCount = 0;

                arrangement.push(...DisplayContainer.generateLinearArrangement(footprints.slice(addedCount, addedCount += sides[0].count), { z: -height * 0.5 }, 0, 0).reverse());
                arrangement.push(...DisplayContainer.generateLinearArrangement(footprints.slice(addedCount, addedCount += sides[2].count), { x: -width * 0.5 }, 0, Math.PI * 0.5).reverse());
                arrangement.push(...DisplayContainer.generateLinearArrangement(footprints.slice(addedCount, addedCount += sides[1].count), { z: height * 0.5 }, 0, Math.PI).reverse());
                arrangement.push(...DisplayContainer.generateLinearArrangement(footprints.slice(addedCount, addedCount += sides[3].count), { x: width * 0.5 }, 0, Math.PI * -0.5).reverse());

                break;
            }

            case Arrangement.Radial: {
                const deltaTheta = 2 * Math.PI / footprints.length;
                let dist = footprints.length < 2 ? 0 : maxFootprint.width / (2 * Math.tan(deltaTheta * 0.5));
        
                if (avoid != null) {
                    dist = Math.max(dist, Math.sqrt(avoid.width * avoid.width + avoid.height * avoid.height) * 0.5);
                }
                
                for (let i = 0; i < footprints.length; i++) {
                    const footprint = footprints[i];
                    
                    const r = dist + footprint.height * 0.5;
                    const theta = Math.PI + deltaTheta * i;
        
                    arrangement.push({
                        localPosition: { x: Math.sin(theta) * r, z: Math.cos(theta) * r },
                        localRotation: { y: theta * 180 / Math.PI + 180 }
                    });
                }
        
                break;
            }

            default:
                throw new Error("Unknown arrangement type");
        }
        
        return arrangement;
    }

    /**
     * Applies transform `a` to transform `b`, returning the result. Neither `a` nor `b` are modified.
     * @param a Outer transformation.
     * @param b Inner transformation.
     * @returns The combined transformation.
     */
    static applyTransform(a: ITransformView, b: ITransformView): ITransformView;
    
    /**
     * Applies transform `a` to transform `b`, storing the result in `out`. Neither `a` nor `b` are modified.
     * @param a Outer transformation.
     * @param b Inner transformation.
     * @param out Target for the combined transformation.
     * @returns `out`
     */
    static applyTransform(a: ITransformView, b: ITransformView, out: ITransformView): ITransformView;

    static applyTransform(a: ITransformView, b: ITransformView, out?: ITransformView): ITransformView {

        out ??= { };

        out.localPosition = {
            x: (a.localPosition?.x ?? 0) + (b.localPosition?.x ?? 0),
            y: (a.localPosition?.y ?? 0) + (b.localPosition?.y ?? 0),
            z: (a.localPosition?.z ?? 0) + (b.localPosition?.z ?? 0)
        };

        // TODO: this is wrong!
        // convert rotations to quaternions or something first
        // also apply rotation to b's position

        out.localRotation = {
            x: (a.localRotation?.x ?? 0) + (b.localRotation?.x ?? 0),
            y: (a.localRotation?.y ?? 0) + (b.localRotation?.y ?? 0),
            z: (a.localRotation?.z ?? 0) + (b.localRotation?.z ?? 0)
        };

        return out;
    }

    render(ctx: RenderContext, parent: Object, views?: IView[]): IView[] {
        views ??= [];

        for (let [child, info] of this._children) {
            const obj = typeof child === "function" ? child() : child;

            if (obj == null) {
                continue;
            }

            const childView = ctx.renderChild(obj, parent, info.childId, info.options);

            if (childView != null) {
                views.push(childView);
            }
        }

        return views;
    }
}
