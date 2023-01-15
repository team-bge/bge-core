import { IDisplayChild, IDisplayOptions, RenderContext } from "./display.js";
import { GameObject } from "./game.js";
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
        let index = 0;

        for (let object of objects) {
            this.add(`${name}[${index}]`, object, {
                localPosition: { x: index * 50 }
            });

            ++index;
        }
    }

    render(ctx: RenderContext, parent: Object): IView[] {
        return ctx.renderChildren(this._children.values(), parent);
    }
}

export class Zone extends GameObject {
    width: number = 10;
    height: number = 10;

    outlineStyle: OutlineStyle = OutlineStyle.Dashed;
    label?: string;

    readonly children = new DisplayContainer();

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
        this.children.render(ctx, this);

        return view;
    }
}
