import { stripCardMarkers } from "../garden/markdown-links.mjs";
import { parse as parseYaml } from "yaml";
import { compileUiBlock, jsonFence, readPayload } from "./compile.mjs";
import { findBlocks, scanFences } from "./fence.mjs";
import { renderStatic } from "./static.mjs";

/**
 * Turns authored `ui` / `intent` fences into what the site renders.
 * - publish: errors are returned so the build can fail; intent is an error.
 * - preview: broken blocks become `ui-error` cards; intent stays as a card.
 */
export function transformUiContent(markdown, options = {}) {
  const { mode = "publish", markdownPath = null, readData = null, resolveAsset = null, lineOffset = 0 } = options;
  const errors = [];
  let output = markdown;
  const blocks = findBlocks(markdown).filter((block) => block.lang === "ui" || block.lang === "intent");
  for (const block of [...blocks].reverse()) {
    let replacement = null;
    if (block.lang === "intent") {
      if (mode === "publish") {
        errors.push({ code: "intent-uncompiled", line: block.startLine + lineOffset, message: "还有没编译的 intent 块", severity: "error" });
      }
      continue;
    }
    const { payload, check } = compileUiBlock(block.body, {
      lineOffset: block.startLine + lineOffset,
      markdownPath,
      readData,
      resolveAsset,
    });
    if (payload) {
      replacement = jsonFence("ui", payload);
    } else {
      const blocking = check.diagnostics.filter((item) => item.severity === "error");
      if (mode === "publish") {
        errors.push(...blocking);
        continue;
      }
      replacement = jsonFence("ui-error", {
        id: check.header?.id ?? null,
        caption: typeof check.header?.caption === "string" ? check.header.caption : "",
        diagnostics: blocking,
      });
    }
    output = `${output.slice(0, block.start)}${replacement}${output.slice(block.end)}`;
  }
  return { content: output, errors: errors.sort((a, b) => a.line - b.line) };
}

function widgetCaption(body) {
  try {
    const data = parseYaml(body);
    return {
      caption: typeof data?.caption === "string" ? data.caption.trim() : "",
      src: typeof data?.src === "string" ? data.src.trim() : "",
    };
  } catch {
    return { caption: "", src: "" };
  }
}

function replaceFences(content, replacer) {
  let output = content;
  for (const fence of [...scanFences(content)].reverse()) {
    const replacement = replacer(fence);
    if (replacement === undefined) continue;
    output = `${output.slice(0, fence.start)}${replacement}${output.slice(fence.end)}`;
  }
  return output;
}

const absolute = (src, siteUrl) => (src && siteUrl && src.startsWith("/") ? `${siteUrl.replace(/\/+$/u, "")}${src}` : src);

const escapeHtml = (value) =>
  String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

/** Readable text for search and word count: captions and snapshot text, never intent. */
export function contentToSearchText(content) {
  return replaceFences(stripCardMarkers(content), (fence) => {
    if (fence.lang === "ui") {
      const payload = readPayload(fence.body);
      if (!payload) return " ";
      return ` ${payload.caption} ${renderStatic(payload, "text")} `;
    }
    if (fence.lang === "ui-error") {
      const payload = (() => {
        try {
          return JSON.parse(fence.body);
        } catch {
          return null;
        }
      })();
      return ` ${payload?.caption ?? ""} `;
    }
    if (fence.lang === "intent") return " ";
    if (fence.lang === "widget") return ` ${widgetCaption(fence.body).caption} `;
    return undefined;
  });
}

/** Markdown for RSS: snapshots become an HTML block, widgets become caption + link. */
export function contentForFeed(content, { pageUrl = "", siteUrl = "" } = {}) {
  return replaceFences(stripCardMarkers(content), (fence) => {
    if (fence.lang === "ui") {
      const payload = readPayload(fence.body);
      if (!payload) return "";
      const link = pageUrl ? ` · <a href="${escapeHtml(`${pageUrl}#ui-${payload.id}`)}">在网页中交互</a>` : "";
      return `<figure>${renderStatic(payload, "html")}<figcaption>${escapeHtml(payload.caption)}${link}</figcaption></figure>`;
    }
    if (fence.lang === "ui-error" || fence.lang === "intent") return "";
    if (fence.lang === "widget") {
      const { caption, src } = widgetCaption(fence.body);
      const href = absolute(src, siteUrl);
      return `${caption}${href ? `（[打开图表](${href})）` : ""}`;
    }
    return undefined;
  });
}

/** Markdown for CSDN / 知乎 / 掘金: snapshot Markdown plus a link back to the block. */
export function contentForDistribution(content, { pageUrl = "", siteUrl = "" } = {}) {
  return replaceFences(stripCardMarkers(content), (fence) => {
    if (fence.lang === "ui") {
      const payload = readPayload(fence.body);
      if (!payload) return "";
      const link = pageUrl ? `\n\n[在原文中交互](${pageUrl}#ui-${payload.id})` : "";
      return `${renderStatic(payload, "markdown")}\n\n*${payload.caption}*${link}`;
    }
    if (fence.lang === "ui-error" || fence.lang === "intent") return "";
    if (fence.lang === "widget") {
      const { caption, src } = widgetCaption(fence.body);
      const href = absolute(src, siteUrl);
      return `${caption}${href ? `（[打开图表](${href})）` : ""}`;
    }
    return undefined;
  });
}

/** `Data` sources referenced by `ui` fences, so callers can prefetch them. */
export function collectDataSources(markdown) {
  const sources = new Set();
  for (const block of findBlocks(markdown)) {
    if (block.lang !== "ui") continue;
    for (const match of block.body.matchAll(/<Data\b[^>]*\bsrc\s*=\s*"([^"]+)"/gu)) sources.add(match[1]);
  }
  return [...sources];
}
