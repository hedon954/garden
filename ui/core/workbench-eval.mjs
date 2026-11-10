import { findBlocks } from "./fence.mjs";
import { checkComposeFence } from "./scan.mjs";
import { AUTHOR_PLAY_TAGS } from "../compose/dil.mjs";

/**
 * Evaluate parsed components, not tag-shaped text inside code/HTML examples.
 * @param {{fence?: string, note?: string | null}} draft
 * @param {{components?: string[], assert?: boolean, note?: boolean}} expect
 */
export function evaluateWorkbenchDraft({ fence = "", note = null }, expect = {}) {
  const blocks = findBlocks(fence).filter((block) => block.lang === "garden-compose" && block.closed);
  const check = blocks.length === 1 ? checkComposeFence(blocks[0], { skipData: true }) : null;
  const used = new Set();
  const visit = (node) => {
    if (Array.isArray(node)) { node.forEach(visit); return; }
    if (!node || typeof node !== "object") return;
    if (node.t === "el") used.add(node.n);
    if (node.type && AUTHOR_PLAY_TAGS[node.type]) used.add(AUTHOR_PLAY_TAGS[node.type]);
    for (const child of Object.values(node)) if (child && typeof child === "object") visit(child);
  };
  visit(check?.root ?? check?.doc);
  const valid = Boolean(check?.ok && !check.uncompiled);
  const components = (expect.components ?? []).every((name) => used.has(name));
  const assertion = !expect.assert || Boolean(Array.isArray(check?.header?.expect) && check.header.expect.length);
  const noted = !expect.note || Boolean(note?.trim());
  return { valid, components, assert: assertion, note: noted, ok: valid && components && assertion && noted };
}
