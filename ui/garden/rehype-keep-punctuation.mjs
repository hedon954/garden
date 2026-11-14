/** Keep closing punctuation with the preceding inline formula, and with the
 * last typographic cluster of ordinary prose (text, emoji, emphasis, links).
 *
 * KaTeX is an atomic inline-block, so CSS line-break / overflow-wrap cannot
 * see the formula and the following punctuation as one cluster. ASCII `~`
 * (U+007E) and the fullwidth / wave tildes are not CSS/Unicode line-end
 * punctuation either, so they can sit alone after a CJK character or emoji
 * when `.markdown-body` uses overflow-wrap: anywhere. Cluster only the last
 * grapheme (ZWJ / variation-selector sequences stay intact) plus a trailing
 * closing-punctuation run — never a whole paragraph, and never opening
 * brackets.
 *
 * Keep KaTeX markup/MathML intact; the outer viewport contains an oversized
 * atomic formula whether or not it has following punctuation.
 */
export const CLOSING_PUNCTUATION = /^[,.;:!?，。、；：！？）)\]}］｝〉》」』】〕〗〙〛’”'"…~～〜]+/u;
export const CLOSING_PUNCTUATION_END = /[,.;:!?，。、；：！？）)\]}］｝〉》」』】〕〗〙〛’”'"…~～〜]+$/u;

const SKIP_PARENTS = new Set(["pre", "code", "kbd", "samp", "script", "style", "textarea", "svg", "math"]);
const PHRASING = new Set([
  "a", "abbr", "b", "cite", "code", "em", "i", "kbd", "mark", "q", "s", "samp",
  "small", "span", "strong", "sub", "sup", "time", "u", "var", "ruby", "rt",
]);

function classNames(node) {
  const value = node.properties?.className;
  return new Set(Array.isArray(value) ? value.map(String) : String(value ?? "").split(/\s+/).filter(Boolean));
}

function isInlineKatex(node) {
  return node.type === "element" && classNames(node).has("katex") && !classNames(node).has("katex-display");
}

function keepSpan(children) {
  return { type: "element", tagName: "span", properties: { className: ["g-keep-punct"] }, children };
}

function lastGrapheme(value) {
  const segments = [...new Intl.Segmenter("und", { granularity: "grapheme" }).segment(value)];
  return segments.at(-1)?.segment ?? "";
}

/** Split a trailing [grapheme][spaces][closing punct run] off a text value. */
export function splitTrailingKeep(value) {
  const match = String(value ?? "").match(CLOSING_PUNCTUATION_END);
  if (!match) return null;
  const before = value.slice(0, -match[0].length);
  if (!before) return null;
  const trimmed = before.replace(/[ \t\u00a0]+$/u, "");
  if (!trimmed) return null;
  const last = lastGrapheme(trimmed);
  if (!last) return null;
  return {
    head: trimmed.slice(0, -last.length),
    cluster: last + before.slice(trimmed.length) + match[0],
  };
}

function isProtected(node) {
  return isInlineKatex(node) || ["katex-display", "g-keep-punct", "g-inline-math"].some((name) => classNames(node).has(name));
}

function canTakeFollowingPunct(node) {
  if (!node || node.type !== "element") return false;
  if (isInlineKatex(node)) return true;
  if (isProtected(node)) return false;
  return PHRASING.has(node.tagName);
}

export function keepClosingPunctuation(tree) {
  const walk = (parent) => {
    if (!Array.isArray(parent?.children) || isProtected(parent) || SKIP_PARENTS.has(parent.tagName)) return;
    const next = [];
    for (let index = 0; index < parent.children.length; index += 1) {
      const child = parent.children[index];
      walk(child);
      const following = parent.children[index + 1];
      const leading = following?.type === "text" ? following.value.match(CLOSING_PUNCTUATION) : null;

      if (child.type === "text") {
        const split = splitTrailingKeep(child.value);
        if (!split) { next.push(child); continue; }
        if (split.head) next.push({ type: "text", value: split.head });
        next.push(keepSpan([{ type: "text", value: split.cluster }]));
        continue;
      }

      if (canTakeFollowingPunct(child) && leading) {
        next.push(keepSpan([child, { type: "text", value: leading[0] }]));
        const rest = following.value.slice(leading[0].length);
        if (rest) next.push({ type: "text", value: rest });
        index += 1;
        continue;
      }

      // Bare inline formulas still get a local overflow viewport.
      if (isInlineKatex(child)) {
        next.push({
          type: "element",
          tagName: "span",
          properties: { className: ["g-inline-math"] },
          children: [child],
        });
        continue;
      }

      next.push(child);
    }
    parent.children = next;
  };
  walk(tree);
}

export function rehypeKeepPunctuation() {
  return keepClosingPunctuation;
}
