import { DisplayChild, DisplayParent, IDisplayOptions, RenderContext } from "./display.js";
import { ITransform } from "./math/index.js";
import { GameObject } from "./objects/object.js";
import { IView } from "./views.js";

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

interface IChildProperty {
    getter: { (): GameObject | Iterable<GameObject> | string | number };
    options: IDisplayOptions;
}

/**
 * Container for dynamically adding, removing, and repositioning objects for display.
 */
export class DisplayContainer {
    private readonly _dynamicChildren = new Map<DisplayChild, IDisplayOptions>();
    private readonly _childProperties = new Map<string, IChildProperty>;

    get isEmpty(): boolean {
        return this._dynamicChildren.size === 0 && this._childProperties.size === 0;
    }

    getOptions(key: string): IDisplayOptions;
    getOptions(child: DisplayChild): IDisplayOptions;
    
    getOptions(arg: string | DisplayChild): IDisplayOptions {
        if (typeof arg === "string") {
            return this._childProperties.get(arg)?.options;
        } else {
            return this._dynamicChildren.get(arg);
        }
    }

    add(object: DisplayChild, options?: IDisplayOptions): IDisplayOptions {
        if (this._dynamicChildren.get(object)) {
            throw new Error("Object is already a child of this container.");
        }
        
        options ??= {};

        this._dynamicChildren.set(object, options);

        return options;
    }
    
    /**
     * Remove the given child object. Returns true if the child was in this container.
     * @param object Child object to remove.
     */
    remove(object: DisplayChild): boolean {
        return this._dynamicChildren.delete(object);
    }

    /**
     * Removes all child objects from this container.
     */
    removeAll(): void;

    /**
     * Removes all of the given child objects.
     * @param objects Iterable of objects to remove.
     */
    removeAll(objects: Iterable<DisplayChild>): void;
    
    removeAll(objects?: Iterable<DisplayChild>): void {
        if (objects === undefined) {
            this._dynamicChildren.clear();
        } else {
            for (let child of objects) {
                this.remove(child);
            }
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

            this._childProperties.set(key, {
                getter: typeof value === "function" ? value : () => (parent as any)[key],
                options: { ...options }
            });
        }
    }

    /**
     * Applies transform `a` to transform `b`, returning the result. Neither `a` nor `b` are modified.
     * @param a Outer transformation.
     * @param b Inner transformation.
     * @returns The combined transformation.
     */
    static applyTransform(a: ITransform, b: ITransform): ITransform;
    
    /**
     * Applies transform `a` to transform `b`, storing the result in `out`. Neither `a` nor `b` are modified.
     * @param a Outer transformation.
     * @param b Inner transformation.
     * @param out Target for the combined transformation.
     * @returns `out`
     */
    static applyTransform(a: ITransform, b: ITransform, out: ITransform): ITransform;

    static applyTransform(a: ITransform, b: ITransform, out?: ITransform): ITransform {

        out ??= { };

        if (b.position == null) {
            out.position = a.position;
        } else {
            const rotatedPosition = a.rotation?.rotate(b.position) ?? b.position;
            out.position = a.position?.add(rotatedPosition) ?? rotatedPosition;
        }

        if (b.rotation == null) {
            out.rotation = a.rotation;
        } else {
            out.rotation = a.rotation?.mul(b.rotation) ?? b.rotation;
        }

        return out;
    }

    render(ctx: RenderContext, parent: DisplayParent, views?: IView[]): IView[] {
        views ??= [];

        for (let [child, options] of this._dynamicChildren) {
            const childView = ctx.renderChild(child, parent, options);

            if (childView != null) {
                views.push(childView);
            }
        }

        for (let [key, property] of this._childProperties) {
            const childView = ctx.renderChild(property.getter, parent, property.options);
            
            if (Array.isArray(childView)) {
                views.push(...childView);
            } else if (childView != null) {
                views.push(childView);
            }
        }

        return views;
    }
}
