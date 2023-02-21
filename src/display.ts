import "reflect-metadata";

import { ITextEmbeddable } from "./interfaces.js";
import { Bounds, Vector3 } from "./math.js";
import { GameObject } from "./object.js";
import { Player } from "./player.js";
import { ILabelView, ITransformView, IView, Origin, TextEmbedView, ViewType } from "./views.js";

/**
 * Ways to arrange a set of child objects.
 */
export enum Arrangement {
    /**
     * Guess the best arrangement based on object count and dimensions.
     * Respects the {@link IDisplayOptions#avoid} setting.
     */
    Auto,

    /**
     * Put all the objects in a line on the x-axis.
     */
    LinearX,
    
    /**
     * Put all the objects in a line on the y-axis.
     */
    LinearY,
    
    /**
     * Put all the objects in a line on the z-axis.
     */
    LinearZ,

    /**
     * Put the objects around the edges of a rectangle. Respects the {@link IDisplayOptions#avoid} setting.
     */
    Rectangular,

    /**
     * Put the N objects around the edges of an N-sided polygon. Respects the {@link IDisplayOptions#avoid} setting.
     */
    Radial
}

/**
 * Options for positioning and styling an object or array of objects.
 */
export interface IDisplayOptions {
    /**
     * For objects that support it, this text will be displayed next to the object on the table.
     */
    label?: string;

    /**
     * Set of players for which the identity of this object should be hidden. Opposite of {@link revealedFor}.
     * This mainly affects cards, making them display their "hidden" face rather than "front" face.
     */
    hiddenFor?: Player[];

    /**
     * Set of players for which the identity of this object is revealed. Opposite of {@link hiddenFor}.
     * Defaults to everyone, unless {@link hiddenFor} is given.
     */
    revealedFor?: Player[];

    /**
     * Set of players for which this object is fully invisible. Opposite of {@link visibleFor}.
     */
    invisibleFor?: Player[]
    
    /**
     * Set of players for which this object is visible. Opposite of {@link invisibleFor}.
     * Defaults to everyone, unless {@link invisibleFor} is given.
     */
    visibleFor?: Player[]

    /**
     * Offset in centimeters, relative to the parent transform.
     */
    localPosition?: Vector3;

    /**
     * Euler angles in degrees, relative to the parent rotation.
     */
    localRotation?: Vector3;

    /**
     * For displaying an array of objects, strategy to use when arranging. Defaults to {@link Arrangement.Auto}.
     */
    arrangement?: Arrangement;

    /**
     * For displaying an array of objects, optional area to avoid when arranging.
     */
    avoid?: Bounds;

    /**
     * For displaying an array of objects, either a single {@link IDisplayOptions} that will 
     * be used with every child object, or an array containing separate options for each child.
     */
    childOptions?: IDisplayOptions | IDisplayOptions[];
}

interface IParentInfo {
    parent: Object;
    localPosition?: Vector3;
    localRotation?: Vector3;
};

/**
 * @internal
 */
export type ParentMap = Map<GameObject, IParentInfo>;

interface IParentChildIndices {
    nextChildIndex: number;
    prev?: Map<GameObject, number>;
    next: Map<GameObject, number>;
}

export class ChildIndexMap {
    private readonly _map = new Map<(GameObject | GameObject[]), IParentChildIndices>();

    get(parent: GameObject | GameObject[], child: GameObject): number {
        let parentChildIndices = this._map.get(parent);

        if (parentChildIndices == null) {
            parentChildIndices = {
                nextChildIndex: 0,
                prev: null,
                next: new Map()
            };

            this._map.set(parent, parentChildIndices);
        }

        let index = parentChildIndices.next.get(child);
        if (index == null) {
            index = parentChildIndices.prev?.get(child) ?? parentChildIndices.nextChildIndex++;
            parentChildIndices.next.set(child, index);
        }

        return index;
    }
    
    forgetUnused(): void {
        for (let [_, info] of this._map) {
            info.prev = info.next;
            info.next = new Map();
        }
    }
}

/**
 * Context used when rendering objects, containing information about visibility and ownership.
 */
export class RenderContext {
    private static readonly _animatingViewTypes = new Set<ViewType>([
        ViewType.Card,
        ViewType.Token
    ]);

    /**
     * Player that a view is being rendered for.
     */
    readonly player: Player | null;

    /**
     * @internal
     */
    readonly childIndexMap: ChildIndexMap;

    /**
     * @internal
     */
    readonly newParentMap: ParentMap;

    /**
     * @internal
     */
    readonly noAnimations: boolean;

    private readonly _oldParentMap: ParentMap;

    private readonly _parentViews: Map<Object, IView>;
    private readonly _parentIds: Map<Object, number>;

    private readonly _origins: [actionIndex: number, origin: Origin][];

    private _isHidden: boolean;

    /**
     * If true, objects should be rendered in a hidden state. For example,
     * cards won't show their true face, but a generic hidden face.
     */
    get isHidden(): boolean {
        return this._isHidden;
    }

    /**
     * @internal 
     */
    constructor(player: Player, oldChildIndexMap?: ChildIndexMap, oldParentMap?: ParentMap) {
        this.player = player;
        this.noAnimations = oldParentMap == null;

        this.childIndexMap = oldChildIndexMap ?? new ChildIndexMap();

        this._oldParentMap = oldParentMap ?? new Map();
        this.newParentMap = new Map();

        this._parentViews = new Map();
        this._parentIds = new Map();

        this._origins = [];

        this._isHidden = false;
    }

    /**
     * @internal
     */
    getParentId(parent: Object): number {
        let parentId = this._parentIds.get(parent);

        if (parentId == null) {
            parentId = this._parentIds.size + 1;
            this._parentIds.set(parent, parentId);
        }

        return parentId;
    }

    /**
     * @internal
     */
    setParentView(parent: Object, view: IView): void {
        this._parentViews.set(parent, view);
    }

    private _renderChild(object: GameObject | string | number, parent: Object, parentView: null, options?: IDisplayOptions): IView;
    private _renderChild(object: GameObject | string | number, parent: Object, parentView: IView, options?: IDisplayOptions): void;
    private _renderChild(object: GameObject | string | number, parent: Object, parentView?: IView, options?: IDisplayOptions): IView | void {
        const isInternal = parentView == null;

        let view: IView;
        let oldParentInfo: IParentInfo;

        let localPosition = options?.localPosition;

        if (localPosition?.y == null && object instanceof GameObject && object.localBounds != null) {
            localPosition = (localPosition ?? Vector3.ZERO).withZ(-object.localBounds.min.z);
        }

        if (object instanceof GameObject) {
            oldParentInfo = this._oldParentMap.get(object);
            this.newParentMap.set(object, { parent: parent, childId: childId, localPosition: localPosition, localRotation: options?.localRotation });
            
            if (isInternal && (this.noAnimations || oldParentInfo?.parent === parent)) {
                return;
            }
            
            const wasHidden = this._isHidden;

            if (this.player != null) {
                if (options?.invisibleFor != null && options.invisibleFor.includes(this.player)) {
                    return null;
                }

                if (options?.visibleFor != null && !options.visibleFor.includes(this.player)) {
                    return null;
                }

                if (options?.hiddenFor != null) {
                    this._isHidden = options.hiddenFor.includes(this.player);
                }
                
                if (options?.revealedFor != null) {
                    this._isHidden = !options.revealedFor.includes(this.player);
                }
            }

            try {
                view = object.render(this);
            } catch (e) {
                console.error(e);
            } finally {
                this._isHidden = wasHidden;
            }
        } else {
            view = {
                type: ViewType.Text,
                format: object.toString()
            };
        }

        if (view == null) {
            return null;
        }

        // TODO: we're assuming the view won't render with a transform
        if (options?.localPosition != null) {
            (view as ITransformView).localPosition = localPosition;
        }

        if (options?.localRotation != null) {
            (view as ITransformView).localRotation = options.localRotation;
        }

        if (options?.label != null) {
            (view as ILabelView).label = options.label;
        }

        if (object instanceof GameObject && !this.noAnimations) {
            if (oldParentInfo?.parent !== parent && RenderContext._animatingViewTypes.has(view.type)) {
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
    
    /**
     * @internal
     */
    renderChild(object: GameObject, parent: Object, childId: number, options?: IDisplayOptions): IView {
        return this._renderChild(object, parent, childId, options);
    }

    /**
     * @internal
     */
    renderInternalChild(object: GameObject, parent: Object, parentView: IView, options?: IDisplayOptions): void {
        this._renderChild(object, parent, parentView, options);
    }
    
    static addVectorComponent(a?: number, b?: number): number | undefined {
        if (a == null && b == null) return undefined;

        return (a ?? 0) + (b ?? 0);
    }

    /**
     * @internal
     */
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

    /**
     * @internal
     */
    renderTextEmbed(value: any): TextEmbedView {
        try {
            switch (typeof value) {
                case "string":
                case "number":
                case "boolean":
                case "bigint":
                    return { label: value.toString() };

                case "function":
                    return this.renderTextEmbed(value());

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
                    
                    return {
                        label: value.toString()
                    };

                default:
                    throw new Error(`Value ${typeof value} isn't embeddable in text.`);
            }
        } catch (e) {
            console.log(e);
            return { 
                label: "ERROR"
            };
        }
    }
}
