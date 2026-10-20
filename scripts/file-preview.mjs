/**
 * The 预览 of a Markdown file in a `garden file` block, rendered at build time.
 *
 * The HTML goes to its own file next to the copied Markdown and is fetched
 * only when a reader opens the preview, so the article page does not carry
 * it. It is read with the posts' Markdown syntax (markdownSyntaxPlugins) and
 * the posts' rehype steps: raw HTML, KaTeX, heading ids, highlighting.
 * What only React adds to a post (copy buttons, Mermaid, link cards) is not
 * there: a preview is a document to read.
 *
 * The client puts this HTML into the page, so anything that would run is
 * removed here: script-like elements, on* attributes, javascript: and other
 * non-http URLs (images may still use data:).
 */
import fs from "node:fs";
import rehypeHighlight from "rehype-highlight";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import rehypeSlug from "rehype-slug";
import rehypeStringify from "rehype-stringify";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import { visit } from "unist-util-visit";
import { markdownSyntaxPlugins } from "../ui/garden/markdown-syntax.mjs";
import { codeLanguageLabel, fenceLanguage } from "../ui/garden/code-language.mjs";

const DROPPED_ELEMENTS = new Set(["script", "noscript", "iframe", "frame", "frameset", "object", "embed", "applet", "base", "link", "meta", "form", "template"]);
const URL_PROPERTIES = new Set(["href", "src", "action", "formAction", "poster", "cite", "background", "xLinkHref"]);
const SAFE_URL = /^(?:https?:|mailto:|tel:|#|\/(?!\/)|\.{0,2}\/|[^:/?#]+(?:[/?#]|$))/iu;

const isSafeUrl = (name, value, tagName) => {
  const url = String(value).trim().replace(/[\u0000-\u001f\s]+/gu, "");
  if (name === "src" && tagName === "img" && /^data:image\/(?:png|gif|jpe?g|webp|avif);/iu.test(url)) return true;
  return SAFE_URL.test(url);
};

/** Removes what could run once the HTML is in the page. */
export function rehypePreviewSafety() {
  return (tree) => {
    visit(tree, "element", (node, index, parent) => {
      if (DROPPED_ELEMENTS.has(node.tagName)) {
        parent.children.splice(index, 1);
        return index;
      }
      for (const name of Object.keys(node.properties ?? {})) {
        const value = node.properties[name];
        if (/^on/iu.test(name) || name === "srcDoc" || name === "style" && /expression|url\s*\(\s*['"]?\s*javascript:/iu.test(String(value))) {
          delete node.properties[name];
        } else if (URL_PROPERTIES.has(name) && !isSafeUrl(name, value, node.tagName)) {
          delete node.properties[name];
        } else if (name === "srcSet" && [].concat(value).some((part) => !isSafeUrl("srcset", String(part).trim().split(/\s+/u)[0], node.tagName))) {
          delete node.properties[name];
        }
      }
      if (node.tagName === "a" && /^https?:/iu.test(String(node.properties?.href ?? ""))) {
        node.properties.target = "_blank";
        node.properties.rel = ["noopener", "noreferrer"];
      }
      return undefined;
    });
  };
}

/**
 * The markup the article's own styles expect, so the drawer looks like the
 * article: tables scroll inside .table-wrap, code blocks are pre.code with
 * their language, outside links carry .ext. (Copy buttons, link cards and
 * favicons are article-only.)
 */
export function rehypePreviewShape({ lang = "zh" } = {}) {
  const tableAriaLabel = lang === "en" ? "Scrollable table" : "表格，可横向滚动";
  return (tree) => {
    visit(tree, "element", (node, index, parent) => {
      if (node.tagName === "table" && !(parent?.type === "element" && parent.properties?.className?.includes?.("table-wrap"))) {
        parent.children[index] = {
          type: "element",
          tagName: "div",
          properties: { className: ["table-wrap"], role: "region", ariaLabel: tableAriaLabel, tabIndex: 0 },
          children: [node],
        };
        return "skip";
      }
      if (node.tagName === "pre") {
        const code = node.children.find((child) => child.type === "element" && child.tagName === "code");
        const language = fenceLanguage([].concat(code?.properties?.className ?? []));
        node.properties.className = [...[].concat(node.properties.className ?? []), "code"];
        if (codeLanguageLabel(language)) node.properties.dataLanguage = codeLanguageLabel(language);
      }
      if (node.tagName === "a" && node.properties?.target === "_blank") {
        node.properties.className = [...[].concat(node.properties.className ?? []), "ext"];
      }
      return undefined;
    });
  };
}

/** Markdown → the preview's HTML. `idPrefix` keeps heading ids apart from the article's own. */
export function renderFilePreview(markdown, { idPrefix = "gf-", lang = "zh" } = {}) {
  return String(
    unified()
      .use(remarkParse)
      .use(markdownSyntaxPlugins)
      .use(remarkRehype, { allowDangerousHtml: true })
      .use(rehypeRaw)
      .use(rehypeKatex)
      .use(rehypeSlug, { prefix: idPrefix })
      .use(rehypeHighlight)
      .use(rehypePreviewSafety)
      .use(rehypePreviewShape, { lang })
      .use(rehypeStringify)
      .processSync(markdown),
  );
}

const escapeText = (value) => String(value).replace(/&/gu, "&amp;").replace(/</gu, "&lt;").replace(/>/gu, "&gt;");

/**
 * The article's colours and code type (app/styles/tokens.css, the code rules in
 * app/globals.css and a2.css), so a reader without JavaScript sees code as on
 * the article page. The page has no theme switch: dark follows the system.
 * tests/garden-file.test.mjs checks these against the stylesheets.
 */
export const PREVIEW_TOKENS = {
  mono: '"JetBrains Mono", "SF Mono", ui-monospace, Menlo, Consolas, "Noto Sans Mono CJK SC", monospace',
  sans: '-apple-system, BlinkMacSystemFont, "PingFang SC", "Hiragino Sans GB", "Noto Sans SC", "Noto Sans CJK SC", "Microsoft YaHei", "Segoe UI", system-ui, sans-serif',
  light: { paper: "#faf9f5", ink: "#1b1a18", well: "#f0eee6", tint: "rgb(27 26 24 / 5.5%)", rule: "#e6e3dc" },
  dark: { paper: "#1f1e1d", ink: "#eeece7", well: "#262624", tint: "rgb(238 236 231 / 7%)", rule: "#3d3d3a" },
  // .markdown-body pre in globals.css: the block's own type, under the <code> that holds the text.
  pre: { fontSize: "12px", lineHeight: "1.7", color: "#e6e6e2" },
};

// Highlight colours are not copied by hand: every .hljs-* rule of the article's
// stylesheets, in the order the site loads them.
const STYLESHEETS = ["../app/globals.css", "../app/styles/a2.css"];
const DARK_PREFIX = /^(?::root|html)\[data-theme="dark"\]\s+/u;
const HLJS_SELECTOR = /^\.hljs-[\w-]+(?:\.[\w-]+)*(?:\s+\.hljs-[\w-]+)?$/u;

/** The .hljs-* rules of some CSS, split into light (always) and dark (html[data-theme="dark"]). */
export function highlightRules(css) {
  const light = [];
  const dark = [];
  const text = css.replace(/\/\*[\s\S]*?\*\//gu, "");
  let depth = 0;
  let start = 0;
  // Top-level rules only: nothing inside @media or other blocks.
  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    if (char === "{") {
      if (depth === 0) {
        const selectorText = text.slice(start, index).trim();
        const end = text.indexOf("}", index);
        const body = text.slice(index + 1, end);
        if (!selectorText.startsWith("@") && !body.includes("{")) {
          const declarations = body.split(";").map((part) => part.trim().replace(/\s*:\s*/u, ":")).filter(Boolean).join(";");
          const selectors = selectorText.split(",").map((part) => part.trim());
          const lightSelectors = selectors.filter((selector) => HLJS_SELECTOR.test(selector));
          const darkSelectors = selectors.filter((selector) => DARK_PREFIX.test(selector)).map((selector) => selector.replace(DARK_PREFIX, "")).filter((selector) => HLJS_SELECTOR.test(selector));
          if (lightSelectors.length) light.push(`${lightSelectors.join(",")}{${declarations}}`);
          // html:root keeps the weight of html[data-theme="dark"], so the dark rules win exactly where they do on the site.
          if (darkSelectors.length) dark.push(`${[...new Set(darkSelectors)].map((selector) => `html:root ${selector}`).join(",")}{${declarations}}`);
          start = end + 1;
          index = end;
          continue;
        }
      }
      depth++;
    } else if (char === "}") {
      depth--;
      if (depth === 0) start = index + 1;
    }
  }
  return { light, dark };
}

let previewStyle;
/** The standalone page's stylesheet, built once per build. */
export function previewStyleSheet() {
  if (previewStyle) return previewStyle;
  const rules = STYLESHEETS.map((file) => highlightRules(fs.readFileSync(new URL(file, import.meta.url), "utf8")));
  const { mono, sans, light, dark, pre } = PREVIEW_TOKENS;
  const theme = (colors) => `body{background:${colors.paper};color:${colors.ink}}pre{background:${colors.well}}pre code{color:${colors.ink}}:not(pre)>code{background:${colors.tint};color:${colors.ink}}th,td{border-color:${colors.rule}}`;
  previewStyle = [
    `body{margin:0;font:16px/1.75 ${sans}}`,
    "main{max-width:720px;margin:0 auto;padding:32px 20px 64px}",
    "img{max-width:100%;height:auto}",
    `pre,code{font-family:${mono}}`,
    `pre{margin:28px 0;padding:18px 22px;border-radius:8px;overflow-x:auto;font-size:${pre.fontSize};line-height:${pre.lineHeight};color:${pre.color}}`,
    "pre code{display:block;background:none;padding:0;font-size:14px;line-height:1.6}",
    `:not(pre)>code{font:400 14px/1 ${mono};padding:3px 6px;border-radius:5px}`,
    ".table-wrap{overflow-x:auto}table{border-collapse:collapse}th,td{border:1px solid;padding:6px 10px}",
    "a{color:inherit}.katex-html{display:none}",
    theme(light),
    ...rules.flatMap((sheet) => sheet.light),
    `@media (prefers-color-scheme:dark){${theme(dark)}${rules.flatMap((sheet) => sheet.dark).join("")}}`,
  ].join("");
  return previewStyle;
}

/**
 * The published preview: a small standalone page, so a reader without
 * JavaScript who follows the 预览 link gets something readable. The drawer
 * takes only what is inside <main>.
 */
export function previewDocument(html, { title = "", lang = "zh" } = {}) {
  const docTitle = title || (lang === "en" ? "Preview" : "预览");
  const htmlLang = lang === "en" ? "en" : "zh-CN";
  return `<!doctype html>
<html lang="${htmlLang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${escapeText(docTitle)}</title>
<style>${previewStyleSheet()}</style>
</head>
<body><main class="gf-preview-doc">
${html}
</main></body>
</html>
`;
}

/** Where the preview of a copied file is published: next to it. */
export const previewFileName = (fileName) => `${fileName}.preview.html`;
