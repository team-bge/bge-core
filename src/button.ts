import { RenderContext } from "./display.js";
import { ITextEmbeddable } from "./interfaces.js";
import { PromptKind, TextEmbedView } from "./views.js";

/**
 * A clickable button that can appear in a message. Buttons will automatically be shown to
 * players if used in a Player.prompt.click(button).
 * @category Messages
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
            prompt: ctx.player?.prompt.get(this) ?? { kind: PromptKind.CLICK, index: -1 },
            label: this.label
        };
    }
}

/**
 * @category Messages
 */
export class TextInput implements ITextEmbeddable {
    readonly label: string;

    constructor(label: string) {
        this.label = label;
    }

    renderTextEmbed(ctx: RenderContext): TextEmbedView {
        return {
            prompt: ctx.player?.prompt.get(this) ?? { kind: PromptKind.TEXT_INPUT, index: -1 },
            label: this.label
        };
    }
}