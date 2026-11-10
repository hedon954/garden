/** Keep closing punctuation with the preceding inline formula.
 * KaTeX renders as an atomic inline-block, so CSS line-break / overflow-wrap
 * rules cannot see the formula and the following punctuation as one cluster.
 * Keep KaTeX markup/MathML intact; the outer viewport contains an oversized
 * atomic formula whether or not it has following punctuation.
 */
export const CLOSING_PUNCTUATION = /^[,.;:!?，。、；：！？）)\]}］｝〉》」』】〕〗〙〛’”'"…]+/u;

function classNames(node) {
  const value = node.properties?.className;
  return new Set(Array.isArray(value) ? value.map(String) : String(value ?? "").split(/\s+/).filter(Boolean));
}

function isInlineKatex(node) {
  return node.type === "element" && classNames(node).has("katex") && !classNames(node).has("katex-display");
}

export function keepClosingPunctuation(tree) {
  const walk = (parent) => {
    if (!Array.isArray(parent?.children) || isInlineKatex(parent) ||
      ["katex-display", "g-keep-punct", "g-inline-math"].some(name => classNames(parent).has(name))) return;
    const next = [];
    for (let index = 0; index < parent.children.length; index += 1) {
      const child = parent.children[index];
      walk(child);
      const following = parent.children[index + 1];
      const match = isInlineKatex(child) && following?.type === "text" ? following.value.match(CLOSING_PUNCTUATION) : null;
      if (!isInlineKatex(child)) { next.push(child); continue; }
      next.push({
        type: "element",
        tagName: "span",
        properties: { className: [match ? "g-keep-punct" : "g-inline-math"] },
        children: match ? [child, { type: "text", value: match[0] }] : [child],
      });
      if (!match) continue;
      const rest = following.value.slice(match[0].length);
      if (rest) next.push({ type: "text", value: rest });
      index += 1;
    }
    parent.children = next;
  };
  walk(tree);
}

export function rehypeKeepPunctuation() {
  return keepClosingPunctuation;
}
