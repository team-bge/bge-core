import { RenderContext } from "./display.js";
import { ITextEmbeddable } from "./interfaces.js";
import { Footprint, GameObject } from "./object.js";
import { IView, PromptKind, TextEmbedView } from "./views.js";

export class Button implements ITextEmbeddable {
    readonly label: string;

    get footprint(): Footprint {
        throw new Error("Method not implemented.");
    }

    constructor(label: string) {
        this.label = label;
    }
    
    renderTextEmbed(ctx: RenderContext): TextEmbedView {
        return {
            prompt: ctx.player?.prompt.get(this) ?? { kind: PromptKind.Click, index: -1 },
            label: this.label
        };
    }
}