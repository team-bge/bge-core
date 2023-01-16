import { IDisplayChild, IDisplayOptions, RenderContext } from "./display.js";
import { Footprint, GameObject } from "./object.js";
import { IView, OutlineStyle, ViewType, ZoneView } from "./views.js";

export enum Arrangement {
    Radial,
    Linear
}

export class DisplayContainer {
    private _nextChildId = 0x10000;
    private readonly _children = new Map<string, IDisplayChild>();

    add(name: string, object: GameObject, options?: IDisplayOptions): void {
        if (this._children.has(name)) {
            throw new Error("A child already exists with that name");
        }

        this._children.set(name, {
            object: object,
            childId: this._nextChildId++,
            options: options ?? { }
        });
    }

    addRange(name: string, objects: GameObject[], options?: IDisplayOptions, arrangement: Arrangement = Arrangement.Linear): void {
        const footprints = objects.map(x => x.footprint ?? { width: 0, height: 0 });

        const maxFootprint: Footprint = {
            width: Math.max(...footprints.map(x => x.width)),
            height: Math.max(...footprints.map(x => x.height))
        };

        const deltaTheta = 2 * Math.PI / objects.length;
        const dist = maxFootprint.width / (2 * Math.tan(deltaTheta * 0.5));

        let index = 0;
        let theta = Math.PI;
        for (let object of objects) {
            const footprint = object.footprint;
            const r = dist + footprint.height * 0.5;

            this.add(`${name}[${index}]`, object, {
                localPosition: { x: Math.sin(theta) * r, z: Math.cos(theta) * r },
                localRotation: { y: theta * 180 / Math.PI + 180 }
            });

            ++index;
            theta += deltaTheta;
        }
    }

    render(ctx: RenderContext, parent: Object, views?: IView[]): IView[] {
        return ctx.renderChildren(this._children.values(), parent, views);
    }
}

export class Zone extends GameObject {
    width: number = 10;
    height: number = 10;

    outlineStyle: OutlineStyle = OutlineStyle.Dashed;
    label?: string;

    readonly children = new DisplayContainer();

    override get footprint(): Footprint {
        return {
            width: this.width + 2,
            height: this.height + 2
        };
    }

    render(ctx: RenderContext): IView {
        const view: ZoneView = {
            type: ViewType.Zone,

            width: this.width,
            height: this.height,

            outlineStyle: this.outlineStyle,
            label: this.label,

            children: []
        };

        ctx.setParentView(this, view);

        ctx.renderProperties(this, view.children);
        this.children.render(ctx, this, view.children);

        return view;
    }
}
