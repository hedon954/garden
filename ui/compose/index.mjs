export { COMPOSE_EXAMPLE_BODY, COMPOSE_INTENT } from "./examples.mjs";
export { PRIMITIVES, parseCompose, CATALOG_TAGS } from "./parse.mjs";
export { composeScope, composeText, renderCompose } from "./render.mjs";
export { ICON_NAMES, hasIcon, iconSvg } from "./icons.mjs";

export function isComposeInfo(info) {
  return /^compose(?:\s|$)/iu.test(String(info ?? "").trim());
}
