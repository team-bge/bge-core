export * from "./arrangement.js";
export * from "./button.js";
export * from "./color.js";
export * from "./delay.js";
export * from "./display.js";
export * from "./displaycontainer.js";
export * from "./game.js";
export * from "./helpers.js";
export * from "./image.js";
export * from "./interfaces.js";
export * from "./debugging.js";
export * from "./player.js";
export * from "./promisegroup.js";
export * from "./prompt.js";
export * from "./random.js";
export * from "./replay.js";
export * from "./messagebar.js";
export * from "./statemachine.js";

/**
 * @category Display
 */
export * as views from "./views.js";

/**
 * @category Display
 */
export { OutlineStyle } from "./views.js";

export * from "./math/index.js";
export * from "./objects/index.js";

import { IGameConfig } from "./interfaces.js";

/**
 * @category Core
 * @summary Current API version, to be exported as {@link IGameConfig.apiVersion}.
 */
export const API_VERSION = 3;
