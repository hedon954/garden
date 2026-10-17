import katex from "katex";
import { Marked } from "marked";

const shanghaiOffsetMs = 8 * 60 * 60 * 1000;

const articleMarked = new Marked({
  gfm: true,
  breaks: false,
  extensions: [
    {
      name: "mathBlock",
      level: "block",
      start(src: string) {
        return src.indexOf("$$");
      },
      tokenizer(src: string) {
        const match = /^\$\$\s*\n?([\s\S]+?)\n?\$\$\s*(?:\n|$)/.exec(src);
        if (!match) return undefined;
        return { type: "mathBlock", raw: match[0], tex: match[1] };
      },
      renderer(token: { tex?: string }) {
        return katex.renderToString((token.tex ?? "").trim(), { displayMode: true, throwOnError: false });
      },
    },
    {
      name: "mathInline",
      level: "inline",
      start(src: string) {
        const index = src.indexOf("$");
        return index < 0 ? undefined : index;
      },
      tokenizer(src: string) {
        const match = /^\$(?!\s)((?:\\\$|[^$\n])+?)(?<!\s)\$(?!\d)/.exec(src);
        if (!match) return undefined;
        return { type: "mathInline", raw: match[0], tex: match[1] };
      },
      renderer(token: { tex?: string }) {
        return katex.renderToString(token.tex ?? "", { throwOnError: false });
      },
    },
  ],
});

function shanghaiDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Date(date.getTime() + shanghaiOffsetMs);
}

/** Calendar date in Asia/Shanghai, the zone the demo uses for 「2026 年 9 月 18 日」. */
export function demoDateLabel(value: string) {
  const date = shanghaiDate(value);
  if (!date) return value;
  return `${date.getUTCFullYear()} 年 ${date.getUTCMonth() + 1} 月 ${date.getUTCDate()} 日`;
}

export function demoDateTime(value: string) {
  const date = shanghaiDate(value);
  if (!date) return value.slice(0, 10);
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${date.getUTCFullYear()}-${month}-${day}`;
}

/**
 * Same count as the demo generator: rendered article HTML, tags removed,
 * then every whitespace character removed.
 */
export function countRenderedWords(markdown: string) {
  const html = articleMarked.parse(markdown, { async: false });
  return html.replace(/<[^>]+>/g, "").replace(/\s/g, "").length;
}
