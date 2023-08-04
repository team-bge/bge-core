import { Vector3 } from "./vector3.js";

/**
 * @category Geometry
 */
export class Bounds {
    readonly min: Vector3;
    readonly max: Vector3;

    get center() {
        return this.min.add(this.max).mul(0.5);
    }

    get size() {
        return this.max.sub(this.min);
    }

    constructor(size: Vector3);
    constructor(center: Vector3, size: Vector3);
    constructor(arg0: Vector3, arg1?: Vector3) {
        let center: Vector3, size: Vector3;
        
        if (arg1 === undefined) {
            center = Vector3.ZERO;
            size = arg0;
        } else {
            center = arg0;
            size = arg1;
        }

        this.min = center.sub(size.mul(0.5));
        this.max = this.min.add(size);
    }

    expand(margin: number): Bounds;
    expand(margin: Vector3): Bounds;
    expand(margin: number | Vector3): Bounds {
        if (typeof margin === "number") {
            return new Bounds(this.center, this.size.add(margin * 2));
        } else {
            return new Bounds(this.center, this.size.add(margin.mul(2)));
        }
    }

    offset(value: Vector3): Bounds {
        return new Bounds(this.center.add(value), this.size);
    }
}
