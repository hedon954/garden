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
<style>body{margin:0;background:#fbfaf7;color:#1f1e1c;font:16px/1.75 -apple-system,BlinkMacSystemFont,"PingFang SC","Noto Sans SC",sans-serif}main{max-width:720px;margin:0 auto;padding:32px 20px 64px}img{max-width:100%;height:auto}pre{overflow:auto;padding:12px 14px;background:#f2f0ea;border-radius:8px}code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.9em}.table-wrap{overflow-x:auto}table{border-collapse:collapse}th,td{border:1px solid #ddd8cc;padding:6px 10px}a{color:inherit}.katex-html{display:none}@media (prefers-color-scheme:dark){body{background:#191918;color:#e9e6df}pre{background:#252422}th,td{border-color:#3a3833}}</style>
</head>
<body><main class="gf-preview-doc">
${html}
</main></body>
</html>
`;
}

/** Where the preview of a copied file is published: next to it. */
export const previewFileName = (fileName) => `${fileName}.preview.html`;
