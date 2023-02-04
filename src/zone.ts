import { RenderContext } from "./display.js";
import { DisplayContainer } from "./displaycontainer.js";
import { Footprint, GameObject } from "./object.js";
import { IView, OutlineStyle, ViewType, ZoneView } from "./views.js";

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
    outlineStyle: OutlineStyle = OutlineStyle.Dashed;

    /**
     * Optional label text to describe this zone to players.
     */
    label?: string;

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

    render(ctx: RenderContext): IView {
        const view: ZoneView = {
            type: ViewType.Zone,
            
            prompt: ctx.player?.prompt.get(this),

            width: this.width,
            height: this.height,

            outlineStyle: this.outlineStyle,
            label: this.label,

            children: []
        };

        ctx.setParentView(this, view);

        this.children.render(ctx, this, view.children);

        return view;
    }
}
