import { DisplayChild, DisplayParent, IDisplayOptions, RenderContext } from "./display.js";
import { ITransform } from "./math/index.js";
import { GameObject } from "./objects/object.js";
import { IView } from "./views.js";

const displayOptionsKey = Symbol("display:options");
const displayKeysKey = Symbol("display:keys");

/**
 * @category Display
 */
export type DisplayOptionsFunc<TParent = any, TValue = any> = { (this: TParent, ctx: RenderContext, value: TValue): IDisplayOptions };

/**
 * Decorates a property to be displayed as a child of the containing object.
 * Supported for {@link GameObject} values, or `string` / `number` values to display them as text.
 * @category Display
 * @category Decorators
 * @param options Optional positioning and styling options.
 */
export function display(options?: IDisplayOptions): PropertyDecorator;

/**
 * Decorates a property to be displayed as a child of the containing object.
 * Supported for {@link GameObject} values, or `string` / `number` values to display them as text.
 * @category Display
 * @category Decorators
 * @param optionsFn Function invoked whenever this property is rendered, to dynamically control how it is displayed.
 */
export function display<TParent = any, TValue = any>(optionsFn: DisplayOptionsFunc<TParent, TValue>): PropertyDecorator;

export function display(options?: IDisplayOptions | DisplayOptionsFunc): PropertyDecorator {
    return (target, propertyKey) => {
        const list = Reflect.getOwnMetadata(displayOptionsKey, target, propertyKey) as (IDisplayOptions | DisplayOptionsFunc)[] ?? [];
        if (options != null) {
            list.push(options);
        }
        Reflect.defineMetadata(displayOptionsKey, list, target, propertyKey);

        const displayKeys = Reflect.getOwnMetadata(displayKeysKey, target.constructor) ?? new Set<string>();
        displayKeys.add(propertyKey);
        Reflect.defineMetadata(displayKeysKey, displayKeys, target.constructor);
    };
}

interface IChildProperty {
    parent: Object;
    getValue: { (): GameObject | Iterable<GameObject> | string | number };
    annotationOptions: (IDisplayOptions | DisplayOptionsFunc)[];
    dynamicOptions?: IDisplayOptions;
    jitterSeed: string;
}

/**
 * Container for dynamically adding, removing, and repositioning objects for display.
 * @category Display
 */
export class DisplayContainer {
    private static _nextIndex = 1;

    private readonly _dynamicChildren = new Map<DisplayChild, IDisplayOptions>();
    private readonly _childProperties = new Map<string, IChildProperty>();

    get isEmpty(): boolean {
        return this._dynamicChildren.size === 0 && this._childProperties.size === 0;
    }

    getOptions(key: string): IDisplayOptions;
    getOptions(child: DisplayChild): IDisplayOptions;
    
    getOptions(arg: string | DisplayChild): IDisplayOptions {
        if (typeof arg === "string") {
            const prop = this._childProperties.get(arg);
            if (prop == null) {
                return null;
            }

            return prop.dynamicOptions ??= {} as IDisplayOptions;
        } else {
            return this._dynamicChildren.get(arg);
        }
    }

    add(object: DisplayChild, options?: IDisplayOptions): IDisplayOptions {
        if (this._dynamicChildren.get(object)) {
            throw new Error("Object is already a child of this container.");
        }
        
        options ??= {};

        options.jitterSeed ??= `${DisplayContainer._nextIndex++}`;

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
     * Adds all properties of {@link parent} annotated with {@link display}.
     * The value of each property will be fetched each time this container is rendered,
     * so new values assigned after {@link addProperties} is called will always be displayed.
     * @param parent Object to search through the properties of.
     */
    addProperties(parent: Object): void {
        const displayList = Reflect.getOwnMetadata(displayKeysKey, Object.getPrototypeOf(parent).constructor) as Set<string>;
        if (displayList == null || displayList.size === 0) {
            return;
        }

        for (let key of displayList) {
            const options: (IDisplayOptions | DisplayOptionsFunc)[] = Reflect.getMetadata(displayOptionsKey, parent, key);

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
                parent,
                getValue: typeof value === "function" ? value : () => (parent as any)[key],
                annotationOptions: options,
                jitterSeed: `${DisplayContainer._nextIndex++}`
            });
        }
    }

    /**
     * Applies transform {@link a} to transform {@link b}, returning the result. Neither {@link a} nor {@link b} are modified.
     * @param a Outer transformation.
     * @param b Inner transformation.
     * @returns The combined transformation.
     */
    static applyTransform(a: ITransform, b: ITransform): ITransform;
    
    /**
     * Applies transform {@link a} to transform {@link b}, storing the result in {@link out}. Neither {@link a} nor {@link b} are modified.
     * @param a Outer transformation.
     * @param b Inner transformation.
     * @param out Target for the combined transformation.
     * @returns Combined transform {@link out}
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
            const childView = typeof child === "function"
                ? ctx.renderText(child, child(), parent, options)
                : ctx.renderChild(child, parent, options);

            if (childView != null) {
                views.push(childView);
            }
        }

        for (let [key, property] of this._childProperties) {
            const options: IDisplayOptions = { jitterSeed: property.jitterSeed };
            const value = property.getValue();

            for (let option of property.annotationOptions) {
                if (typeof option === "function") {
                    Object.assign(options, option.apply(property.parent, [ctx, value]));
                } else {
                    Object.assign(options, option);
                }
            }

            if (property.dynamicOptions != null) {
                Object.assign(options, property.dynamicOptions);
            }

            const childView = typeof value === "string" || typeof value === "number"
                ? ctx.renderText(property.getValue as any, value, parent, options)
                : value instanceof GameObject
                    ? ctx.renderChild(value, parent, options)
                    : ctx.renderChildren(value, parent, options);
            
            if (Array.isArray(childView)) {
                views.push(...childView);
            } else if (childView != null) {
                views.push(childView);
            }
        }

        return views;
    }
}
