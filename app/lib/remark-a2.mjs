import { toString } from "mdast-util-to-string";

const ALERT_TITLE = {
  note: "提醒",
  tip: "建议",
  important: "重要",
  warning: "警告",
  caution: "注意",
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
  tip: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6 12.5h4M6.5 14.5h3M8 1.75a4.5 4.5 0 0 0-2.6 8.2c.4.3.6.7.6 1.2v.35h4v-.35c0-.5.2-.9.6-1.2A4.5 4.5 0 0 0 8 1.75Z"/></svg>',
  important: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2.25 3.25a1 1 0 0 1 1-1h9.5a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H7l-3 2.5v-2.5h-.75a1 1 0 0 1-1-1Z"/><path d="M8 4.75v3"/><path d="M8 9.4v.1" stroke-width="2"/></svg>',
  warning: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 2 1.75 13.25h12.5Z"/><path d="M8 6.5v3.25"/><path d="M8 11.6v.1" stroke-width="2"/></svg>',
  caution: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5.3 1.75h5.4l3.55 3.55v5.4l-3.55 3.55H5.3l-3.55-3.55V5.3Z"/><path d="M8 4.75v3.75"/><path d="M8 10.9v.1" stroke-width="2"/></svg>',
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

function alertTitle(kind, label) {
  return {
    type: "paragraph",
    data: { hName: "p", hProperties: { className: ["markdown-alert-title"] } },
    children: [
      { type: "html", value: ALERT_ICON[kind] },
      { type: "text", value: label || ALERT_TITLE[kind] },
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

function rewriteAlert(node) {
  const children = node.children ?? [];
  const gfm = gfmAlert(children[0]);
  const legacy = gfm ? null : legacyAlert(children[0]);
  if (!gfm && !legacy) return;
  const kind = gfm ? gfm.kind : legacy;
  let label = gfm ? gfm.label : "";
  let rest = gfm?.body ? [gfm.body, ...children.slice(1)] : children.slice(1);
  if (!label) {
    const custom = strongOnlyText(rest.find((child) => !isBlankParagraph(child)));
    if (custom) {
      label = custom;
      const index = rest.findIndex((child) => !isBlankParagraph(child));
      rest = rest.filter((_, childIndex) => childIndex !== index);
    }
  }
  while (rest.length && isBlankParagraph(rest[0])) rest.shift();
  node.children = [alertTitle(kind, label), ...rest];
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

function asFigure(node) {
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
  return {
    type: "paragraph",
    data: { hName: "figure", hProperties: { className: ["fig"] } },
    children: figureChildren,
  };
}

function walk(node) {
  if (!node || typeof node !== "object" || !Array.isArray(node.children)) return;
  if (node.type === "blockquote") rewriteAlert(node);
  node.children = node.children.map((child) => asFigure(child) ?? child);
  for (const child of node.children) walk(child);
}

/** Demo alert cards and captioned figures. Article rendering only. */
export function remarkA2() {
  return (tree) => {
    walk(tree);
  };
}
