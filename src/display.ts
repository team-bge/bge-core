import "reflect-metadata";
import { Arrangement, LinearArrangement } from "./arrangement.js";
import { Color } from "./color.js";

import { IGame, ITextEmbeddable } from "./interfaces.js";
import { Rotation, Vector3 } from "./math/index.js";
import { GameObject } from "./objects/object.js";
import { Player } from "./player.js";
import { ILabelView, ITransformView, IView, Origin, TextEmbedView, ViewType } from "./views.js";

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
    hiddenFor?: readonly Player[];

    /**
     * Set of players for which the identity of this object is revealed. Opposite of {@link hiddenFor}.
     * Defaults to everyone, unless {@link hiddenFor} is given.
     */
    revealedFor?: readonly Player[];

    /**
     * Set of players for which this object is fully invisible. Opposite of {@link visibleFor}.
     */
    invisibleFor?: readonly Player[]
    
    /**
     * Set of players for which this object is visible. Opposite of {@link invisibleFor}.
     * Defaults to everyone, unless {@link invisibleFor} is given.
     */
    visibleFor?: readonly Player[]

    /**
     * Offset in centimeters, relative to the parent transform.
     */
    position?: Vector3 | { x?: number, y?: number, z?: number };

    /**
     * Euler angles in degrees, relative to the parent rotation.
     */
    rotation?: Rotation | number;

    /**
     * For displaying an array of objects, strategy to use when arranging. Defaults to {@link Arrangement.Auto}.
     */
    arrangement?: Arrangement;

    /**
     * For displaying an array of objects, either a single {@link IDisplayOptions} that will 
     * be used with every child object, or an array containing separate options for each child.
     */
    childOptions?: IDisplayOptions | IDisplayOptions[];

    /**
     * For displayed text, specifies a color to use. Defaults to white.
     */
    fontColor?: Color;

    /**
     * For displayed text, specifies a font scale to apply. Defaults to 1.
     */
    fontScale?: number
}

export type DisplayParent = GameObject | IGame;
export type DisplayChild = GameObject | { (): string | number };

interface IParentInfo {
    parent: DisplayParent;
    childId?: number;
    localPosition?: Vector3;
    localRotation?: Rotation;
};

/**
 * @internal
 */
export type ParentMap = Map<DisplayChild, IParentInfo>;

interface IParentChildIndices {
    nextChildIndex: number;
    prev?: Map<DisplayChild, number>;
    next: Map<DisplayChild, number>;
}

export class ChildIndexMap {
    private readonly _map = new Map<DisplayParent, IParentChildIndices>();

    get(parent: DisplayParent, child: DisplayChild): number {
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
    private static readonly DEFAULT_ARRANGEMENT = new LinearArrangement({
        axis: "x"
    });

    private static readonly ANIMATING_VIEW_TYPES = new Set<ViewType>([
        ViewType.CARD,
        ViewType.TOKEN
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

    readonly oldParentMap: ParentMap;

    readonly oldParents: Set<DisplayParent>;

    private readonly _parentViews: Map<DisplayParent, IView>;
    private readonly _parentIds: Map<DisplayParent, number>;

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

        this.oldParentMap = oldParentMap ?? new Map();
        this.oldParents = new Set([...this.oldParentMap.values()].map(x => x.parent));
        this.newParentMap = new Map();

        this._parentViews = new Map();
        this._parentIds = new Map();

        this._origins = [];

        this._isHidden = false;
    }

    /**
     * @internal
     */
    getParentId(parent: DisplayParent): number {
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
    setParentView(parent: DisplayParent, view: IView): void {
        this._parentViews.set(parent, view);
    }

    private _renderChild(child: DisplayChild, value: GameObject | number | string, parent: DisplayParent, isInternal: boolean, options?: IDisplayOptions): IView {
        let view: IView;
        let oldParentInfo: IParentInfo;

        let localPosition = options?.position == null ? Vector3.ZERO : new Vector3(options.position);

        if (value instanceof GameObject && value.localBounds != null) {
            localPosition = localPosition.sub(new Vector3(0, 0, value.localBounds.min.z));
        }
        
        const childId = isInternal ? undefined : this.childIndexMap.get(parent, child);

        if (value instanceof GameObject) {
            oldParentInfo = this.oldParentMap.get(value);
            this.newParentMap.set(value, {
                parent: parent,
                childId: childId,
                localPosition: localPosition,
                localRotation: RenderContext.asRotation(options?.rotation)
            });
            
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
                view = value.render(this);
            } catch (e) {
                console.error(e);
            } finally {
                this._isHidden = wasHidden;
            }
        } else {
            view = {
                type: ViewType.TEXT,
                format: value.toString(),
                color: options.fontColor?.encoded,
                scale: options.fontScale
            };
        }

        if (view == null) {
            return null;
        }

        if (localPosition != null) {
            (view as ITransformView).localPosition = localPosition;
        }

        if (options?.rotation != null) {
            (view as ITransformView).localRotation = RenderContext.asRotation(options.rotation).euler;
        }

        if (options?.label != null) {
            (view as ILabelView).label = options.label;
        }

        if (value instanceof GameObject && !this.noAnimations) {
            if (oldParentInfo?.parent !== parent && RenderContext.ANIMATING_VIEW_TYPES.has(view.type)) {
                view.origin = {
                    containerId: oldParentInfo == null ? undefined : this.getParentId(oldParentInfo.parent),
                    childId: oldParentInfo?.childId,
                    localPosition: oldParentInfo == null ? { z: 100 } : oldParentInfo?.localPosition,
                    localRotation: oldParentInfo == null ? { x: Math.random() * 360, y: Math.random() * 360, z: Math.random() * 360 } : oldParentInfo?.localRotation?.euler
                };

                this._origins.push([value._lastActionIndex, view.origin]);
            }
        }

        view.childId = childId;
        return view;
    }
    
    /**
     * @internal
     */
    renderChild(child: DisplayChild, parent: DisplayParent, options?: IDisplayOptions): IView;
    renderChild(child: { (): string | number | GameObject | Iterable<GameObject> }, parent: DisplayParent, options?: IDisplayOptions): IView[];

    renderChild(child: DisplayChild | { (): string | number | GameObject | Iterable<GameObject> }, parent: DisplayParent, options?: IDisplayOptions): IView | IView[] {
        const value = typeof child === "function"
            ? child()
            : child;

        if (value == null) {
            return;
        }

        if (typeof value === "string" || typeof value === "number" || value instanceof GameObject) {
            return this._renderChild(child as DisplayChild, value, parent, false, options);
        } else {
            const arrangement = options?.arrangement ?? RenderContext.DEFAULT_ARRANGEMENT;
            const objects = [...value];
            const transforms = arrangement.generate(objects.map(x => x.localBounds));

            const views: IView[] = [];

            for (let i = 0; i < objects.length; ++i) {
                const childOptions = Array.isArray(options?.childOptions)
                    ? options.childOptions[i]
                    : options?.childOptions;

                const transform = transforms[i];
                const localOptions = RenderContext.transformOptions(transform.position, transform.rotation, childOptions);

                views.push(this.renderChild(objects[i], parent, RenderContext.combineOptions(options, localOptions)))
            }

            return views;
        }
    }

    /**
     * @internal
     */
    renderInternalChild(object: GameObject, parent: DisplayParent, parentView: IView, options?: IDisplayOptions): void {
        const view = this._renderChild(object, object, parent, true, options);

        if (view != null) {
            parentView.tempChildren ??= [];
            parentView.tempChildren.push(view);
        }
    }
    
    static asRotation(value?: Rotation | number): Rotation | null {
        if (value == null) {
            return null;
        } else if (value instanceof Rotation) {
            return value;
        } else {
            return Rotation.z(value);
        }
    }

    static asVector(value?: Vector3 | { x?: number, y?: number, z?: number }): Vector3 | null {
        if (value == null) {
            return null;
        } else if (value instanceof Vector3) {
            return value;
        } else {
            return new Vector3(value);
        }
    }
    
    static combineOptions(a?: IDisplayOptions, b?: IDisplayOptions): IDisplayOptions {
        if (a == null) {
            return b ?? {};
        }

        if (b == null) {
            return a ?? {};
        }

        const result = RenderContext.transformOptions(
            RenderContext.asVector(a.position),
            RenderContext.asRotation(a.rotation), b);

        // TODO: merge hiddenFor / revealedFor / invisibleFor / visibleFor

        return result;
    }

    static transformOptions(position?: Vector3, rotation?: Rotation, options?: IDisplayOptions): IDisplayOptions {
        if (options == null) {
            return {
                position: position,
                rotation: rotation
            };
        }

        const result = { ...options };

        if (rotation != null) {
            if (result.position != null) {
                result.position = rotation.rotate(RenderContext.asVector(result.position));
            }

            if (result.rotation != null) {
                result.rotation = rotation.mul(RenderContext.asRotation(result.rotation));
            } else {
                result.rotation = rotation;
            }
        }

        if (position != null) {
            if (result.position != null) {
                result.position = position.add(RenderContext.asVector(result.position));
            } else {
                result.position = position;
            }
        }

        return result;
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
