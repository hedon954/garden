/**
 * Article word count, the same rule as the A2 demo generator (`lib/page.mjs`):
 *
 *   renderedHtml.replace(/<[^>]+>/g, "").replace(/\s/g, "").length
 *
 * There is no second filter that drops code, tables, or math. Whatever text the
 * renderer leaves between tags is counted, including characters that HTML
 * escaping expanded (`&` → `&amp;`). Whitespace of every kind is removed first.
 *
 * What that means for each construct:
 *
 * - Fenced code is included. The source is emitted inside `<pre><code>`.
 *   Highlight markup is only tags, so it does not change the count.
 * - Inline code is included.
 * - Tables are included (the cell text).
 * - Math is included as the text KaTeX emits (visible glyphs and the MathML
 *   annotation). The TeX source is not counted a second time on top of that.
 * - Compose counts reader-visible static/native text and the default Play
 *   snapshot. Author intent, compiled payload attributes and sandbox source stay out.
 * - A heading written `## 1.2 Title` keeps the digits (they move into
 *   `.sec-no`). The dot is dropped. The space was never going to be counted.
 *
 * The Go parity article prose/static-SVG baseline is 34,714; its Compose
 * sandbox caption and static interactive fallback are counted in addition. So
 * the count includes SVG text and the surrounding prose, and it does not
 * include the old annotated-diagram tab labels.
 */
import katex from "katex";
import { Marked } from "marked";
import {contentToSearchText} from "../core/transform.mjs";
import {readPayload} from "../core/compile.mjs";
import {renderStatic} from "../core/static.mjs";

const marked = new Marked({
  gfm: true,
  breaks: false,
  renderer: {
    code(token) {
      const text = typeof token === "string" ? token : token.text ?? "";
      const lang = typeof token === "string" ? "" : token.lang ?? "";
      const name = String(lang).split(/\s/u)[0] ?? "";
      const body = escapeHtml(text);
      if (name === "mermaid") {
        return `<figure class="g-mermaid"><pre class="code mermaid-src"><code>${body}</code></pre></figure>\n`;
      }
      return `<pre class="code"><code class="hljs${name ? ` language-${escapeHtml(name)}` : ""}">${body}</code></pre>\n`;
    },
  },
  extensions: [
    {
      name: "mathBlock",
      level: "block",
      start(src) {
        return src.indexOf("$$");
      },
      tokenizer(src) {
        const match = /^\$\$\s*\n?([\s\S]+?)\n?\$\$\s*(?:\n|$)/u.exec(src);
        if (!match) return undefined;
        return { type: "mathBlock", raw: match[0], tex: match[1] };
      },
      renderer(token) {
        return `<div class="math-display">${katex.renderToString(String(token.tex ?? "").trim(), { displayMode: true, throwOnError: false })}</div>\n`;
      },
    },
    {
      name: "mathInline",
      level: "inline",
      start(src) {
        const index = src.indexOf("$");
        return index < 0 ? undefined : index;
      },
      tokenizer(src) {
        const match = /^\$(?!\s)((?:\\\$|[^$\n])+?)(?<!\s)\$(?!\d)/u.exec(src);
        if (!match) return undefined;
        return { type: "mathInline", raw: match[0], tex: match[1] };
      },
      renderer(token) {
        return katex.renderToString(String(token.tex ?? ""), { throwOnError: false });
      },
    },
  ],
});

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function gardenHtml(body) {
  const marker="`".repeat(Math.max(3,...[...body.matchAll(/`+/gu)].map(m=>m[0].length+1)));
  return `<p>${escapeHtml(contentToSearchText(`${marker}garden compose\n${body}\n${marker}`))}</p>`;
}

function renderBlocks(markdown) {
  const source=String(markdown??"").replace(/<garden-block data-payload="([^"]+)">([\s\S]*?)<\/garden-block>/gu,(raw,encoded,fallback)=>{
    try{const block=JSON.parse(decodeURIComponent(encoded));const p=block.payload?readPayload(JSON.stringify(block.payload)):null;return p?`<p>${escapeHtml(p.caption+" "+renderStatic(p,"text"))}</p>`:fallback;}catch{return raw;}
  });
  const lines = source.split("\n");
  const parts = [];
  let buffer = [];
  const flush = () => {
    if (!buffer.length) return;
    parts.push(marked.parse(buffer.join("\n"), { async: false }));
    buffer = [];
  };
  for (let index = 0; index < lines.length; index += 1) {
    const opened = /^(`{3,}|~{3,})(.*)$/u.exec(lines[index]);
    if (!opened) {
      buffer.push(lines[index]);
      continue;
    }
    const marker = opened[1];
    const info = opened[2].trim();
    const lang = info.split(/\s+/u)[0]?.toLowerCase() ?? "";
    const body = [];
    index += 1;
    while (index < lines.length && !new RegExp(`^${marker[0]}{${marker.length},}\\s*$`, "u").test(lines[index])) {
      body.push(lines[index]);
      index += 1;
    }
    if (/^garden\s+compose(?:\s|$)/iu.test(info)) {
      flush();
      parts.push(gardenHtml(body.join("\n")));
    } else {
      buffer.push(lines[index - body.length - 1], ...body, lines[index] ?? marker);
    }
  }
  flush();
  return parts.join("\n");
}

function numberHeadings(html, markdown) {
  let h2 = 0;
  let h3 = 0;
  const numbered = /^#{2,3}\s+\d/mu.test(markdown);
  const minLevel = /^##\s/mu.test(markdown) ? 2 : 3;
  return html.replace(/<h([234])>(.*?)<\/h\1>/gu, (all, level, inner) => {
    const sourceLevel = Number(level);
    const mapped = sourceLevel - minLevel + 2;
    if (mapped > 3) return `<h4>${inner}</h4>`;
    const text = inner
      .replace(/<[^>]+>/g, "")
      .replace(/&quot;/g, "\"")
      .replace(/&#39;/g, "'")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&");
    const numberedHeading = /^(\d+(?:\.\d+)*)\.?\s+(.*)$/u.exec(text);
    let number = "";
    let body = inner;
    if (numberedHeading) {
      number = numberedHeading[1];
      body = inner.replace(/^(\d+(?:\.\d+)*)\.?\s+/u, "");
    } else if (!numbered) {
      if (mapped === 2) {
        h2 += 1;
        h3 = 0;
        number = String(h2);
      } else {
        h3 += 1;
        number = h2 ? `${h2}.${h3}` : String(h3);
      }
    }
    return `<h${mapped}>${number ? `<span class="sec-no">${number}</span>` : ""}${body}</h${mapped}>`;
  });
}

const ALERT_TITLE = { note: "提醒", tip: "建议", important: "重要", warning: "警告", caution: "注意" };

function githubAlerts(html) {
  return html.replace(/<blockquote>\s*<p>\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\][ \t]*([^\n<]*)\n?/gu, (_, kind, title) => {
    const name = String(kind).toLowerCase();
    const label = title.trim() ? escapeHtml(title.trim()) : ALERT_TITLE[name];
    return `<blockquote class="markdown-alert markdown-alert-${name}"><p class="markdown-alert-title">${label}</p><p>`;
  });
}

function captionImages(html) {
  return html.replace(/<p>(<img [^>]+>)<\/p>/gu, (_, img) => {
    const alt = (/alt="([^"]*)"/u.exec(img) ?? [])[1] ?? "";
    const title = (/title="([^"]*)"/u.exec(img) ?? [])[1] ?? "";
    const caption = title || (alt && !/^image|^截图|^img/iu.test(alt) ? alt : "");
    return `<figure class="fig"><div class="fig-card">${img}</div>${caption ? `<figcaption>${caption}</figcaption>` : ""}</figure>`;
  });
}

/** Rendered-article word count. Pure: no DOM, safe to run while generating content. */
export function countDemoWords(markdown) {
  const html = githubAlerts(captionImages(numberHeadings(renderBlocks(markdown), markdown)));
  return html.replace(/<[^>]+>/g, "").replace(/\s/g, "").length;
}
