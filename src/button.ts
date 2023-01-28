import { RenderContext } from "./display.js";
import { ITextEmbeddable } from "./interfaces.js";
import { Footprint, GameObject } from "./object.js";
import { IView, PromptKind, TextEmbedView } from "./views.js";

export class Button extends GameObject implements ITextEmbeddable {
    readonly label: string;

    get footprint(): Footprint {
        throw new Error("Method not implemented.");
    }

    constructor(label: string) {
        super();

        this.label = label;
    }

    render(ctx: RenderContext): IView {
        throw new Error("Method not implemented.");
    }

    renderTextEmbed(ctx: RenderContext): TextEmbedView {
        return {
            prompt: ctx.player?.prompt.get(this) ?? { kind: PromptKind.Click, index: -1 },
            label: this.label
        };
    }
}