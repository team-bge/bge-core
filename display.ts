import "reflect-metadata";
import { GameObject, IRenderContext } from "./game";
import { IOutlinedView, ITransformView, IView, Vector3 } from "./views";

export interface IDisplayOptions {
    label?: string;
    offset?: Vector3
}

const displayKey = Symbol("display");

export class Display {
    static addVectorComponent(a?: number, b?: number): number | undefined {
        if (a == null && b == null) return undefined;

        return (a ?? 0) + (b ?? 0);
    }

    static renderProperties(source: any, ctx: IRenderContext): IView[] {
        const views: IView[] = [];
        let nextId = 0;

        for (let key in source) {
            const options: IDisplayOptions = Reflect.getMetadata(displayKey, source, key);
            if (options == null) {
                continue;
            }

            ++nextId;
            
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

            if (options.offset != null) {
                const transformView = view as ITransformView;

                if (transformView.localPosition == null) {
                    transformView.localPosition = options.offset;
                } else {
                    transformView.localPosition.x = Display.addVectorComponent(transformView.localPosition.x, options.offset.x);
                    transformView.localPosition.y = Display.addVectorComponent(transformView.localPosition.y, options.offset.y);
                    transformView.localPosition.z = Display.addVectorComponent(transformView.localPosition.z, options.offset.z);
                }
            }
            
            view.childId = nextId;

            views.push(view);
        }

        return views;
    }
}

export function display(options?: IDisplayOptions) : PropertyDecorator {
    return Reflect.metadata(displayKey, options ?? { });
}
