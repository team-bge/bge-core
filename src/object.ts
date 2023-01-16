import { RenderContext } from "./display.js";
import { IView } from "./views.js";

/**
 * Describes how much space something takes up on the table,
 * represented as a 2D box with a width and height.
 */
export interface Footprint {
    /**
     * Size along the X-axis.
     */
    width: number;

    /**
     * Size along the Z-axis.
     */
    height: number;
}

export abstract class GameObject {
    _lastActionIndex: number;
    abstract render(ctx: RenderContext): IView;
    abstract get footprint(): Footprint | undefined;
}
