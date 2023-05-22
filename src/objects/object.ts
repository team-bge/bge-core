import { RenderContext } from "../display.js";
import { Bounds } from "../math/index.js";
import { IView } from "../views.js";

/**
 * Base class for all gameplay related objects and containers.
 */
export abstract class GameObject {
    _lastActionIndex: number;

    /**
     * Optional display name for this object.
     */
    name?: string;
    
    /**
     * Optional display name for this object when hidden.
     */
    hiddenName?: string;

    /**
     * Builds a view of this object from the perspective of a player.
     * @param ctx Information about where the object is in the scene, and who's viewing it.
     */
    abstract render(ctx: RenderContext): IView;
    
    /**
     * How much space does this object take up.
     */
    get localBounds(): Bounds | undefined {
        return undefined;
    }
}
