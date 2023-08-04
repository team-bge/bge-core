import { Rotation } from "./rotation.js";
import { Vector3 } from "./vector3.js";

/**
 * @category Geometry
 */
export interface ITransform {
    position?: Vector3;
    rotation?: Rotation;
}
