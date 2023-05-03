import { Bounds } from "./bounds.js";
import { Vector3 } from "./vector3.js";

/**
 * Represents a 3D rotation.
 * Use {@link angleAxis}, {@link x}, {@link y}, {@link z}, or {@link euler} to create
 * {@link Rotation}s, and combine them using {@link mul}. Apply a rotation to a {@link Vector3} using
 * {@link rotate}.
 */
export class Rotation {
    /**
     * Describes no rotation.
     */
    static readonly IDENTITY = Rotation.quaternion(1, 0, 0, 0);

    static angleAxis(degrees: number, axis: Vector3): Rotation {
        axis = axis.normal;

        const halfRadians = degrees * Math.PI / 360;

        const cos = Math.cos(halfRadians);
        const sin = Math.sin(halfRadians);

        return new Rotation(cos, sin * axis.x, sin * axis.y, sin * axis.z);
    }

    static x(degrees: number): Rotation {
        const halfRadians = degrees * Math.PI / 360;

        const cos = Math.cos(halfRadians);
        const sin = Math.sin(halfRadians);

        return new Rotation(cos, sin, 0, 0);
    }

    static y(degrees: number): Rotation {
        const halfRadians = degrees * Math.PI / 360;

        const cos = Math.cos(halfRadians);
        const sin = Math.sin(halfRadians);

        return new Rotation(cos, 0, sin, 0);
    }
    
    static z(degrees: number): Rotation {
        const halfRadians = degrees * Math.PI / 360;

        const cos = Math.cos(halfRadians);
        const sin = Math.sin(halfRadians);

        return new Rotation(cos, 0, 0, sin);
    }

    static quaternion(w: number, x: number, y: number, z: number): Rotation {
        return new Rotation(w, x, y, z);
    }
    
    static euler(x: number, y: number, z: number): Rotation {
        const rx = x * Math.PI / 360;
        const ry = y * Math.PI / 360;
        const rz = z * Math.PI / 360;

        const cx = Math.cos(rx);
        const sx = Math.sin(rx);
        const cy = Math.cos(ry);
        const sy = Math.sin(ry);
        const cz = Math.cos(rz);
        const sz = Math.sin(rz);

        return new Rotation(
            cx * cy * cz + sx * sy * sz,
            sx * cy * cz - cx * sy * sz,
            cx * sy * cz + sx * cy * sz,
            cx * cy * sz - sx * sy * cz
        );
    }

    static slerp(a: Rotation, b: Rotation, t: number): Rotation {
        // From https://www.euclideanspace.com/maths/algebra/realNormedAlgebra/quaternions/slerp/index.htm

        // Calculate angle between them.
        const cosHalfTheta = a.w * b.w + a.x * b.x + a.y * b.y + a.z * b.z;

        // if a=b or a=-b then theta = 0 and we can return a
        if (Math.abs(cosHalfTheta) >= 1.0) {
            return a;
        }

        // Calculate temporary values.
        const halfTheta = Math.acos(cosHalfTheta);
        const sinHalfTheta = Math.sqrt(1.0 - cosHalfTheta*cosHalfTheta);

        // if theta = 180 degrees then result is not fully defined
        // we could rotate around any axis normal to a or b
        if (Math.abs(sinHalfTheta) < 0.001) {
            return this.quaternion(
                a.w * 0.5 + b.w * 0.5,
                a.x * 0.5 + b.x * 0.5,
                a.y * 0.5 + b.y * 0.5,
                a.z * 0.5 + b.z * 0.5);
        }

        const ratioA = Math.sin((1 - t) * halfTheta) / sinHalfTheta;
        const ratioB = Math.sin(t * halfTheta) / sinHalfTheta;

        //calculate Quaternion.
        return this.quaternion(
            a.w * ratioA + b.w * ratioB,
            a.x * ratioA + b.x * ratioB,
            a.y * ratioA + b.y * ratioB,
            a.z * ratioA + b.z * ratioB);
    }

    private readonly w: number;
    private readonly x: number;
    private readonly y: number;
    private readonly z: number;

    private constructor(w: number, x: number, y: number, z: number) {
        this.w = w;
        this.x = x;
        this.y = y;
        this.z = z;
    }

    get isIdentity(): boolean {
        return this.w === 1 && this.x === 0 && this.y === 0 && this.z === 0;
    }

    get inverse() {
        return new Rotation(this.w, -this.x, -this.y, -this.z);
    }

    get quaternion(): { w: number, x: number, y: number, z: number } {
        return { w: this.w, x: this.x, y: this.y, z: this.z };
    }

    get euler(): { x: number, y: number, z: number } {
        const sinr_cosp = 2 * (this.w * this.x + this.y * this.z);
        const cosr_cosp = 1 - 2 * (this.x * this.x + this.y * this.y);

        const sinp = Math.sqrt(1 + 2 * (this.w * this.y - this.x * this.z));
        const cosp = Math.sqrt(1 - 2 * (this.w * this.y - this.x * this.z));

        const siny_cosp = 2 * (this.w * this.z + this.x * this.y);
        const cosy_cosp = 1 - 2 * (this.y * this.y + this.z * this.z);

        const radToDeg = 180 / Math.PI;

        return {
            x: radToDeg * Math.atan2(sinr_cosp, cosr_cosp),
            y: radToDeg * 2 * Math.atan2(sinp, cosp) - 90,
            z: -radToDeg * Math.atan2(siny_cosp, cosy_cosp)
        };
    }

    mul(rotation: Rotation): Rotation {
        return new Rotation(
            this.w * rotation.w - this.x * rotation.x - this.y * rotation.y - this.z * rotation.z,
            this.w * rotation.x + this.x * rotation.w + this.y * rotation.z - this.z * rotation.y,
            this.w * rotation.y - this.x * rotation.z + this.y * rotation.w + this.z * rotation.x,
            this.w * rotation.z + this.x * rotation.y - this.y * rotation.x + this.z * rotation.w);
    }

    rotate(bounds: Bounds): Bounds;
    rotate(vector: Vector3): Vector3;
    
    rotate(target: Bounds | Vector3): Bounds | Vector3 {
        if (target instanceof Bounds) {
            const sizeX = this.rotate(new Vector3(target.size.x, 0, 0)).abs;
            const sizeY = this.rotate(new Vector3(0, target.size.y, 0)).abs;
            const sizeZ = this.rotate(new Vector3(0, 0, target.size.z)).abs;

            const rotatedSize = sizeX.add(sizeY).add(sizeZ);

            return new Bounds(target.center, rotatedSize);
        } else {
            const r = new Vector3(this.x, this.y, this.z);
            return target.add(r.mul(2).cross(r.cross(target).add(target.mul(this.w))));
        }
    }
}
