import "reflect-metadata";
import { ITextEmbeddable } from "./interfaces.js";
import { Footprint, GameObject } from "./object.js";
import { Player } from "./player.js";
import { IOutlinedView, ITransformView, IView, Origin, TextEmbedView, Vector3, ViewType } from "./views.js";

export interface IParentInfo {
    parent: Object;
    childId?: number;
    localPosition?: Vector3;
    localRotation?: Vector3;
};

export interface IDisplayChild {
    object: GameObject | { (): GameObject };
    options: IDisplayOptions;
    childId: number;
}

export enum Arrangement {
    Auto,
    Linear,
    Rectangular,
    Radial
}

export class DisplayContainer {
    private _nextChildId = 0x10000;
    private readonly _children = new Map<string, IDisplayChild>();

    add(name: string, object: GameObject | { (): GameObject }, options?: IDisplayOptions): void {
        if (this._children.has(name)) {
            throw new Error("A child already exists with that name");
        }

        this._children.set(name, {
            object: object,
            childId: this._nextChildId++,
            options: options ?? { }
        });
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
            type = footprints.length < 4 || Math.max(aspect, 1 / aspect) > 2 ? Arrangement.Rectangular : Arrangement.Radial;
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

    addRange(name: string, objects: GameObject[], options?: IDisplayOptions | IDisplayOptions[], avoid?: Footprint, arrangementType: Arrangement = Arrangement.Auto): void {
        const footprints = objects.map(x => x.footprint ?? { width: 0, height: 0 });
        const arrangement = DisplayContainer.generateArrangement(footprints, avoid, arrangementType);

        for (let i = 0; i < objects.length; ++i) {
            const object = objects[i];
            const transform = arrangement[i];

            let childOptions: IDisplayOptions;

            if (options != null) {
                const baseOptions = Array.isArray(options) ? options[i] : options;
                childOptions = { ...baseOptions };
                DisplayContainer.applyTransform(baseOptions, transform, childOptions);
            } else {
                childOptions = { ...transform };
            }

            this.add(`${name}[${i}]`, object, childOptions);
        }
    }

    render(ctx: RenderContext, parent: Object, views?: IView[]): IView[] {
        return ctx.renderChildren(this._children.values(), parent, views);
    }
}

export type ParentMap = Map<GameObject, IParentInfo>;

export class RenderContext {
    readonly player: Player;

    readonly newParentMap: ParentMap;
    private readonly _oldParentMap: ParentMap;

    private readonly _parentViews: Map<Object, IView>;
    private readonly _parentIds: Map<Object, number>;

    private readonly _origins: [actionIndex: number, origin: Origin][];

    private _isHidden: boolean;

    get isHidden(): boolean {
        return this._isHidden;
    }

    constructor(player: Player, oldParentMap: ParentMap) {
        this.player = player;

        this._oldParentMap = oldParentMap;
        this.newParentMap = new Map();

        this._parentViews = new Map();
        this._parentIds = new Map();

        this._origins = [];

        this._isHidden = false;
    }

    getParentId(parent: Object): number {
        let parentId = this._parentIds.get(parent);

        if (parentId == null) {
            parentId = this._parentIds.size + 1;
            this._parentIds.set(parent, parentId);
        }

        return parentId;
    }

    setParentView(parent: Object, view: IView): void {
        this._parentViews.set(parent, view);
    }

    private _renderChild(object: GameObject | string | number, parent: Object, childId: number, options?: IDisplayOptions): IView;
    private _renderChild(object: GameObject | string | number, parent: Object, parentView: IView, options?: IDisplayOptions): void;
    private _renderChild(object: GameObject | string | number, parent: Object, childIdOrParentView: number | IView, options?: IDisplayOptions): IView | void {
        const isInternal = typeof childIdOrParentView !== "number";

        const childId: number | null = isInternal ? null : childIdOrParentView;
        const parentView: IView | null = isInternal ? childIdOrParentView : null;

        let view: IView;
        let oldParentInfo: IParentInfo;

        if (object instanceof GameObject) {
            oldParentInfo = this._oldParentMap.get(object);
            this.newParentMap.set(object, { parent: parent, childId: childId, localPosition: options?.localPosition, localRotation: options?.localRotation });
            
            if (isInternal && oldParentInfo?.parent === parent) {
                return;
            }
            
            const wasHidden = this._isHidden;
            this._isHidden = (options?.isHidden ?? false) && options?.owner != this.player || wasHidden;

            view = object.render(this);

            this._isHidden = wasHidden;
        } else {
            view = {
                type: ViewType.Text,
                format: object.toString()
            };
        }

        // TODO: we're assuming the view won't render with a transform
        if (options?.localPosition != null) {
            (view as ITransformView).localPosition = options.localPosition;
        }

        if (options?.localRotation != null) {
            (view as ITransformView).localRotation = options.localRotation;
        }

        if (options?.label != null) {
            (view as IOutlinedView).label = options.label;
        }

        if (object instanceof GameObject) {
            if (oldParentInfo?.parent !== parent && view.type == ViewType.Card) {
                view.origin = {
                    containerId: oldParentInfo == null ? undefined : this.getParentId(oldParentInfo.parent),
                    childId: oldParentInfo?.childId,
                    localPosition: oldParentInfo == null ? { y: 100 } : oldParentInfo?.localPosition,
                    localRotation: oldParentInfo == null ? { x: Math.random() * 360, y: Math.random() * 360, z: Math.random() * 360 } : oldParentInfo?.localRotation
                };

                this._origins.push([object._lastActionIndex, view.origin]);
            }
        }

        if (isInternal) {
            parentView.tempChildren ??= [];
            parentView.tempChildren.push(view);
        } else {
            view.childId = childId;
            return view;
        }
    }
    
    renderChild(object: GameObject, parent: Object, childId: number, options?: IDisplayOptions): IView {
        return this._renderChild(object, parent, childId, options);
    }

    renderInternalChild(object: GameObject, parent: Object, parentView: IView, options?: IDisplayOptions): void {
        this._renderChild(object, parent, parentView, options);
    }
    
    static addVectorComponent(a?: number, b?: number): number | undefined {
        if (a == null && b == null) return undefined;

        return (a ?? 0) + (b ?? 0);
    }

    renderChildren(children: Iterable<IDisplayChild>, parent: Object, views?: IView[]): IView[] {
        views ??= [];

        for (let child of children) {
            if (child.object == null) {
                continue;
            }

            let obj = typeof child.object === "function" ? child.object() : child.object;

            views.push(this.renderChild(obj, parent, child.childId, child.options));
        }

        return views;
    }

    renderProperties(parent: Object, views?: IView[]): IView[] {
        views ??= [];
        
        let nextId = 0;

        for (let container of [parent, Object.getPrototypeOf(parent)]) {
            for (let key of Object.getOwnPropertyNames(container)) {
                const options: IDisplayOptions = Reflect.getMetadata(displayKey, parent, key);
                if (options == null) {
                    continue;
                }
    
                ++nextId;
                
                let value = (parent as any)[key];
    
                if (typeof value === "function") {
                    value = value();
                }
    
                if (value == null) {
                    continue;
                }
    
                const view: IView = this.renderChild(value, parent, nextId, options);

                if (view != null) {
                    views.push(view);
                }    
            }
        }

        return views;
    }

    processAnimations(): void {
        for (let [parent, parentId] of this._parentIds) {
            const view = this._parentViews.get(parent);
            
            if (view == null) {
                continue;
            }

            view.containerId = parentId;
        }

        if (this._origins.length == 0) {
            return;
        }

        let index = 0;
        let delay = Math.min(0.1, 0.75 / this._origins.length);

        for (let [_, origin] of this._origins.sort(([indexA, originA], [indexB, originB]) => indexA - indexB)) {
            origin.delay = index++ * delay;
        }
    }

    renderTextEmbed(value: any): TextEmbedView {
        switch (typeof value) {
            case "string":
            case "number":
            case "boolean":
            case "bigint":
                return { label: value.toString() };

            case "object":
                if (value == null) {
                    return { label: "null" };
                }

                if (Array.isArray(value)) {
                    return { items: value.map(x => this.renderTextEmbed(x)) };
                }

                if (typeof value.renderTextEmbed === "function") {
                    const textEmbeddable = value as ITextEmbeddable;
                    return textEmbeddable.renderTextEmbed(this);
                }
                
                throw new Error("Value doesn't implement ITextEmbeddable.");

            default:
                throw new Error("Value isn't embeddable in text.");
        }
    }
}

export interface IDisplayOptions {
    label?: string;
    isHidden?: boolean;
    localPosition?: Vector3;
    localRotation?: Vector3;
    owner?: Player;
}

const displayKey = Symbol("display");

export function display(options?: IDisplayOptions) : PropertyDecorator {
    return Reflect.metadata(displayKey, options ?? { });
}
