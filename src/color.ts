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

    static fromHsv(h: number, s: number, v: number): Color {
        h -= Math.floor(h / 360) * 360;
        s = Math.max(0, Math.min(s, 1));
        v = Math.max(0, Math.min(v, 1));

        const c = v * s;
        const x = c * (1 - Math.abs((h / 60) % 2 - 1));
        const m = v - c;
    
        let r: number, g: number, b: number;
    
        switch (Math.floor(h / 60)) {
            case 0:
                [r, g, b] = [c, x, 0];
                break;
            case 1:
                [r, g, b] = [x, c, 0];
                break;
            case 2:
                [r, g, b] = [0, c, x];
                break;
            case 3:
                [r, g, b] = [0, x, c];
                break;
            case 4:
                [r, g, b] = [x, 0, c];
                break;
            case 5:
                [r, g, b] = [c, 0, x];
                break;
        }
    
        return new Color(r + m, g + m, b + m);
    }

    readonly r: number;
    readonly g: number;
    readonly b: number;
    readonly a: number;

    get hsv(): [h: number, s: number, v: number] {
        const cMax = Math.max(this.r, this.g, this.b);
        const cMin = Math.min(this.r, this.g, this.b);

        const delta = cMax - cMin;

        let hue = delta === 0 ? 0
            : cMax === this.r ? 60 * ((this.g - this.b) / delta)
                : cMax === this.g ? 60 * ((this.b - this.r) / delta + 2)
                    : 60 * ((this.r - this.g) / delta + 4);

        if (hue < 0) {
            hue += 360;
        }

        const sat = cMax === 0 ? 0 : delta / cMax;

        return [hue, sat, cMax];
    }

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

    saturate(amount: number): Color {
        amount = Math.max(0, Math.min(amount, 1));

        const [h, s, v] = this.hsv;

        return Color.fromHsv(h, s + (1 - s) * amount, v);
    }

    lighten(amount: number): Color {
        amount = Math.max(0, Math.min(amount, 1));

        const [h, s, v] = this.hsv;

        return Color.fromHsv(h, s, v + (1 - v) * amount);
    }
}
