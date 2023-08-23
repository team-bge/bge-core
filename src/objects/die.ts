import { Color } from "../color.js";
import { delay } from "../delay.js";
import { RenderContext } from "../display.js";
import { Bounds, Rotation, Vector3 } from "../math/index.js";
import { random } from "../random.js";
import { DieView, ViewType } from "../views.js";
import { GameObject } from "./object.js";

/**
 * Optional configuration for a {@link Die}
 * @category Objects
 */
export interface IDieOptions<T = number> {
    name?: string;

    /**
     * Width of the die, in centimeters.
     * Defaults to 1.6cm.
     */
    scale?: number;

    /**
     * Main color of the die.
     */
    color?: Color;

    /**
     * Color of engravings on each face of the die.
     */
    pipColor?: Color;

    faces?: IDieFace<T>[];
}

export interface IDieFace<T> {
    name?: string;
    value: T;
    rotation: Rotation;
}

/**
 * A fair multi-faced die. For now, only 6 faced.
 * @category Objects
 */
export class Die<T = number> extends GameObject {
    static readonly DEFAULT_ROTATIONS_6: readonly Rotation[] = [
        Rotation.x(-90),
        Rotation.y(90),
        Rotation.x(180),
        Rotation.IDENTITY,
        Rotation.y(-90),
        Rotation.x(90)
    ];

    static readonly DEFAULT_FACES_6: readonly IDieFace<number>[] = [
        {
            name: "One",
            value: 1,
            rotation: Die.DEFAULT_ROTATIONS_6[0]
        },
        {
            name: "Two",
            value: 2,
            rotation: Die.DEFAULT_ROTATIONS_6[1]
        },
        {
            name: "Three",
            value: 3,
            rotation: Die.DEFAULT_ROTATIONS_6[2]
        },
        {
            name: "Four",
            value: 4,
            rotation: Die.DEFAULT_ROTATIONS_6[3]
        },
        {
            name: "Five",
            value: 5,
            rotation: Die.DEFAULT_ROTATIONS_6[4]
        },
        {
            name: "Six",
            value: 6,
            rotation: Die.DEFAULT_ROTATIONS_6[5]
        }
    ];

    readonly faces: readonly IDieFace<T>[];
    readonly scale: number;
    readonly color: Color;
    readonly pipColor: Color;

    private _isRolling = false;
    private _faceIndex = 0;

    get isRolling() {
        return this._isRolling;
    }

    get faceIndex(): number {
        return this.isRolling ? undefined : this._faceIndex;
    }

    get face(): IDieFace<T> | undefined {
        return this.isRolling ? undefined : this.faces[this._faceIndex];
    }

    get value(): T | undefined {
        return this.isRolling ? undefined : this.face.value;
    }

    set value(val: T) {
        if (this.isRolling) {
            throw new Error("Can't set Die value while rolling");
        }

        const index = this.faces.findIndex(x => x.value === val);
        if (index === -1) {
            throw new Error("Unknown Die value");
        }

        this._faceIndex = index;
    }

    constructor(options?: IDieOptions<T>) {
        super();

        this.name = options?.name ?? "Die";
        this.hiddenName = "Die";
        this.faces = options?.faces ?? (Die.DEFAULT_FACES_6 as readonly IDieFace<T>[]);
        this.scale = options?.scale ?? 1.6;
        this.color = options?.color ?? Color.WHITE;
        this.pipColor = options?.pipColor ?? Color.BLACK;
    }

    async roll(duration: number = 1): Promise<IDieFace<T>> {
        this.startRolling();
        await delay.seconds(duration);
        return this.stopRolling();
    }

    startRolling(): void {
        if (this.isRolling) {
            throw new Error("Die is already rolling");
        }

        this._isRolling = true;
    }

    stopRolling(): IDieFace<T> {
        if (!this.isRolling) {
            throw new Error("Die isn't rolling yet");
        }

        this._isRolling = false;
        this._faceIndex = random.int(this.faces.length);

        return this.face;
    }
    
    override get localBounds(): Bounds {
        return new Bounds(new Vector3(this.scale, this.scale, this.scale));
    }
    
    override render(ctx: RenderContext): DieView {
        return {
            type: ViewType.DIE,
            
            name: ctx.isHidden
                ? this.hiddenName
                : `${this.name} (${this.isRolling ? "Rolling" : this.face.name ?? this.value})`,

            prompt: ctx.player?.prompt.get(this),

            scale: this.scale,
            color: this.color.encoded,
            pipColor: this.pipColor.encoded,
            
            targetRotation: ctx.isHidden
                ? this.faces[0].rotation.euler
                : this.isRolling ? null : this.face.rotation.euler
        };
    }
}
