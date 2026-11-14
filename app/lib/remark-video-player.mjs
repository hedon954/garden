/**
 * A paragraph whose only content is one YouTube / Bilibili video link becomes
 * an in-article player. `{card}` keeps a link card. In-sentence links, lists
 * of several links, and code stay unchanged. Historical ```embed fences with
 * a playable URL still render, so older drafts are not left as dead code.
 */
import { toString } from "mdast-util-to-string";
import { renderLegacyEmbed, renderPlayerHtml, resolvePlayer } from "../../ui/garden/player.mjs";

const CARD_MARKER = "{card}";

const meaningful = (children) =>
  (children ?? []).filter((child) => !(child.type === "text" && !child.value.trim()) && child.type !== "break");

function htmlNode(value) {
  return { type: "html", value };
}

function asksForCard(node) {
  const children = node.children ?? [];
  for (let index = 0; index < children.length - 1; index += 1) {
    const link = children[index];
    const next = children[index + 1];
    if (link.type === "link" && next.type === "text" && next.value.startsWith(CARD_MARKER)) return true;
  }
  return false;
}

function exclusiveLink(node) {
  const rest = meaningful(node.children);
  return rest.length === 1 && rest[0].type === "link" ? rest[0] : null;
}

function replaceParagraph(parent, index, node) {
  if (asksForCard(node)) return false;
  const link = exclusiveLink(node);
  if (!link) return false;
  const player = resolvePlayer(link.url);
  if (!player.ok) return false;
  const title = toString(link).trim();
  parent.children[index] = htmlNode(renderPlayerHtml(player, {
    title: title && title !== link.url ? title : undefined,
  }));
  return true;
}

function walk(parent) {
  const children = parent.children ?? [];
  for (let index = 0; index < children.length; index += 1) {
    const node = children[index];
    if (node.type === "inlineCode" || node.type === "html") continue;
    if (node.type === "code") {
      if (String(node.lang ?? "").toLowerCase() === "embed") {
        children[index] = htmlNode(renderLegacyEmbed(node.value));
      }
      continue;
    }
    if (node.type === "paragraph") {
      replaceParagraph(parent, index, node);
      continue;
    }
    if (node.children) walk(node);
  }
}

export function remarkVideoPlayer() {
  return (tree) => {
    walk(tree);
  };
}
