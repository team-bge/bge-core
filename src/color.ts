export class Color {
    static readonly TRANSPARENT = new Color(0, 0, 0, 0);
    static readonly BLACK = new Color(0, 0, 0);
    static readonly WHITE = new Color(1, 1, 1);

    static parse(hex: string) {
        if (hex.startsWith("#")) {
            hex = hex.substring(1);
        }

        if (hex.match(/^[0-9a-f]{3,8}$/i)) {
            switch (hex.length) {
                case 3: {
                    const r = parseInt(hex.charAt(0), 16) / 15.0;
                    const g = parseInt(hex.charAt(1), 16) / 15.0;
                    const b = parseInt(hex.charAt(2), 16) / 15.0;
                    return new Color(r, g, b);
                }
                case 4: {
                    const r = parseInt(hex.charAt(0), 16) / 15.0;
                    const g = parseInt(hex.charAt(1), 16) / 15.0;
                    const b = parseInt(hex.charAt(2), 16) / 15.0;
                    const a = parseInt(hex.charAt(3), 16) / 15.0;
                    return new Color(r, g, b, a);
                }
                case 6: {
                    const r = parseInt(hex.substring(0, 2), 16) / 255.0;
                    const g = parseInt(hex.substring(2, 4), 16) / 255.0;
                    const b = parseInt(hex.substring(4, 6), 16) / 255.0;
                    return new Color(r, g, b);
                }
                case 8: {
                    const r = parseInt(hex.substring(0, 2), 16) / 255.0;
                    const g = parseInt(hex.substring(2, 4), 16) / 255.0;
                    const b = parseInt(hex.substring(4, 6), 16) / 255.0;
                    const a = parseInt(hex.substring(6, 8), 16) / 255.0;
                    return new Color(r, g, b, a);
                }
            }
        }

        throw new Error("Expected a hex string of the form RGB, RRGGBB, RGBA, or RRGGBBAA");
    }

    readonly r: number;
    readonly g: number;
    readonly b: number;
    readonly a: number;

    constructor(r: number, g: number, b: number, a?: number);
    constructor(value: { r?: number, g?: number, b?: number, a?: number });
    constructor(arg0: number | { r?: number, g?: number, b?: number, a?: number }, g?: number, b?: number, a?: number) {
        if (typeof arg0 === "number") {
            this.r = arg0;
            this.g = g;
            this.b = b;
            this.a = a ?? 1;
        } else {
            this.r = arg0.r ?? 0;
            this.g = arg0.g ?? 0;
            this.b = arg0.b ?? 0;
            this.a = arg0.a ?? 1;
        }
    }

    get encoded() {
        return {
            r: Math.floor(this.r * 255),
            g: Math.floor(this.g * 255),
            b: Math.floor(this.b * 255),
            a: Math.floor(this.a * 255)
        };
    }
}
