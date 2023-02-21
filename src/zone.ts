import { RenderContext } from "./display.js";
import { DisplayContainer } from "./displaycontainer.js";
import { Footprint, GameObject } from "./object.js";
import { Color, IView, OutlineStyle, ViewType, ZoneView } from "./views.js";

/**
 * @summary Represents a rectangular region on the table, with an outline and optional label.
 * @description Child objects can be dynamically added or removed with `Zone.children`, or in
 * a deriving class with `@display()` annotated properties.
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
    outlineStyle: OutlineStyle = OutlineStyle.Solid;

    /**
     * Appearance of the outline around this zone when it is the target of a prompt.
     */
    promptOutlineStyle: OutlineStyle = OutlineStyle.SolidFilled;

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
     * @summary Contains child objects that are displayed inside this zone.
     * @description This will also contain objects from `@display()` annotated properties,
     * using the property keys as names.
     */
    readonly children = new DisplayContainer();

    override get footprint(): Footprint {
        return {
            width: this.width + 3,
            height: this.height + 3
        };
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
            type: ViewType.Zone,
            
            prompt: prompt,

            width: this.width,
            height: this.height,

            outlineStyle: prompt != null ? this.promptOutlineStyle : this.outlineStyle,
            outlineColor: this.outlineColor,
            
            label: this.label,

            children: []
        };

        ctx.setParentView(this, view);

        this.children.render(ctx, this, view.children);

        if (this.hideIfEmpty
            && view.children.length === 0
            && (view.tempChildren?.length ?? 0) === 0
            && view.prompt == null) {
            return null;
        }

        return view;
    }
}
