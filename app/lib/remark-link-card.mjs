import { toString } from "mdast-util-to-string";

/**
 * `[text](url){card}` asks for a link card.
 *
 * - The marker only counts written straight after the link's `)`. Inside code
 *   it is plain text and stays.
 * - A paragraph that is nothing but the marked link becomes the card itself,
 *   in the same spot; the inline link is not kept.
 * - Otherwise the link stays in the sentence and its card follows the
 *   paragraph (inside the same list item or quote).
 *
 * Cards are `garden-linkcard` elements carrying `data-url`, `data-text` and,
 * for the standalone form, `data-standalone`.
 */

const MARKER = "{card}";
const isHttp = (url) => /^https?:\/\//iu.test(url ?? "");

function writtenAsLink(node, source) {
  if (!source || node.position?.end?.offset === undefined) return true;
  return source[node.position.end.offset - 1] === ")";
}

function cardNode(link, standalone) {
  const properties = { dataUrl: link.url, dataText: toString(link).trim() };
  if (standalone) properties.dataStandalone = "true";
  return { type: "linkCard", data: { hName: "garden-linkcard", hProperties: properties }, children: [] };
}

const meaningful = (children) =>
  children.filter((child) => !(child.type === "text" && !child.value.trim()) && child.type !== "break");

/** Take the markers out of one parent's inline children; return the marked links. */
function takeMarkers(parent, source, sameSite) {
  const marked = [];
  const children = parent.children ?? [];
  for (let index = 0; index < children.length - 1; index += 1) {
    const link = children[index];
    const next = children[index + 1];
    if (link.type !== "link" || next.type !== "text" || !next.value.startsWith(MARKER)) continue;
    if (!isHttp(link.url) || !writtenAsLink(link, source)) continue;
    next.value = next.value.slice(MARKER.length);
    // A link back to this site is an ordinary internal link: the marker goes, no card.
    if (!sameSite(link.url)) marked.push(link);
  }
  parent.children = children.filter((child) => !(child.type === "text" && child.value === ""));
  return marked;
}

function walk(parent, source, sameSite) {
  const children = parent.children ?? [];
  for (let index = 0; index < children.length; index += 1) {
    const node = children[index];
    if (node.type === "code" || node.type === "inlineCode" || node.type === "html") continue;
    if (node.type !== "paragraph") {
      if (node.children) {
        // Headings, table cells and the like: drop the marker, no card.
        if (node.type === "heading" || node.type === "tableCell") takeMarkers(node, source, sameSite);
        walk(node, source, sameSite);
      }
      continue;
    }
    // Links nested in emphasis count too.
    const marked = takeMarkers(node, source, sameSite);
    for (const child of node.children) if (child.children && child.type !== "link") marked.push(...takeMarkers(child, source, sameSite));
    if (!marked.length) continue;
    const rest = meaningful(node.children);
    if (marked.length === 1 && rest.length === 1 && rest[0] === marked[0]) {
      children[index] = cardNode(marked[0], true);
      continue;
    }
    const cards = marked.map((link) => cardNode(link, false));
    children.splice(index + 1, 0, ...cards);
    index += cards.length;
  }
}

const SOURCE_MARKER = "{source}";

/**
 * `[research.google](https://research.google/...){source}` keeps the link in the
 * sentence and draws it as a small source chip (site icon + the link text).
 */
function markSources(parent, source) {
  const children = parent.children ?? [];
  for (let index = 0; index < children.length; index += 1) {
    const node = children[index];
    if (node.type === "code" || node.type === "inlineCode" || node.type === "html") continue;
    const next = children[index + 1];
    if (node.type === "link" && next?.type === "text" && next.value.startsWith(SOURCE_MARKER) && isHttp(node.url) && writtenAsLink(node, source)) {
      next.value = next.value.slice(SOURCE_MARKER.length);
      node.data = { ...node.data, hProperties: { ...node.data?.hProperties, className: ["g-src-chip"], dataSource: "true" } };
    }
    if (node.children) markSources(node, source);
  }
  parent.children = children.filter((child) => !(child.type === "text" && child.value === ""));
}

export function remarkLinkCard(options = {}) {
  const sameSite = typeof options?.sameSite === "function" ? options.sameSite : () => null;
  return (tree, file) => {
    const source = typeof file?.value === "string" ? file.value : String(file?.value ?? "");
    markSources(tree, source);
    walk(tree, source, sameSite);
  };
}
