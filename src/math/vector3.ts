/**
 * @category Geometry
 */
export class Vector3 {
    static readonly ZERO = new Vector3(0, 0, 0);
    static readonly UNIT_X = new Vector3(1, 0, 0);
    static readonly UNIT_Y = new Vector3(0, 1, 0);
    static readonly UNIT_Z = new Vector3(0, 0, 1);
    static readonly ONE = new Vector3(1, 1, 1);

    static min(a: Vector3, b: Vector3): Vector3 {
        return new Vector3(Math.min(a.x, b.x), Math.min(a.y, b.y), Math.min(a.z, b.z));
    }
    
    static max(a: Vector3, b: Vector3): Vector3 {
        return new Vector3(Math.max(a.x, b.x), Math.max(a.y, b.y), Math.max(a.z, b.z));
    }

    static lerp(a: Vector3, b: Vector3, t: number): Vector3 {
        return new Vector3(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, a.z + (b.z - a.z) * t);
    }

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

    get isZero(): boolean {
        return this.x === 0 && this.y === 0 && this.z === 0;
    }

    get length(): number {
        return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
    }
    
    get lengthSquared(): number {
        return this.x * this.x + this.y * this.y + this.z * this.z;
    }

    get abs(): Vector3 {
        return new Vector3(Math.abs(this.x), Math.abs(this.y), Math.abs(this.z));
    }

    constructor(x?: number, y?: number, z?: number);
    constructor(value: { x?: number, y?: number, z?: number });

    constructor(arg0?: { x?: number, y?: number, z?: number } | number, arg1?: number, arg2?: number) {
        if (typeof arg0 === "number") {
            this.x = arg0 ?? 0;
            this.y = arg1 ?? 0;
            this.z = arg2 ?? 0;
        } else {
            this.x = arg0?.x ?? 0;
            this.y = arg0?.y ?? 0;
            this.z = arg0?.z ?? 0;
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

    cross(vector: Vector3): Vector3 {
        return new Vector3(
            this.y * vector.z - this.z * vector.y,
            this.z * vector.x - this.x * vector.z,
            this.x * vector.y - this.y * vector.x
        );
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
