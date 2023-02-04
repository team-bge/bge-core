import { RenderContext } from "./display.js";
import { DisplayContainer } from "./displaycontainer.js";
import { Footprint, GameObject } from "./object.js";
import { IView, OutlineStyle, ViewType, ZoneView } from "./views.js";

export class Zone extends GameObject {
    width: number;
    height: number;

    outlineStyle: OutlineStyle = OutlineStyle.Dashed;
    label?: string;

    readonly children = new DisplayContainer();

    override get footprint(): Footprint {
        return {
            width: this.width + 3,
            height: this.height + 3
        };
    }
    
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
