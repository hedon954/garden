import { figureLayout } from "../../ui/garden/enhance.mjs";
import { toString } from "mdast-util-to-string";

const ALERT_TITLE = {
  note: "提醒",
  tip: "建议",
  important: "重要",
  warning: "警告",
  caution: "注意",
};

const ALERT_TITLE_EN = {
  note: "Note",
  tip: "Tip",
  important: "Important",
  warning: "Warning",
  caution: "Caution",
};

const LEGACY_KIND = {
  info: "note",
  success: "tip",
  warning: "warning",
  danger: "caution",
  note: "note",
};

const ALERT_ICON = {
  note: '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6.25"/><path d="M8 7.2v4"/><path d="M8 4.8v.1" stroke-width="2"/></svg>',
  tip: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.75a4.25 4.25 0 0 0-2.5 7.7c.4.3.6.7.6 1.2v.6h3.8v-.6c0-.5.2-.9.6-1.2A4.25 4.25 0 0 0 8 1.75z"/><path d="M6.2 13.6h3.6"/></svg>',
  important: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2.25 3.25a1.5 1.5 0 0 1 1.5-1.5h8.5a1.5 1.5 0 0 1 1.5 1.5v6.5a1.5 1.5 0 0 1-1.5 1.5H7.5l-3 2.75v-2.75h-.75a1.5 1.5 0 0 1-1.5-1.5z"/><path d="M8 4.5v3"/><path d="M8 9.4v.1" stroke-width="2"/></svg>',
  warning: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M7.13 2.4a1 1 0 0 1 1.74 0l5.6 9.9a1 1 0 0 1-.87 1.5H2.4a1 1 0 0 1-.87-1.5z"/><path d="M8 6.3v3.1"/><path d="M8 11.4v.1" stroke-width="2"/></svg>',
  caution: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5.3 1.75h5.4l3.55 3.55v5.4l-3.55 3.55H5.3L1.75 10.7V5.3z"/><path d="M8 4.8v3.6"/><path d="M8 10.6v.1" stroke-width="2"/></svg>',
};

function meaningfulChildren(node) {
  return (node.children ?? []).filter((child) => !(child.type === "text" && !String(child.value).trim()));
}

function visibleText(node) {
  const parts = [];
  const visit = (current) => {
    if (!current || current.type === "html") return;
    if (current.type === "text") {
      parts.push(current.value);
      return;
    }
    for (const child of current.children ?? []) visit(child);
  };
  visit(node);
  return parts.join("").trim();
}

function isBlankParagraph(node) {
  return node?.type === "paragraph" && toString(node).trim() === "" && meaningfulChildren(node).length === 0;
}

function alertTitle(kind, label, lang = "zh") {
  const titles = lang === "en" ? ALERT_TITLE_EN : ALERT_TITLE;
  return {
    type: "paragraph",
    data: { hName: "p", hProperties: { className: ["markdown-alert-title"] } },
    children: [
      { type: "html", value: ALERT_ICON[kind] },
      { type: "text", value: label || titles[kind] },
    ],
  };
}

const ALERT_KIND = {
  NOTE: "note",
  INFO: "note",
  TIP: "tip",
  SUCCESS: "tip",
  IMPORTANT: "important",
  WARNING: "warning",
  CAUTION: "caution",
  DANGER: "caution",
  FAILURE: "caution",
};

function paragraphFirstLine(node) {
  let line = "";
  for (const child of node.children ?? []) {
    if (child.type === "break") break;
    if (child.type === "text") {
      const newline = child.value.indexOf("\n");
      line += newline >= 0 ? child.value.slice(0, newline) : child.value;
      if (newline >= 0) break;
      continue;
    }
    line += toString(child);
  }
  return line;
}

function withoutMarkerLine(node) {
  const children = [];
  let skipping = true;
  for (const child of node.children ?? []) {
    if (!skipping) {
      children.push(child);
      continue;
    }
    if (child.type === "break") {
      skipping = false;
      continue;
    }
    if (child.type === "text") {
      const newline = child.value.indexOf("\n");
      if (newline >= 0) {
        skipping = false;
        const rest = child.value.slice(newline + 1);
        if (rest) children.push({ type: "text", value: rest });
      }
    }
  }
  if (!children.some((child) => child.type !== "text" || child.value.trim())) return null;
  return { type: "paragraph", children };
}

function gfmAlert(node) {
  if (node?.type !== "paragraph") return null;
  const match = /^\[!(NOTE|INFO|TIP|SUCCESS|IMPORTANT|WARNING|CAUTION|DANGER|FAILURE)\][ \t]*(.*)$/iu.exec(paragraphFirstLine(node).trim());
  if (!match) return null;
  return {
    kind: ALERT_KIND[match[1].toUpperCase()],
    label: match[2].trim(),
    body: withoutMarkerLine(node),
  };
}

function legacyAlert(node) {
  if (node?.type !== "paragraph" || visibleText(node)) return null;
  const html = (node.children ?? []).filter((child) => child.type === "html").map((child) => child.value).join("");
  const match = /garden-callout-marker--(info|success|warning|danger|note)/u.exec(html);
  if (!match) return null;
  return LEGACY_KIND[match[1]] || "note";
}

function strongOnlyText(node) {
  if (node?.type !== "paragraph") return "";
  const children = meaningfulChildren(node);
  if (children.length !== 1 || children[0].type !== "strong") return "";
  return toString(children[0]).trim();
}

function rewriteAlert(node, lang = "zh") {
  const children = node.children ?? [];
  const gfm = gfmAlert(children[0]);
  const legacy = gfm ? null : legacyAlert(children[0]);
  if (!gfm && !legacy) return;
  const kind = gfm ? gfm.kind : legacy;
  let label = gfm ? gfm.label : "";
  let rest = gfm?.body ? [gfm.body, ...children.slice(1)] : children.slice(1);
  if (!label) {
    // A leading bold-only line is the title only when body text follows it.
    // On its own it stays the body, under the default label.
    const index = rest.findIndex((child) => !isBlankParagraph(child));
    const custom = strongOnlyText(rest[index]);
    const hasBody = rest.slice(index + 1).some((child) => !isBlankParagraph(child));
    if (custom && hasBody) {
      label = custom;
      rest = rest.filter((_, childIndex) => childIndex !== index);
    }
  }
  while (rest.length && isBlankParagraph(rest[0])) rest.shift();
  node.children = [alertTitle(kind, label, lang), ...rest];
  node.data ??= {};
  node.data.hProperties ??= {};
  const existing = node.data.hProperties.className;
  const classes = Array.isArray(existing) ? existing : existing ? [existing] : [];
  node.data.hProperties.className = [...classes, "markdown-alert", `markdown-alert-${kind}`];
}

function figureCaption(image) {
  const title = String(image.title ?? "").trim();
  const alt = String(image.alt ?? "").trim();
  if (title) return title;
  if (alt && !/^image|^截图|^img/iu.test(alt)) return alt;
  return "";
}

function asFigure(node, imageSize) {
  if (node?.type !== "paragraph" || node.data?.hName) return null;
  const children = meaningfulChildren(node);
  if (children.length !== 1 || children[0].type !== "image") return null;
  const image = children[0];
  const caption = figureCaption(image);
  const card = {
    type: "paragraph",
    data: { hName: "div", hProperties: { className: ["fig-card"] } },
    children: [image],
  };
  const figureChildren = caption
    ? [card, {
      type: "paragraph",
      data: { hName: "figcaption" },
      children: [{ type: "text", value: caption }],
    }]
    : [card];
  // A known size decides the breakout now, so the figure does not jump when the image loads.
  const size = imageSize(image.url);
  const side = size ? figureLayout({ naturalWidth: size.width }).side : 0;
  const hProperties = side > 0
    ? { className: ["fig", "fig-wide"], style: `--wl:${side}px;--wr:${side}px` }
    : { className: ["fig"] };
  return {
    type: "paragraph",
    data: { hName: "figure", hProperties },
    children: figureChildren,
  };
}

function walk(node, imageSize, lang = "zh") {
  if (!node || typeof node !== "object" || !Array.isArray(node.children)) return;
  if (node.type === "blockquote") rewriteAlert(node, lang);
  node.children = node.children.map((child) => asFigure(child, imageSize) ?? child);
  for (const child of node.children) walk(child, imageSize, lang);
}

/** Demo alert cards and captioned figures. Article rendering only. */
export function remarkA2(options = {}) {
  const imageSize = typeof options?.imageSize === "function" ? options.imageSize : () => null;
  const lang = options?.lang === "en" ? "en" : "zh";
  return (tree) => {
    walk(tree, imageSize, lang);
  };
}
