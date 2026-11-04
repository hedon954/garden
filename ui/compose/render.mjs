import { iconSvg } from "./icons.mjs";
import { SPACING_PX } from "./tokens.mjs";

const ARROW = (dir) =>
  `<svg class="g-compose-arrow" data-dir="${dir}" viewBox="0 0 10 8" width="10" height="8" aria-hidden="true" focusable="false"><path d="M5 0.7 5 6.5 M2.6 4.1 5 6.5 7.4 4.1" fill="none" stroke="currentColor" stroke-width="1.05" stroke-linecap="round" stroke-linejoin="round"></path></svg>`;

function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function textHtml(value) {
  return esc(value)
    .replaceAll("\n", "<br>")
    .replace(/`([^`]+)`/gu, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/gu, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/gu, "$1<em>$2</em>");
}

export function composeScope(doc) {
  const text = JSON.stringify(doc ?? {});
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `gc${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function safeScope(scope, doc) {
  return typeof scope === "string" && /^[A-Za-z][\w-]*$/u.test(scope) ? scope : composeScope(doc);
}

function walk(nodes, visit) {
  for (const node of nodes ?? []) {
    visit(node);
    if (node.children) walk(node.children, visit);
  }
}

function notesById(doc) {
  const map = new Map();
  const add = (note) => {
    const list = map.get(note.for) ?? [];
    list.push(note);
    map.set(note.for, list);
  };
  walk(doc.nodes, (node) => {
    if (node.type === "steps") for (const note of node.notes ?? []) add(note);
    if (node.type === "notes") for (const note of node.items ?? []) add(note);
  });
  return map;
}

const CIRCLED = ["①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧"];

function badgeHtml(badge) {
  if (!badge?.text) return "";
  const index = /^[①②③④⑤⑥⑦⑧⑨]$/u.test(badge.text);
  const cls = index ? "g-compose-index" : "g-compose-badge";
  const size = badge.size ? ` data-size="${esc(badge.size)}"` : "";
  return `<span class="${cls}" data-tone="${esc(badge.tone || "accent")}"${size}>${textHtml(badge.text)}</span>`;
}

const SHIELD = iconSvg("shield") || "";

function kpiHtml(kpi) {
  if (!kpi?.value) return "";
  const unit = kpi.unit ? `<span class="g-compose-kpi-unit">${textHtml(kpi.unit)}</span>` : "";
  const label = kpi.label ? `<span class="g-compose-kpi-label">${textHtml(kpi.label)}</span>` : "";
  return `<span class="g-compose-kpi"><span class="g-compose-kpi-value">${textHtml(kpi.value)}</span>${unit}${label}</span>`;
}

const PHRASING = new Set(["badge", "kpi", "text", "title", "caption", "icon"]);

function noteHtml(note) {
  const kicker = note.title ? `<p class="g-compose-note-k">${textHtml(note.title)}</p>` : "";
  return `<div class="g-compose-note">${kicker}<p class="g-compose-note-text">${textHtml(note.text)}</p></div>`;
}

function disclosure(ctx, className, tone, face, notes, id) {
  const open = ctx.opened ? "" : " open";
  ctx.opened = true;
  const body = notes.map((note) => noteHtml(note)).join("");
  return `<details class="g-compose-disclosure" name="${ctx.scope}" id="${ctx.scope}-${esc(id)}"${open}><summary class="${className}" data-tone="${esc(tone)}">${face}</summary>${body}</details>`;
}

function tokenStyle(node) {
  const parts = [];
  if (node.padding != null && SPACING_PX[node.padding] != null) {
    parts.push(`--gc-pad:${SPACING_PX[node.padding]}px`);
  }
  if (node.gap != null && SPACING_PX[node.gap] != null) {
    parts.push(`--gc-gap:${SPACING_PX[node.gap]}px`);
  }
  return parts.length ? ` style="${parts.join(";")}"` : "";
}

function tokenData(node, { skip = [] } = {}) {
  const bits = [];
  const skipSet = new Set(skip);
  if (node.padding != null && !skipSet.has("padding")) bits.push(` data-pad="${node.padding}"`);
  if (node.gap != null && !skipSet.has("gap")) bits.push(` data-gap="${node.gap}"`);
  if (node.radius) bits.push(` data-radius="${esc(node.radius)}"`);
  if (node.background) bits.push(` data-bg="${esc(node.background)}"`);
  if (node.size) bits.push(` data-size="${esc(node.size)}"`);
  if (node.align && node.align !== "start") bits.push(` data-align="${esc(node.align)}"`);
  if (node.justify) bits.push(` data-justify="${esc(node.justify)}"`);
  if (node.border) bits.push(` data-border="${esc(node.border)}"`);
  if (node.wrap) bits.push(` data-wrap="${esc(node.wrap)}"`);
  return bits.join("");
}

function attrIf(name, value, fallback) {
  return value && value !== fallback ? ` data-${name}="${esc(value)}"` : "";
}

function renderNode(node, ctx) {
  switch (node.type) {
    case "stack":
      return `<div class="g-compose-stack"${tokenData(node)}${tokenStyle(node)}>${node.children.map((child) => renderNode(child, ctx)).join("")}</div>`;
    case "row":
      return `<div class="g-compose-row"${tokenData(node)}${tokenStyle(node)}>${node.children.map((child) => renderNode(child, ctx)).join("")}</div>`;
    case "grid":
      return `<div class="g-compose-grid" data-cols="${node.cols || 2}"${tokenData(node)}${tokenStyle(node)}>${node.children.map((child) => renderNode(child, ctx)).join("")}</div>`;
    case "grid-item":
      return `<div class="g-compose-grid-item" data-span="${node.span || 1}"${tokenData(node)}${tokenStyle(node)}>${node.children.map((child) => renderNode(child, ctx)).join("")}</div>`;
    case "card":
      return renderCard(node, ctx);
    case "title":
      return renderText(node, ctx, "g-compose-h");
    case "text":
      return renderText(node, ctx, "g-compose-text");
    case "caption":
      return renderText({ ...node, tone: "muted" }, ctx, "g-compose-caption-inline");
    case "steps":
      return renderSteps(node, ctx);
    case "compare":
      return `<div class="g-compose-compare">${node.items
        .map((item) => `<div class="g-compose-card" data-tone="${esc(item.tone)}">${item.title ? `<span class="g-compose-card-title">${textHtml(item.title)}</span>` : ""}${item.text ? `<span class="g-compose-card-text">${textHtml(item.text)}</span>` : ""}</div>`)
        .join("")}</div>`;
    case "callout":
      return `<aside class="g-compose-callout" data-tone="${esc(node.tone)}"><p>${textHtml(node.text)}</p></aside>`;
    case "divider":
      return `<hr class="g-compose-divider">`;
    case "badge":
      return badgeHtml(node);
    case "kpi":
      return kpiHtml(node);
    case "icon":
      return iconSvg(node.name, { size: node.size || "md", inline: node.inline }) || "";
    case "arrow":
      return ARROW(node.direction === "right" || node.direction === "left" || node.direction === "up" ? node.direction : "down");
    case "fan":
      return fanHtml(node.count);
    case "join":
      return joinHtml(node.text);
    case "lanes":
      return lanesHtml(node);
    case "notes":
      return "";
    default: {
      const unhandled = node.type;
      throw new Error(`compose render missing ${String(unhandled)}`);
    }
  }
}

function renderText(node, ctx, className) {
  const tag = ctx.phrasing ? "span" : "p";
  const align = node.align === "center" || node.align === "start" || node.align === "end" ? ` data-align="${node.align}"` : "";
  const tone = attrIf("tone", node.tone, "plain");
  const size = node.size ? ` data-size="${esc(node.size)}"` : "";
  return `<${tag} class="${className}"${align}${tone}${size}>${textHtml(node.text)}</${tag}>`;
}

function fanHtml(count) {
  return `<div class="g-compose-fan" data-n="${count}">${Array.from({ length: count }, () => ARROW("down")).join("")}</div>`;
}

function joinHtml(text) {
  return `<div class="g-compose-join"><svg class="g-compose-join-svg" viewBox="0 0 600 72" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false"><path d="M18 8 L300 66 L582 8 L300 66 L300 1" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/></svg><div class="g-compose-join-label">${textHtml(text)}</div></div>`;
}

function lanesHtml(node) {
  const cols = node.actors.length;
  const heads = node.actors.map((actor) => `<p class="g-compose-lane-pill">${textHtml(actor)}</p>`).join("");
  const lives = node.actors.map((_, index) => `<i class="g-compose-lane-life" style="--i:${index}"></i>`).join("");
  const rows = node.messages.map((message, index) => {
    const start = Math.min(message.from, message.to);
    const end = Math.max(message.from, message.to) + 1;
    const span = end - start;
    const way = message.from < message.to ? "right" : "left";
    const n = CIRCLED[index] ?? String(index + 1);
    const route = `${node.actors[message.from - 1]} → ${node.actors[message.to - 1]}`;
    return `<div class="g-compose-lane-row"><div class="g-compose-lane-msg" data-tone="${esc(message.tone)}" data-way="${way}" style="grid-column:${start} / ${end};--span:${span}"><span class="g-compose-lane-label">${textHtml(`${n} ${message.text}`)}</span><span class="g-compose-lane-shaft" aria-hidden="true"></span><span class="g-compose-lane-route">${textHtml(route)}</span></div></div>`;
  }).join("");
  return `<div class="g-compose-lanes" style="--cols:${cols}"><div class="g-compose-lanes-head">${heads}</div><div class="g-compose-lanes-stage">${lives}${rows}</div></div>`;
}

function faceOf(node, ctx, phrasing) {
  const titleClass = node.type === "card" ? "g-compose-card-title" : "g-compose-step-title";
  const textClass = node.type === "card" ? "g-compose-card-text" : "g-compose-step-text";
  const mark = node.mark === "shield" ? SHIELD : "";
  const title = node.title ? `<span class="${titleClass}">${mark}${textHtml(node.title)}</span>` : "";
  const text = node.text ? `<span class="${textClass}">${textHtml(node.text)}</span>` : "";
  const head = badgeHtml(node.badge) || title
    ? `<span class="g-compose-card-line">${badgeHtml(node.badge)}${title}</span>`
    : "";
  const children = (node.children ?? []).map((child) => renderNode(child, { ...ctx, phrasing })).join("");
  return `${head}${kpiHtml(node.kpi)}${text}${children}`;
}

function cardAttrs(node) {
  const tone = node.tone || "plain";
  const frame = node.frame && node.frame !== "card" ? ` data-frame="${esc(node.frame)}"` : "";
  const align = node.align === "center" || node.align === "end" ? ` data-align="${esc(node.align)}"` : "";
  return ` data-tone="${esc(tone)}"${frame}${align}${tokenData(node, { skip: ["align"] })}${tokenStyle(node)}`;
}

function renderCard(node, ctx) {
  const notes = node.id ? ctx.notesById.get(node.id) ?? [] : [];
  const blocks = (node.children ?? []).some((child) => !PHRASING.has(child.type));
  const tone = node.tone || "plain";
  if (notes.length && !blocks) return disclosure(ctx, "g-compose-card", tone, faceOf(node, ctx, true), notes, node.id);
  const card = `<div class="g-compose-card"${cardAttrs(node)}>${faceOf(node, ctx, false)}</div>`;
  if (!notes.length) return card;
  const label = node.title || node.id;
  return `${card}${disclosure(ctx, "g-compose-step", "plain", `<span class="g-compose-step-title">${textHtml(label)}</span>`, notes, node.id)}`;
}

function renderSteps(node, ctx) {
  const arrowDir = node.direction === "row" ? "right" : "down";
  const bits = [];
  node.items.forEach((item, index) => {
    if (index > 0 && node.arrow !== false) bits.push(ARROW(arrowDir));
    const notes = item.id ? ctx.notesById.get(item.id) ?? [] : [];
    const face = `${badgeHtml(item.badge)}${item.title ? `<span class="g-compose-step-title">${textHtml(item.title)}</span>` : ""}${item.text ? `<span class="g-compose-step-text">${textHtml(item.text)}</span>` : ""}${kpiHtml(item.kpi)}`;
    bits.push(notes.length
      ? disclosure(ctx, "g-compose-step", item.tone || "plain", face, notes, item.id)
      : `<div class="g-compose-step" data-tone="${esc(item.tone || "plain")}">${face}</div>`);
  });
  return `<div class="g-compose-steps" data-dir="${node.direction === "row" ? "row" : "col"}">${bits.join("")}</div>`;
}

/** Static HTML. Interaction is radio + CSS; every string is escaped text. */
export function renderCompose(doc, options = {}) {
  const scope = safeScope(options.scope, doc);
  const ctx = { scope, notesById: notesById(doc), opened: false, phrasing: false };
  const head = [];
  if (doc?.title) head.push(`<p class="g-compose-title">${textHtml(doc.title)}</p>`);
  if (doc?.caption) head.push(`<p class="g-compose-caption">${textHtml(doc.caption)}</p>`);
  const header = head.length ? `<header class="g-compose-head">${head.join("")}</header>` : "";
  const body = (doc?.nodes ?? []).map((node) => renderNode(node, ctx)).join("");
  const label = doc?.title ? ` aria-label="${esc(doc.title)}"` : "";
  return `<figure class="g-compose"${label}><div class="g-compose-body">${header}${body}</div></figure>`;
}

/** Reader-visible strings. Intent, ids, and prop names stay out. */
export function composeText(doc) {
  const parts = [];
  if (doc?.title) parts.push(doc.title);
  if (doc?.caption) parts.push(doc.caption);
  const pushItem = (item) => {
    if (!item || typeof item !== "object") return;
    if (item.title) parts.push(item.title);
    if (item.text) parts.push(item.text);
    if (item.badge?.text) parts.push(item.badge.text);
    if (item.kpi?.value) parts.push(item.kpi.value);
    if (item.kpi?.unit) parts.push(item.kpi.unit);
    if (item.kpi?.label) parts.push(item.kpi.label);
    if (item.type === "icon" && item.name) parts.push(item.name);
  };
  walk(doc?.nodes, (node) => {
    pushItem(node);
    for (const item of node.items ?? []) pushItem(item);
    for (const note of node.notes ?? []) pushItem(note);
    for (const actor of node.actors ?? []) parts.push(actor);
    for (const message of node.messages ?? []) if (message.text) parts.push(message.text);
  });
  return parts.filter(Boolean).join("\n");
}
