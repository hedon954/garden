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
 * - Garden block props are not counted as YAML keys. Only text the widget
 *   actually emits is counted:
 *   - `garden html` that is a full document (the demo's `sandbox` fence) goes
 *     into an iframe `srcdoc` attribute. The tag strip deletes the attribute,
 *     so the document and its props are excluded. A `fallback:` line is
 *     emitted in `<noscript>` and is counted.
 *   - `garden html` that is already a widget fragment is inlined, so its text
 *     (including `<script>` text) is counted.
 *   - `garden figure` emits tab labels, part explanations, the caption, and
 *     SVG `<text>`. Prop keys and part ids stay in attributes and are excluded.
 * - A heading written `## 1.2 Title` keeps the digits (they move into
 *   `.sec-no`). The dot is dropped. The space was never going to be counted.
 *
 * The Go parity article comes out at 35,105. The demo page prints 35,234 for
 * the same prose and the same fenced code. The missing 129 characters are the
 * demo sandbox's `fallback:` paragraph, which that source renders in
 * `<noscript>` and this parity article does not contain.
 */
import katex from "katex";
import { Marked } from "marked";
import { parse as parseYaml } from "yaml";

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

function splitProps(body) {
  const text = String(body ?? "").replace(/\s+$/u, "");
  const lines = text.split("\n");
  const sep = lines.findIndex((line, index) => index > 0 && /^---\s*$/u.test(line));
  if (sep === -1) return { yamlText: text, children: "" };
  return { yamlText: lines.slice(0, sep).join("\n"), children: lines.slice(sep + 1).join("\n").replace(/^\n/u, "") };
}

function readYaml(yamlText) {
  try {
    const parsed = yamlText.trim() ? parseYaml(yamlText) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return null;
  }
}

function isHtmlDocument(body) {
  return /^\s*(?:<!doctype|<html|<style|<script)/iu.test(body);
}

function sandboxHtml(title, body) {
  const fallback = /^fallback:\s*(.*)$/mu.exec(body);
  const src = fallback ? body.replace(/^fallback:\s*.*(?:\n|$)/mu, "") : body;
  const noscript = fallback ? `<noscript><p>${escapeHtml(fallback[1])}</p></noscript>` : "";
  return `<div class="g-sandbox"><iframe title="${escapeHtml(title)}" srcdoc="${escapeHtml(src)}"></iframe>${noscript}</div>`;
}

function inline(value) {
  return marked.parseInline(String(value ?? ""), { async: false });
}

function figureHtml(data, svg) {
  const parts = Array.isArray(data.parts) ? data.parts : [];
  const tabs = parts.map((part) => `<button type="button" data-sel="${escapeHtml(part.id)}">${escapeHtml(part.label ?? "")}</button>`).join("");
  const notes = parts.map((part) => `<p data-exp="${escapeHtml(part.id)}">${inline(part.text ?? "")}</p>`).join("");
  const caption = data.caption ? `<figcaption>${inline(data.caption)}</figcaption>` : "";
  return `<figure class="g-explore"><div role="tablist">${tabs}</div><div class="dx-wrap">${svg}</div><div class="dx-exp">${notes}</div>${caption}</figure>`;
}

function visibleStrings(value, html) {
  if (typeof value === "string") html.push(inline(value));
  else if (Array.isArray(value)) value.forEach((item) => visibleStrings(item, html));
  else if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) {
      if (key === "id" || key === "url" || key === "src" || key === "svg" || key === "svgFile") continue;
      visibleStrings(item, html);
    }
  }
}

function gardenHtml(info, body) {
  const name = info.trim().split(/\s+/u)[0]?.toLowerCase() ?? "";
  const { yamlText, children } = splitProps(body);
  if (name === "html" || name === "interactive") {
    const data = readYaml(yamlText) ?? {};
    const title = typeof data.title === "string" ? data.title : "";
    const document = children.trim() ? children : body;
    if (!children.trim() || isHtmlDocument(document)) return sandboxHtml(title, document);
    return document;
  }
  if (name === "figure") {
    const data = readYaml(yamlText);
    if (!data) return `<pre class="code"><code>${escapeHtml(body)}</code></pre>`;
    return figureHtml(data, children);
  }
  const data = readYaml(yamlText);
  if (!data) return `<pre class="code"><code>${escapeHtml(body)}</code></pre>`;
  const bits = [];
  visibleStrings(data, bits);
  if (children.trim()) bits.push(children);
  return bits.join("");
}

function renderBlocks(markdown) {
  const lines = String(markdown ?? "").split("\n");
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
    if (lang === "garden") {
      flush();
      parts.push(gardenHtml(info.slice("garden".length).trim(), body.join("\n")));
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
