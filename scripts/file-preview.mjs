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
export function rehypePreviewShape() {
  return (tree) => {
    visit(tree, "element", (node, index, parent) => {
      if (node.tagName === "table" && !(parent?.type === "element" && parent.properties?.className?.includes?.("table-wrap"))) {
        parent.children[index] = {
          type: "element",
          tagName: "div",
          properties: { className: ["table-wrap"], role: "region", ariaLabel: "表格，可横向滚动", tabIndex: 0 },
          children: [node],
        };
        return "skip";
      }
      if (node.tagName === "pre") {
        const code = node.children.find((child) => child.type === "element" && child.tagName === "code");
        const language = [].concat(code?.properties?.className ?? []).map(String).find((name) => name.startsWith("language-"))?.slice(9);
        node.properties.className = [...[].concat(node.properties.className ?? []), "code"];
        if (language) node.properties.dataLanguage = language.toUpperCase();
      }
      if (node.tagName === "a" && node.properties?.target === "_blank") {
        node.properties.className = [...[].concat(node.properties.className ?? []), "ext"];
      }
      return undefined;
    });
  };
}

/** Markdown → the preview's HTML. `idPrefix` keeps heading ids apart from the article's own. */
export function renderFilePreview(markdown, { idPrefix = "gf-" } = {}) {
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
      .use(rehypePreviewShape)
      .use(rehypeStringify)
      .processSync(markdown),
  );
}

const escapeText = (value) => String(value).replace(/&/gu, "&amp;").replace(/</gu, "&lt;").replace(/>/gu, "&gt;");

/**
 * The article's colours and code type (app/styles/tokens.css, a2.css), so a
 * reader without JavaScript sees code blocks as on the article page. The page
 * has no theme switch: dark follows the system. tests/garden-file.test.mjs
 * checks these against tokens.css.
 */
export const PREVIEW_TOKENS = {
  mono: '"JetBrains Mono", "SF Mono", ui-monospace, Menlo, Consolas, "Noto Sans Mono CJK SC", monospace',
  sans: '-apple-system, BlinkMacSystemFont, "PingFang SC", "Hiragino Sans GB", "Noto Sans SC", "Noto Sans CJK SC", "Microsoft YaHei", "Segoe UI", system-ui, sans-serif',
  light: { paper: "#faf9f5", ink: "#1b1a18", well: "#f0eee6", tint: "rgb(27 26 24 / 5.5%)", rule: "#e6e3dc" },
  dark: { paper: "#1f1e1d", ink: "#eeece7", well: "#262624", tint: "rgb(238 236 231 / 7%)", rule: "#3d3d3a" },
  hljs: {
    light: { keyword: "#30302e", string: "#2d6a3e", comment: "#6e6b64", number: "#8a5300", title: "#6a3fb5", attr: "#1b1a18" },
    dark: { keyword: "#eeece7", string: "#8fd1a0", comment: "#a09b91", number: "#e8b86a", title: "#c4a8f0", attr: "#eeece7" },
  },
};

const themeRules = (theme, hljs) => [
  `body{background:${theme.paper};color:${theme.ink}}`,
  `pre{background:${theme.well}}`,
  `:not(pre)>code{background:${theme.tint}}`,
  `th,td{border-color:${theme.rule}}`,
  `.hljs-keyword,.hljs-built_in,.hljs-type{color:${hljs.keyword}}`,
  `.hljs-string,.hljs-regexp{color:${hljs.string}}`,
  `.hljs-comment,.hljs-quote{color:${hljs.comment}}`,
  `.hljs-number,.hljs-literal{color:${hljs.number}}`,
  `.hljs-title{color:${hljs.title}}`,
  `.hljs-attr,.hljs-variable,.hljs-params{color:${hljs.attr}}`,
].join("");

const PREVIEW_STYLE = [
  `body{margin:0;font:16px/1.75 ${PREVIEW_TOKENS.sans}}`,
  "main{max-width:720px;margin:0 auto;padding:32px 20px 64px}",
  "img{max-width:100%;height:auto}",
  `pre,code{font-family:${PREVIEW_TOKENS.mono}}`,
  "pre{margin:28px 0;padding:18px 22px;border-radius:8px;overflow-x:auto}",
  "pre code{display:block;font-size:14px;line-height:1.6}",
  ":not(pre)>code{font-size:14px;padding:3px 6px;border-radius:5px}",
  ".hljs-keyword,.hljs-built_in,.hljs-type{font-weight:600}",
  ".table-wrap{overflow-x:auto}table{border-collapse:collapse}th,td{border:1px solid;padding:6px 10px}",
  "a{color:inherit}.katex-html{display:none}",
  themeRules(PREVIEW_TOKENS.light, PREVIEW_TOKENS.hljs.light),
  `@media (prefers-color-scheme:dark){${themeRules(PREVIEW_TOKENS.dark, PREVIEW_TOKENS.hljs.dark)}}`,
].join("");

/**
 * The published preview: a small standalone page, so a reader without
 * JavaScript who follows the 预览 link gets something readable. The drawer
 * takes only what is inside <main>.
 */
export function previewDocument(html, { title = "预览" } = {}) {
  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${escapeText(title)}</title>
<style>${PREVIEW_STYLE}</style>
</head>
<body><main class="gf-preview-doc">
${html}
</main></body>
</html>
`;
}

/** Where the preview of a copied file is published: next to it. */
export const previewFileName = (fileName) => `${fileName}.preview.html`;
