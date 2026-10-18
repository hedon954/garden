/**
 * External links written in a post body. Code (fenced blocks, indented blocks
 * and inline spans) is skipped, so a URL in a snippet is never a link.
 */

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

const LINK = /(!?)\[(?:[^\[\]]|\[[^\]]*\])*\]\(\s*<?(https?:\/\/[^\s)>]+)>?(?:\s+(?:"[^"]*"|'[^']*'))?\s*\)(\{card\})?/giu;
const AUTOLINK = /<(https?:\/\/[^\s>]+)>/giu;
const BARE = /(^|[\s(（：:，,。])(https?:\/\/[^\s<>()（）\]，。、]+[^\s<>()（）\].,;:!?，。、；：！？'"])/giu;

/** Every external link in the body, in order: `{ url, card }`. Images are left out. */
export function markdownLinks(markdown) {
  const links = [];
  mapOutsideCode(markdown, (text) => {
    for (const match of text.matchAll(LINK)) {
      if (match[1] !== "!") links.push({ url: match[2], card: Boolean(match[3]) });
    }
    const rest = text.replace(LINK, " ");
    for (const match of rest.matchAll(AUTOLINK)) links.push({ url: match[1], card: false });
    for (const match of rest.replace(AUTOLINK, " ").matchAll(BARE)) links.push({ url: match[2], card: false });
    return text;
  });
  return links;
}
