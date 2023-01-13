import "reflect-metadata";
import { GameObject } from "./game.js";
import { Player } from "./player.js";
import { IOutlinedView, ITransformView, IView, Origin, Vector3, ViewType } from "./views.js";

export interface IParentInfo {
    parent: Object;
    childId?: number;
    localPosition?: Vector3;
    localRotation?: Vector3;
};

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

    private _renderChild(object: GameObject, parent: Object, childId: number, options?: IDisplayOptions): IView;
    private _renderChild(object: GameObject, parent: Object, parentView: IView, options?: IDisplayOptions): void;
    private _renderChild(object: GameObject, parent: Object, childIdOrParentView: number | IView, options?: IDisplayOptions): IView | void {
        const isInternal = typeof childIdOrParentView !== "number";

        const childId: number | null = isInternal ? null : childIdOrParentView;
        const parentView: IView | null = isInternal ? childIdOrParentView : null;

        const oldParentInfo = this._oldParentMap.get(object);
        this.newParentMap.set(object, { parent: parent, childId: childId, localPosition: options?.localPosition, localRotation: options?.localRotation });
        
        if (isInternal && oldParentInfo?.parent === parent) {
            return;
        }

        const wasHidden = this._isHidden;
        this._isHidden = (options?.isHidden ?? false) || wasHidden;

        const view = object.render(this);

        this._isHidden = wasHidden;

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

        if (oldParentInfo?.parent !== parent && view.type == ViewType.Card) {
            view.origin = {
                containerId: oldParentInfo == null ? undefined : this.getParentId(oldParentInfo.parent),
                childId: oldParentInfo?.childId,
                localPosition: oldParentInfo == null ? { y: 100 } : oldParentInfo?.localPosition,
                localRotation: oldParentInfo == null ? { x: Math.random() * 360, y: Math.random() * 360, z: Math.random() * 360 } : oldParentInfo?.localRotation
            };

            this._origins.push([object._lastActionIndex, view.origin]);
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

    renderProperties(parent: Object, parentView: IView): IView[] {
        const views: IView[] = [];
        let nextId = 0;

        for (let key in parent) {
            const options: IDisplayOptions = Reflect.getMetadata(displayKey, parent, key);
            if (options == null) {
                continue;
            }

            ++nextId;
            
            const value = (parent as any)[key];
            if (value == null) {
                continue;
            }

            let view: IView;

            if (value instanceof GameObject) {
                view = this.renderChild(value, parent, nextId, options);
            } else {
                throw new Error("Unexpected display value type.");
            }

            views.push(view);
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
}

export interface IDisplayOptions {
    label?: string;
    isHidden?: boolean;
    localPosition?: Vector3;
    localRotation?: Vector3;
}

const displayKey = Symbol("display");

export function display(options?: IDisplayOptions) : PropertyDecorator {
    return Reflect.metadata(displayKey, options ?? { });
}
