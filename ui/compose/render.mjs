const ARROW = (dir) =>
  `<svg class="g-compose-arrow" data-dir="${dir}" viewBox="0 0 24 32" width="24" height="32" aria-hidden="true" focusable="false"><path d="M12 2v22M5 17l7 8 7-8" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"></path></svg>`;

function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function textHtml(value) {
  return esc(value).replaceAll("\n", "<br>");
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

function badgeHtml(badge) {
  if (!badge?.text) return "";
  return `<span class="g-compose-badge" data-tone="${esc(badge.tone || "accent")}">${textHtml(badge.text)}</span>`;
}

function kpiHtml(kpi) {
  if (!kpi?.value) return "";
  const unit = kpi.unit ? `<span class="g-compose-kpi-unit">${textHtml(kpi.unit)}</span>` : "";
  const label = kpi.label ? `<span class="g-compose-kpi-label">${textHtml(kpi.label)}</span>` : "";
  return `<span class="g-compose-kpi"><span class="g-compose-kpi-value">${textHtml(kpi.value)}</span>${unit}${label}</span>`;
}

const PHRASING = new Set(["badge", "kpi", "text", "title"]);

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

function renderNode(node, ctx) {
  switch (node.type) {
    case "stack":
      return `<div class="g-compose-stack" data-gap="${node.gap}">${node.children.map((child) => renderNode(child, ctx)).join("")}</div>`;
    case "row":
      return `<div class="g-compose-row">${node.children.map((child) => renderNode(child, ctx)).join("")}</div>`;
    case "card":
      return renderCard(node, ctx);
    case "title":
      return renderText(node, ctx, "g-compose-h");
    case "text":
      return renderText(node, ctx, "g-compose-text");
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
    case "arrow":
      return ARROW(node.direction === "right" ? "right" : "down");
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
  return `<${tag} class="${className}">${textHtml(node.text)}</${tag}>`;
}

function faceOf(node, ctx) {
  const titleClass = node.type === "card" ? "g-compose-card-title" : "g-compose-step-title";
  const textClass = node.type === "card" ? "g-compose-card-text" : "g-compose-step-text";
  const title = node.title ? `<span class="${titleClass}">${textHtml(node.title)}</span>` : "";
  const text = node.text ? `<span class="${textClass}">${textHtml(node.text)}</span>` : "";
  const children = (node.children ?? []).map((child) => renderNode(child, { ...ctx, phrasing: true })).join("");
  return `${badgeHtml(node.badge)}${title}${kpiHtml(node.kpi)}${text}${children}`;
}

function renderCard(node, ctx) {
  const notes = node.id ? ctx.notesById.get(node.id) ?? [] : [];
  const blocks = (node.children ?? []).some((child) => !PHRASING.has(child.type));
  const tone = node.tone || "plain";
  if (notes.length && !blocks) return disclosure(ctx, "g-compose-card", tone, faceOf(node, ctx), notes, node.id);
  const card = `<div class="g-compose-card" data-tone="${esc(tone)}">${faceOf(node, ctx)}</div>`;
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
  };
  walk(doc?.nodes, (node) => {
    pushItem(node);
    for (const item of node.items ?? []) pushItem(item);
    for (const note of node.notes ?? []) pushItem(note);
  });
  return parts.filter(Boolean).join("\n");
}
