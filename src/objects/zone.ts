import { RenderContext } from "../display.js";
import { DisplayContainer } from "../displaycontainer.js";
import { Bounds, Vector3 } from "../math/index.js";
import { GameObject } from "./object.js";
import { IView, OutlineStyle, ViewType, ZoneView } from "../views.js";
import { Color } from "../color.js";
import { display } from "../displaycontainer.js";

/**
 * Represents a rectangular region on the table, with an outline and optional label.
 * Child objects can be dynamically added or removed with {@link Zone.children}, or in
 * a deriving class with {@link display} annotated properties.
 * @category Game Objects
 */
export class Zone extends GameObject {
    /**
     * Width of the zone in centimeters.
     */
    width: number;

    /**
     * Height of the zone in centimeters.
     */
    height: number;

    /**
     * Appearance of the outline around this zone.
     */
    outlineStyle: OutlineStyle = OutlineStyle.SOLID;

    /**
     * Appearance of the outline around this zone when it is the target of a prompt.
     */
    promptOutlineStyle: OutlineStyle = OutlineStyle.SOLID_FILLED;

    /**
     * Optional color of the outline around this zone. Defaults to white.
     */
    outlineColor?: Color;

    /**
     * Optional label text to describe this zone to players.
     */
    label?: string;

    /**
     * If true, this zone will only be displayed if it contains visible children, or
     * is the target of a prompt for the viewing player.
     */
    hideIfEmpty = false;

    /**
     * How much to expand the {@link localBounds} by.
     */
    margin = 1.5;

    /**
     * Contains child objects that are displayed inside this zone.
     * This will also contain objects from {@link display} annotated properties,
     * using the property keys as names.
     */
    readonly children = new DisplayContainer();

    override get localBounds(): Bounds {
        return new Bounds(new Vector3(this.width + this.margin * 2, this.height + this.margin * 2, 0));
    }
    
    /**
     * Represents a rectangular region on the table, with an outline and optional label.
     * @param width Width of the zone in centimeters.
     * @param height Height of the zone in centimeters.
     */
    constructor(width = 10, height = 10) {
        super();

        this.children.addProperties(this);

        this.width = width;
        this.height = height;
    }

    override render(ctx: RenderContext): IView {
        const prompt = ctx.player?.prompt.get(this);

        const view: ZoneView = {
            type: ViewType.ZONE,
            
            name: ctx.isHidden ? this.hiddenName : this.name,
            
            prompt: prompt,

            width: this.width,
            height: this.height,

            outlineStyle: prompt != null ? this.promptOutlineStyle : this.outlineStyle,
            outlineColor: this.outlineColor?.encoded,
            
            label: this.label,

            children: []
        };

        ctx.setParentView(this, view);

        this.children.render(ctx, this, view.children);

        if (this.hideIfEmpty
            && view.outlineStyle === OutlineStyle.NONE
            && view.children.length === 0
            && (view.tempChildren?.length ?? 0) === 0
            && view.prompt == null
            && !ctx.oldParents.has(this)) {
            return null;
        }

        return view;
    }
}
