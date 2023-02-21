export class Vector2 {
    readonly x: number;
    readonly y: number;

    constructor(x?: number, y?: number) {
        this.x = x ?? 0;
        this.y = y ?? 0;
    }
}

export class Vector3 {
    static readonly ZERO = new Vector3(0, 0, 0);
    static readonly UNIT_X = new Vector3(1, 0, 0);
    static readonly UNIT_Y = new Vector3(0, 1, 0);
    static readonly UNIT_Z = new Vector3(0, 0, 1);
    static readonly ONE = new Vector3(1, 1, 1);

    readonly x: number;
    readonly y: number;
    readonly z: number;

    get normal(): Vector3 {
        const length = this.length;
        
        if (length <= Number.EPSILON) {
            throw new Error("Attempted to get the normal of a zero vector");
        }

        return this.div(this.length);
    }

    get length(): number {
        return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
    }
    
    get lengthSquared(): number {
        return this.x * this.x + this.y * this.y + this.z * this.z;
    }

    constructor(xy: Vector2, z?: number);
    constructor(x?: number, y?: number, z?: number);

    constructor(arg0: Vector2 | number, arg1?: number, arg2?: number) {
        if (arg0 instanceof Vector2) {
            this.x = arg0.x;
            this.y = arg0.y;
            this.z = arg1 ?? 0;
        } else {
            this.x = arg0 ?? 0;
            this.y = arg1 ?? 0;
            this.z = arg2 ?? 0;
        }
    }

    withX(x: number): Vector3 {
        return new Vector3(x, this.y, this.z);
    }

    withY(y: number): Vector3 {
        return new Vector3(this.x, y, this.z);
    }

    withZ(z: number): Vector3 {
        return new Vector3(this.x, this.y, z);
    }

    add(scalar: number): Vector3;
    add(vector: Vector3): Vector3;
    add(other: Vector3 | number): Vector3 {
        if (typeof other === "number") {
            return new Vector3(this.x + other, this.y + other, this.z + other);
        } else {
            return new Vector3(this.x + other.x, this.y + other.y, this.z + other.z);
        }
    }

    sub(scalar: number): Vector3;
    sub(vector: Vector3): Vector3;
    sub(other: Vector3 | number): Vector3 {
        if (typeof other === "number") {
            return new Vector3(this.x - other, this.y - other, this.z - other);
        } else {
            return new Vector3(this.x - other.x, this.y - other.y, this.z - other.z);
        }
    }

    mul(scalar: number): Vector3;
    mul(vector: Vector3): Vector3;
    mul(other: Vector3 | number): Vector3 {
        if (typeof other === "number") {
            return new Vector3(this.x * other, this.y * other, this.z * other);
        } else {
            return new Vector3(this.x * other.x, this.y * other.y, this.z * other.z);
        }
    }

    dot(vector: Vector3): number {
        return this.x * vector.x + this.y * vector.y + this.z * vector.z;
    }

    div(scalar: number): Vector3;
    div(vector: Vector3): Vector3;
    div(other: Vector3 | number): Vector3 {
        if (typeof other === "number") {
            return new Vector3(this.x / other, this.y / other, this.z / other);
        } else {
            return new Vector3(this.x / other.x, this.y / other.y, this.z / other.z);
        }
    }

    equals(vector: Vector3, epsilon: number = Number.EPSILON) {
        return Math.abs(this.x - vector.x) <= epsilon
            && Math.abs(this.y - vector.y) <= epsilon
            && Math.abs(this.z - vector.z) <= epsilon;
    }
}

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
