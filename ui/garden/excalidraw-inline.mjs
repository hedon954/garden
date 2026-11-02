/**
 * Turn an exported Excalidraw SVG into article HTML.
 *
 * The Markdown image stays the author's syntax until content sync. This walks
 * the Markdown AST, swaps each `.excalidraw` image for the sanitized SVG, and
 * leaves every other byte of the post alone. rehype-raw then parses that SVG
 * into the article tree, so the text is part of the page rather than an
 * `<img src>`.
 */
import crypto from "node:crypto";
import { fromMarkdown } from "mdast-util-from-markdown";
import { fromHtml } from "hast-util-from-html";
import { toHtml } from "hast-util-to-html";
import { visit } from "unist-util-visit";
import { figureLayout } from "./enhance.mjs";
import { mapOutsideCode } from "./markdown-links.mjs";

/** Same rule as scripts/excalidraw.mjs: a source file, not an `.excalidraw.svg`. */
function isExcalidrawPath(value) {
  const clean = String(value ?? "").split(/[?#]/u, 1)[0];
  return /\.excalidraw$/iu.test(clean);
}

const DROP_TAGS = new Set([
  "script",
  "noscript",
  "iframe",
  "object",
  "embed",
  "foreignobject",
  "audio",
  "video",
  "canvas",
  "link",
  "meta",
  "base",
  "form",
]);

const escapeHtml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

function meaningfulChildren(node) {
  return (node?.children ?? []).filter((child) => !(child.type === "text" && !String(child.value).trim()));
}

/** Same caption rule as article figures: title, otherwise alt, unless the alt is a placeholder. */
function imageCaption(image) {
  const title = String(image.title ?? "").trim();
  const alt = String(image.alt ?? "").trim();
  if (title) return title;
  if (alt && !/^image|^截图|^img/iu.test(alt)) return alt;
  return "";
}

function unsafeUrl(value) {
  const url = String(value ?? "").trim().replace(/[\u0000-\u001f\s]+/gu, "");
  if (!url || url.startsWith("#") || url.startsWith("/")) return false;
  if (/^javascript:/iu.test(url)) return true;
  if (/^https?:/iu.test(url)) return false;
  if (/^data:image\/(?:png|gif|jpe?g|webp|svg\+xml);/iu.test(url)) return false;
  if (/^data:font\//iu.test(url)) return false;
  if (/^data:/iu.test(url)) return true;
  return false;
}

function sanitizeNode(node) {
  if (!node || node.type === "text" || node.type === "comment") return node;
  if (node.type !== "element") return null;
  if (DROP_TAGS.has(String(node.tagName).toLowerCase())) return null;
  const properties = { ...(node.properties ?? {}) };
  for (const key of Object.keys(properties)) {
    const value = properties[key];
    if (/^on/iu.test(key)) {
      delete properties[key];
      continue;
    }
    if (typeof value === "string" && /^(?:href|src|xlinkHref)$/iu.test(key) && unsafeUrl(value)) {
      delete properties[key];
      continue;
    }
    if (key === "style" && typeof value === "string" && /javascript:/iu.test(value)) delete properties[key];
  }
  node.properties = properties;
  node.children = (node.children ?? []).map(sanitizeNode).filter(Boolean);
  return node;
}

/**
 * Sanitized SVG markup for the page. Alt or title becomes `<title>` and
 * `aria-labelledby`. Scene `<text>` nodes stay.
 * @param {string} svgText
 * @param {{ alt?: string, title?: string }} [labels]
 */
export function inlineSvgDocument(svgText, { alt = "", title = "" } = {}) {
  const stripped = String(svgText).replace(/<!--\s*garden-excalidraw-source:[^>]*-->/gu, "");
  const root = fromHtml(stripped, { fragment: true });
  const svg = root.children.find((node) => node.type === "element" && node.tagName === "svg");
  if (!svg) throw new Error("导出结果不是 SVG");
  sanitizeNode(svg);
  const label = String(title || alt || "").trim();
  if (label) {
    const id = `garden-excalidraw-${crypto.createHash("sha256").update(`${label}\0${stripped}`).digest("hex").slice(0, 10)}`;
    svg.properties.ariaLabelledby = id;
    svg.children.unshift({
      type: "element",
      tagName: "title",
      properties: { id },
      children: [{ type: "text", value: label }],
    });
  }
  const classes = Array.isArray(svg.properties.className)
    ? svg.properties.className
    : svg.properties.className
      ? [svg.properties.className]
      : [];
  if (!classes.includes("excalidraw")) classes.push("excalidraw");
  svg.properties.className = classes;
  const width = Number(svg.properties.width) || 0;
  const height = Number(svg.properties.height) || 0;
  if (width > 0) svg.properties.dataNw = String(width);
  if (width > 0) svg.properties.dataAw = String(width);
  return { html: toHtml(svg), width, height };
}

function figureHtml(svgHtml, caption, width) {
  const side = figureLayout({ naturalWidth: width }).side;
  const classes = side > 0 ? "fig fig-wide" : "fig";
  const style = side > 0 ? ` style="--wl:${side}px;--wr:${side}px"` : "";
  const cap = caption ? `<figcaption>${escapeHtml(caption)}</figcaption>` : "";
  return `<figure class="${classes}"${style}><div class="fig-card">${svgHtml}</div>${cap}</figure>`;
}

/**
 * Replace `.excalidraw` Markdown images with inline SVG HTML.
 * `readSvg(url)` returns the exported SVG text or throws.
 * @param {string} markdown
 * @param {(url: string) => string} readSvg
 */
export function embedExcalidrawImages(markdown, readSvg) {
  const source = String(markdown ?? "");
  const tree = fromMarkdown(source);
  const edits = [];
  visit(tree, "image", (node, _index, parent) => {
    const url = String(node.url ?? "");
    if (!isExcalidrawPath(url)) return;
    const start = node.position?.start?.offset;
    const end = node.position?.end?.offset;
    if (start == null || end == null) return;
    const { html, width } = inlineSvgDocument(readSvg(url), { alt: node.alt, title: node.title });
    const alone = parent?.type === "paragraph" && meaningfulChildren(parent).length === 1 && meaningfulChildren(parent)[0] === node;
    const caption = imageCaption(node);
    edits.push(alone && parent.position?.start?.offset != null && parent.position?.end?.offset != null
      ? { start: parent.position.start.offset, end: parent.position.end.offset, replacement: figureHtml(html, caption, width) }
      : { start, end, replacement: html });
  });
  edits.sort((left, right) => right.start - left.start);
  let output = source;
  for (const edit of edits) output = `${output.slice(0, edit.start)}${edit.replacement}${output.slice(edit.end)}`;
  return output;
}

/** Raw `<img src="….excalidraw">` outside code becomes the same inline SVG. */
export function embedExcalidrawImgTags(markdown, readSvg) {
  return mapOutsideCode(markdown, (text) => text.replace(/<img\b[^>]*>/giu, (tag) => {
    const src = /\bsrc\s*=\s*["']([^"']+)["']/iu.exec(tag)?.[1];
    if (!src || !isExcalidrawPath(src)) return tag;
    const alt = /\balt\s*=\s*["']([^"']*)["']/iu.exec(tag)?.[1] ?? "";
    return inlineSvgDocument(readSvg(src), { alt }).html;
  }));
}
