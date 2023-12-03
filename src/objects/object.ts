import { Color } from "../color.js";
import { RenderContext } from "../display.js";
import { Bounds } from "../math/index.js";
import { IView, ImageView } from "../views.js";

/**
 * Base class for all gameplay related objects and containers.
 * @category Game Objects
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

/**
 * @category Game Objects
 */
export class Face {
    image?: ImageView;
    color?: Color;

    get imageView(): ImageView | null {
        if (this.image == null && this.color == null) {
            return null;
        }

        if (this.color == null) {
            return this.image;
        }

        if (this.image == null) {
            return { url: null, color: this.color.encoded };
        }

        return { ...this.image, color: this.color.encoded };
    }
}
