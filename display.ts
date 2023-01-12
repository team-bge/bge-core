import "reflect-metadata";
import { GameObject } from "./game";
import { Player } from "./player";
import { IOutlinedView, ITransformView, IView, Vector3 } from "./views";

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
    readonly oldParentMap: ParentMap;

    readonly parentViews: Map<Object, IView>;
    readonly parentIds: Map<Object, number>;

    private _animationCount: number;
    private _isHidden: boolean;

    get isHidden(): boolean {
        return this._isHidden;
    }

    constructor(player: Player, oldParentMap: ParentMap) {
        this.player = player;

        this.oldParentMap = oldParentMap;
        this.newParentMap = new Map();

        this.parentViews = new Map();
        this.parentIds = new Map();

        this._animationCount = 0;
        this._isHidden = false;
    }

    getParentId(parent: Object): number {
        let parentId = this.parentIds.get(parent);

        if (parentId == null) {
            parentId = this.parentIds.size + 1;
            this.parentIds.set(parent, parentId);
        }

        return parentId;
    }

    setParentView(parent: Object, view: IView): void {
        this.parentViews.set(parent, view);
    }

    private _renderChild(object: GameObject, parent: Object, childId: number, options?: IDisplayOptions): IView;
    private _renderChild(object: GameObject, parent: Object, parentView: IView, options?: IDisplayOptions): void;
    private _renderChild(object: GameObject, parent: Object, childIdOrParentView: number | IView, options?: IDisplayOptions): IView | void {
        const isInternal = typeof childIdOrParentView !== "number";

        const childId: number | null = isInternal ? null : childIdOrParentView;
        const parentView: IView | null = isInternal ? childIdOrParentView : null;

        const oldParentInfo = this.oldParentMap.get(object);
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

        if (oldParentInfo != null && oldParentInfo.parent !== parent) {
            view.origin = {
                containerId: this.getParentId(oldParentInfo.parent),
                childId: oldParentInfo.childId,
                localPosition: oldParentInfo.localPosition,
                localRotation: oldParentInfo.localRotation,
                delay: (this._animationCount++) * 0.1
            };
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
            
            const value = parent[key];
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
        for (let [parent, parentId] of this.parentIds) {
            const view = this.parentViews.get(parent);
            
            if (view == null) {
                continue;
            }

            view.containerId = parentId;
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
