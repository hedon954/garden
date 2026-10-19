/**
 * External links written in a post body. Code (fenced blocks, indented blocks
 * and inline spans) is skipped, so a URL in a snippet is never a link.
 */
import { INLINE_LINK_SOURCE } from "./markdown-destination.mjs";

const FENCE = /^ {0,3}(`{3,}|~{3,})/u;

/** Call `visit(text)` for every stretch of Markdown that is not code; returns the rebuilt text. */
export function mapOutsideCode(markdown, visit) {
  const lines = String(markdown ?? "").split("\n");
  const out = [];
  let fence = "";
  let prose = [];
  const flush = () => {
    if (!prose.length) return;
    out.push(mapInline(prose.join("\n"), visit));
    prose = [];
  };
  for (const line of lines) {
    if (fence) {
      out.push(line);
      if (new RegExp(`^ {0,3}${fence[0]}{${fence.length},}\\s*$`, "u").test(line)) fence = "";
      continue;
    }
    const open = FENCE.exec(line);
    if (open) {
      flush();
      fence = open[1];
      out.push(line);
      continue;
    }
    prose.push(line);
  }
  flush();
  return out.join("\n");
}

// Inline code spans: a run of backticks closed by the same-length run.
function mapInline(text, visit) {
  let result = "";
  let index = 0;
  const pattern = /(`+)[\s\S]*?(?<!`)\1(?!`)/gu;
  for (const match of text.matchAll(pattern)) {
    result += visit(text.slice(index, match.index)) + match[0];
    index = match.index + match[0].length;
  }
  return result + visit(text.slice(index));
}

// Inline links read as CommonMark reads them (ui/garden/markdown-destination.mjs):
// `[t](<https://e.com/a (1)>)` and `[t](https://e.com/Trie_(x))` are whole addresses.
// Groups: 1 `!`, 3 or 4 the address, 6 `{card}`.
const LINK = new RegExp(`${INLINE_LINK_SOURCE}(\\{card\\})?`, "giu");
const linkUrl = (match) => match[3] ?? match[4];
const isWebUrl = (url) => /^https?:\/\//iu.test(url);
const AUTOLINK = /<(https?:\/\/[^\s>]+)>/giu;
const BARE = /(^|[\s(（：:，,。])(https?:\/\/[^\s<>()（）\]，。、]+[^\s<>()（）\].,;:!?，。、；：！？'"])/giu;

/** Every external link in the body, in order: `{ url, card }`. Images are left out. */
export function markdownLinks(markdown) {
  const links = [];
  mapOutsideCode(markdown, (text) => {
    for (const match of text.matchAll(LINK)) {
      if (match[1] !== "!" && isWebUrl(linkUrl(match))) links.push({ url: linkUrl(match), card: Boolean(match[6]) });
    }
    const rest = text.replace(LINK, " ");
    for (const match of rest.matchAll(AUTOLINK)) links.push({ url: match[1], card: false });
    for (const match of rest.replace(AUTOLINK, " ").matchAll(BARE)) links.push({ url: match[2], card: false });
    return text;
  });
  return links;
}

/** The marker that asks for a link card: `[text](url){card}`, nothing in between. */
export const CARD_MARKER = "{card}";

/**
 * The same Markdown without `{card}` markers, for excerpts, RSS and the search
 * index. Markers inside code stay, since there they are literal text.
 */
export function stripCardMarkers(markdown) {
  if (!String(markdown ?? "").includes(CARD_MARKER)) return markdown;
  return mapOutsideCode(markdown, (text) => text.replace(LINK, (...match) => (match[6] && isWebUrl(linkUrl(match)) ? match[0].slice(0, -CARD_MARKER.length) : match[0])));
}

/** URLs the author asked to show as cards, in order, without repeats. */
export function cardUrls(markdown) {
  return [...new Set(markdownLinks(markdown).filter((link) => link.card).map((link) => link.url))];
}
