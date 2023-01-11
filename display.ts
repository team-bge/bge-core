import "reflect-metadata";
import { GameObject } from "./game";
import { Player } from "./player";
import { IOutlinedView, ITransformView, IView, Vector3 } from "./views";

export interface IParentInfo {
    parent: Object;
    childId?: number;
};

export type ParentMap = Map<GameObject, IParentInfo>;

export class RenderContext {
    readonly player: Player;

    readonly newParentMap: ParentMap;
    readonly oldParentMap: ParentMap;

    readonly parentViews: Map<Object, IView>;
    readonly parentIds: Map<Object, number>;

    constructor(player: Player, oldParentMap: ParentMap) {
        this.player = player;

        this.oldParentMap = oldParentMap;
        this.newParentMap = new Map();

        this.parentViews = new Map();
        this.parentIds = new Map();
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
    
    renderChild(object: GameObject, parent: Object): void;
    renderChild(object: GameObject, parent: Object, childId: number): IView; 
    renderChild(object: GameObject, parent: Object, childId?: number): IView | void {
        const oldParentInfo = this.oldParentMap.get(object);

        if (childId == null && oldParentInfo?.parent === parent) {
            return;
        }

        const view = object.render(this);

        if (oldParentInfo != null && oldParentInfo.parent !== parent) {
            view.origin = {
                containerId: this.getParentId(oldParentInfo.parent),
                childId: oldParentInfo.childId
            };
        }

        this.newParentMap.set(object, { parent: parent, childId: childId });

        if (childId != null) {
            view.childId = childId;
            return view;
        }

        console.log("TODO: floating objects between parents");
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
                view = this.renderChild(value, parent, nextId);
            } else {
                throw new Error("Unexpected display value type.");
            }

            if (options.label != null) {
                (view as IOutlinedView).label = options.label;
            }

            if (options.offset != null) {
                const transformView = view as ITransformView;

                if (transformView.localPosition == null) {
                    transformView.localPosition = options.offset;
                } else {
                    transformView.localPosition.x = RenderContext.addVectorComponent(transformView.localPosition.x, options.offset.x);
                    transformView.localPosition.y = RenderContext.addVectorComponent(transformView.localPosition.y, options.offset.y);
                    transformView.localPosition.z = RenderContext.addVectorComponent(transformView.localPosition.z, options.offset.z);
                }
            }

            views.push(view);
        }

        return views;
    }

    close(): void {
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
    offset?: Vector3
}

const displayKey = Symbol("display");

export function display(options?: IDisplayOptions) : PropertyDecorator {
    return Reflect.metadata(displayKey, options ?? { });
}
