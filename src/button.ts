import { RenderContext } from "./display.js";
import { ITextEmbeddable } from "./interfaces.js";
import { Footprint, GameObject } from "./object.js";
import { IView, PromptKind, TextEmbedView } from "./views.js";

/**
 * @summary A clickable button that can appear in a message.
 * @description Buttons will automatically be shown to players if used in a Player.prompt.click(button).
 */
export class Button implements ITextEmbeddable {
    
    /**
     * Text displayed on this button.
     */
    readonly label: string;

    /**
     * Create a clickable button that can appear in a message.
     * @param label Text displayed on this button.
     */
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