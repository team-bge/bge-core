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

/**
 * Base class for all gameplay related objects and containers.
 */
export abstract class GameObject {
    _lastActionIndex: number;

    name?: string;

    /**
     * Builds a view of this object from the perspective of a player.
     * @param ctx Information about where the object is in the scene, and who's viewing it.
     */
    abstract render(ctx: RenderContext): IView;
    
    /**
     * How much space does this object take up on the table.
     */
    abstract get footprint(): Footprint | undefined;
}
