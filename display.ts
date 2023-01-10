import "reflect-metadata";
import { GameObject, IRenderContext } from "./game";
import { IOutlinedView, IView } from "./views";

export interface IDisplayOptions {
    label?: string;
}

const displayKey = Symbol("display");

export class Display {
    static renderProperties(source: any, ctx: IRenderContext): IView[] {
        const views: IView[] = [];

        for (let key in source) {
            const options: IDisplayOptions = Reflect.getMetadata(displayKey, source, key);
            if (options == null) {
                continue;
            }
            
            const value = source[key];
            if (value == null) {
                continue;
            }

            let view: IView;

            if (value instanceof GameObject) {
                view = value.render(ctx);
            } else {
                throw new Error("Unexpected display value type.");
            }

            if (options.label != null) {
                (view as IOutlinedView).label = options.label;
            }

            views.push(view);
        }

        return views;
    }
}

export function display(options?: IDisplayOptions) : PropertyDecorator {
    return Reflect.metadata(displayKey, options ?? { });
}
