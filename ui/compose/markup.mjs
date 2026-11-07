import { isColor } from "../core/color.mjs";
/**
 * One-shot compile of a compose fence.
 * Leaves are Markdown. Composition is a catalog of tags + design tokens.
 * Unclosed tags fail. There is no stream repair and no script evaluation.
 */

import { hasIcon } from "./icons.mjs";
import {
  ALIGNS,
  BACKGROUNDS,
  BORDERS,
  JUSTIFIES,
  RADII,
  SIZES,
  SPACING,
  TONES,
  WRAPS,
  enumOr,
  spacingAttr,
} from "./tokens.mjs";

const LAYOUT = new Set([
  "box",
  "card",
  "row",
  "stack",
  "columns",
  "grid",
  "grid-item",
  "pill",
  "band",
  "steps",
  "step",
  "lanes",
  "compare",
  "item",
  "callout",
  "tabs",
  "tab",
  "list",
  "list-item",
  "table",
  "tr",
  "th",
  "td",
  "thead",
  "tbody",
  "group",
  "field",
  "header",
  "footer",
  "figure",
  "code",
  "pre",
]);
const TEXTISH = new Set([
  "title",
  "text",
  "caption",
  "badge",
  "note",
  "actor",
  "intent",
  "join",
  "label",
  "kbd",
  "link",
  "prose",
]);
const VOID = new Set([
  "arrow",
  "fan",
  "divider",
  "separator",
  "kpi",
  "icon",
  "spacer",
  "image",
  "avatar",
  "progress",
  "meter",
  "checkbox",
  "radio",
  "toggle",
  "switch",
  "input",
  "select",
  "textarea",
  "button",
  "slider",
  "stat",
  "empty",
]);
const KNOWN = new Set([...LAYOUT, ...TEXTISH, ...VOID, "message", "option"]);

const LANE_TONES = new Set(["forward", "back"]);
const CALLOUT_TONES = new Set(["note", "tip", "warn"]);
const FRAMES = new Set(["card", "band", "text", "pill"]);
const MAX_NODES = 220;
const MAX_DEPTH = 10;

class MarkupError extends Error {}

const fail = (message) => {
  throw new MarkupError(message);
};

function uncompiled(message = "这段 compose 还是想法，还没有编译成标记。") {
  return { ok: false, uncompiled: true, doc: null, error: { code: "compose-uncompiled", message } };
}

function invalid(message) {
  return { ok: false, uncompiled: false, doc: null, error: { code: "compose-invalid", message } };
}

function looksLikeYamlSlots(text) {
  return /^(?:title|caption|steps|notes|tree|children)\s*:/mu.test(text);
}

function parseAttrs(raw) {
  const source = raw.replace(/\/\s*$/u, "").trim();
  const attrs = {};
  const re = /([A-Za-z][\w-]*)\s*(?:=\s*(?:"([^"]*)"|'([^']*)'|\{([^{}]*)\}))?/gu;
  let match;
  let consumed = "";
  while ((match = re.exec(source))) {
    consumed += match[0];
    const name = match[1];
    if (match[4] != null) {
      const expr = match[4].trim();
      if (!/^-?\d+$/u.test(expr)) fail(`属性 ${name} 不支持表达式。`);
      attrs[name] = expr;
    } else if (match[2] != null) attrs[name] = match[2];
    else if (match[3] != null) attrs[name] = match[3];
    else attrs[name] = true;
  }
  if (consumed.replace(/\s+/gu, "") !== source.replace(/\s+/gu, "")) fail("标签属性写坏了。");
  return attrs;
}

function findTag(src, from) {
  let i = from;
  while (i < src.length) {
    const lt = src.indexOf("<", i);
    if (lt < 0) return null;
    const match = /^<\/?([A-Za-z][\w-]*)\b([^>]*)>/u.exec(src.slice(lt));
    if (!match) {
      i = lt + 1;
      continue;
    }
    const name = match[1].toLowerCase();
    if (!KNOWN.has(name)) fail(`不认识标签 ${name}。`);
    const body = match[2] ?? "";
    return {
      name,
      attrs: parseAttrs(body),
      closing: src[lt + 1] === "/",
      self: /\/\s*$/u.test(body),
      index: lt,
      end: lt + match[0].length,
    };
  }
  return null;
}

function markdownNodes(raw) {
  const lines = String(raw ?? "").replace(/^\n+|\n+$/u, "").split("\n");
  const nodes = [];
  let para = [];
  const flush = () => {
    const text = para.join("\n").trim();
    para = [];
    if (text) nodes.push({ type: "text", text, align: "", tone: "plain", size: "" });
  };
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      flush();
      continue;
    }
    const heading = /^#{1,3}\s+(.+)$/u.exec(trimmed);
    if (heading) {
      flush();
      nodes.push({ type: "title", text: heading[1].trim(), align: "", tone: "plain", size: "" });
      continue;
    }
    const item = /^[-*]\s+(.+)$/u.exec(trimmed);
    if (item) {
      flush();
      nodes.push({ type: "text", text: item[1].trim(), align: "", tone: "plain", size: "" });
      continue;
    }
    para.push(trimmed);
  }
  flush();
  return nodes;
}

/** Phrasing leaves: keep footnote markers like "* 假设 …"; no list/heading strip. */
const PHRASING_TAGS = new Set(["caption", "text", "title", "label", "kbd", "code", "join", "callout"]);

function phrasingNodes(raw) {
  const text = String(raw ?? "").replace(/^\n+|\n+$/u, "").trim();
  if (!text) return [];
  return [{ type: "text", text, align: "", tone: "plain", size: "" }];
}

function regionTextNodes(raw, stop) {
  return PHRASING_TAGS.has(stop) ? phrasingNodes(raw) : markdownNodes(raw);
}

function inlineText(nodes) {
  return nodes.map((node) => node.text || "").filter(Boolean).join("\n").trim();
}

function enumAttr(attrs, name, allowed, fallback) {
  const value = attrs[name];
  if (value == null || value === true || value === "") return fallback;
  if (!allowed.has(String(value))) fail(`${name} 只能是 ${[...allowed].join("、")}。`);
  return String(value);
}

function spacingOf(attrs, name, fallback = null) {
  const value = attrs[name];
  if (value == null || value === true || value === "") return fallback;
  const n = spacingAttr(value, null);
  if (n == null) fail(`${name} 只能是 0 到 4。`);
  return n;
}

function tokenBag(attrs, defaults = {}) {
  const padding = spacingOf(attrs, "padding", defaults.padding ?? null);
  const gap = spacingOf(attrs, "gap", defaults.gap ?? null);
  const radius = enumAttr(attrs, "radius", RADII, defaults.radius ?? "");
  const background = enumAttr(attrs, "background", BACKGROUNDS, defaults.background ?? "");
  const size = enumAttr(attrs, "size", SIZES, defaults.size ?? "");
  const align = enumAttr(attrs, "align", ALIGNS, defaults.align ?? "");
  const justify = enumAttr(attrs, "justify", JUSTIFIES, defaults.justify ?? "");
  let border = defaults.border ?? "";
  if (attrs.border != null) {
    if (attrs.border === true) border = "true";
    else if (attrs.border === false) border = "none";
    else border = enumAttr(attrs, "border", BORDERS, "true");
  }
  let wrap = defaults.wrap ?? "";
  if (attrs.wrap != null) {
    if (attrs.wrap === true) wrap = "wrap";
    else if (attrs.wrap === false) wrap = "nowrap";
    else wrap = enumAttr(attrs, "wrap", WRAPS, "wrap");
  }
  return { padding, gap, radius, background, size, align, justify, border, wrap };
}

function textNode(attrs, children) {
  return {
    type: "text",
    text: inlineText(children),
    align: enumAttr(attrs, "align", ALIGNS, ""),
    tone: enumAttr(attrs, "tone", TONES, "plain"),
    size: enumAttr(attrs, "size", SIZES, ""),
  };
}

function titleNode(attrs, children) {
  return {
    type: "title",
    text: inlineText(children),
    align: enumAttr(attrs, "align", ALIGNS, ""),
    tone: "plain",
    size: enumAttr(attrs, "size", SIZES, ""),
  };
}

function captionNode(attrs, children) {
  return {
    type: "caption",
    text: inlineText(children),
    align: enumAttr(attrs, "align", ALIGNS, ""),
    size: enumAttr(attrs, "size", SIZES, ""),
  };
}

function finishBox(attrs, children, frame) {
  const note = children.find((child) => child.type === "note");
  const card = boxNode(attrs, children, frame);
  if (!note || !card.id) return card;
  return {
    type: "stack",
    gap: 0,
    align: "",
    justify: "",
    wrap: "",
    children: [card, { type: "notes", items: [{ for: card.id, text: note.text, title: "" }] }],
  };
}

function boxNode(attrs, children, frame) {
  const title = children.find((child) => child.type === "title");
  const badge = children.find((child) => child.type === "badge");
  // Keep title/badge as face props for disclosure + legacy; also leave non-title children free.
  const rest = children.filter((child) => child !== title && child !== badge && child.type !== "note");
  const tokens = tokenBag(attrs, { align: frame === "pill" ? "center" : "" });
  return {
    type: "card",
    id: typeof attrs.id === "string" ? attrs.id : "",
    frame,
    tone: enumAttr(attrs, "tone", TONES, "plain"),
    mark: attrs.mark === "shield" ? "shield" : "",
    title: title?.text || "",
    titleStyle: title ? { color: title.color, backgroundColor: title.backgroundColor } : null,
    text: "",
    badge: badge ? { text: badge.text, tone: badge.tone || "accent", color: badge.color, backgroundColor: badge.backgroundColor } : null,
    kpi: null,
    children: rest,
    ...tokens,
  };
}

function layoutNode(name, attrs, children, defaults = {}) {
  const tokens = tokenBag(attrs, defaults);
  const node = {
    type: name,
    children,
    ...tokens,
  };
  if (name === "grid") {
    const cols = attrs.cols != null ? Number(attrs.cols) : attrs.columns != null ? Number(attrs.columns) : 2;
    if (!Number.isInteger(cols) || cols < 1 || cols > 6) fail("grid 的 cols 只能是 1 到 6。");
    node.cols = cols;
  }
  if (name === "grid-item") {
    const span = attrs.span != null ? Number(attrs.span) : 1;
    if (!Number.isInteger(span) || span < 1 || span > 6) fail("grid-item 的 span 只能是 1 到 6。");
    node.span = span;
  }
  return node;
}

function elementNode(tag, children) {
  const { name, attrs } = tag;
  if (VOID.has(name)) fail(`${name} 要写成自闭合标签。`);
  switch (name) {
    case "title":
      return titleNode(attrs, children);
    case "text":
    case "note":
    case "actor":
      return { ...textNode(attrs, children), type: name === "text" ? "text" : name };
    case "caption":
      return captionNode(attrs, children);
    case "badge":
      return {
        type: "badge",
        text: inlineText(children),
        tone: enumAttr(attrs, "tone", TONES, "accent"),
        size: enumAttr(attrs, "size", SIZES, ""),
      };
    case "join":
      return { type: "join", text: inlineText(children) };
    case "message": {
      const from = Number(attrs.from);
      const to = Number(attrs.to);
      if (!Number.isInteger(from) || !Number.isInteger(to)) fail("message 要写 from 和 to。");
      return {
        type: "message",
        from,
        to,
        tone: enumAttr(attrs, "tone", LANE_TONES, "forward"),
        text: inlineText(children),
      };
    }
    case "box":
      return finishBox(attrs, children, enumAttr(attrs, "frame", FRAMES, "card"));
    case "pill":
      return finishBox(
        { ...attrs, align: attrs.align || "center" },
        children.some((child) => child.type === "title")
          ? children
          : children.map((child) => (child.type === "text" ? { ...child, type: "title" } : child)),
        "pill",
      );
    case "band":
      return finishBox(attrs, children, "band");
    case "stack":
      return layoutNode("stack", attrs, children, { gap: 3 });
    case "row":
      return layoutNode("row", attrs, children, { gap: 2, wrap: "wrap" });
    case "grid":
      return layoutNode("grid", attrs, children, { gap: 3 });
    case "grid-item":
      return layoutNode("grid-item", attrs, children, {});
    case "lanes": {
      const actors = children.filter((child) => child.type === "actor").map((child) => child.text);
      const messages = children.filter((child) => child.type === "message");
      if (actors.length < 2 || actors.length > 4) fail("lanes 要有 2 到 4 条泳道。");
      if (!messages.length || messages.length > 8) fail("lanes 要有 1 到 8 条消息。");
      for (const message of messages) {
        if (message.from < 1 || message.from > actors.length || message.to < 1 || message.to > actors.length) {
          fail("message 的 from 和 to 要落在泳道上。");
        }
        if (message.from === message.to) fail("message 的 from 和 to 不能相同。");
      }
      return { type: "lanes", actors, messages };
    }
    case "steps": {
      const steps = children.filter((child) => child.type === "step");
      if (!steps.length || steps.length > 8) fail("steps 要有 1 到 8 步。");
      return {
        type: "steps",
        direction: attrs.dir === "row" ? "row" : "col",
        arrow: true,
        items: steps.map(({ note, ...item }) => item),
        notes: steps.filter((step) => step.note && step.id).map((step) => ({ for: step.id, text: step.note, title: "" })),
      };
    }
    case "step": {
      const title = children.find((child) => child.type === "title");
      const text = children.find((child) => child.type === "text");
      const badge = children.find((child) => child.type === "badge");
      const note = children.find((child) => child.type === "note");
      return {
        type: "step",
        id: typeof attrs.id === "string" ? attrs.id : "",
        title: title?.text || "",
        text: text?.text || "",
        tone: enumAttr(attrs, "tone", TONES, "plain"),
        badge: badge ? { text: badge.text, tone: badge.tone || "accent", color: badge.color, backgroundColor: badge.backgroundColor } : null,
        kpi: null,
        note: note?.text || "",
      };
    }
    case "compare": {
      const items = children.filter((child) => child.type === "item");
      if (items.length < 2 || items.length > 4) fail("compare 要有 2 到 4 项。");
      return { type: "compare", items };
    }
    case "item": {
      const title = children.find((child) => child.type === "title");
      const text = children.find((child) => child.type === "text");
      return { type: "item", title: title?.text || "", text: text?.text || "", tone: enumAttr(attrs, "tone", TONES, "plain") };
    }
    case "callout":
      return { type: "callout", tone: enumAttr(attrs, "tone", CALLOUT_TONES, "note"), text: inlineText(children) };
    case "card":
      return finishBox(attrs, children, enumAttr(attrs, "frame", FRAMES, "card"));
    case "columns":
      return layoutNode("columns", attrs, children, { gap: 3, wrap: "wrap" });
    case "tabs": {
      const tabs = children.filter((child) => child.type === "tab");
      if (!tabs.length) fail("tabs 至少要有一个 tab。");
      return { type: "tabs", children: tabs };
    }
    case "tab":
      return {
        type: "tab",
        title: attrs.title != null && attrs.title !== true ? String(attrs.title) : inlineText(children.filter((c) => c.type === "title")).replace(/^$/,"") || "Tab",
        active: attrs.active === true || attrs.active === "true",
        children: children.filter((c) => c.type !== "title"),
      };
    case "list":
      return {
        type: "list",
        ordered: attrs.ordered === true || attrs.ordered === "true" || attrs.type === "ol",
        children: children.filter((c) => c.type === "list-item" || c.type === "text" || c.type === "title" || c.type === "caption" || c.type === "badge" || c.type === "icon" || c.type === "row" || c.type === "stack" || c.type === "card"),
      };
    case "list-item":
      return { type: "list-item", children };
    case "table":
      return { type: "table", children };
    case "thead":
    case "tbody":
      return { type: name, children };
    case "tr":
      return { type: "tr", children };
    case "th":
    case "td":
      return { type: name, text: inlineText(children), children, align: enumAttr(attrs, "align", ALIGNS, "") };
    case "group":
    case "field":
    case "header":
    case "footer":
    case "figure":
      return layoutNode(name, attrs, children, { gap: name === "field" ? 1 : 2 });
    case "code":
    case "pre":
      return { type: "code", text: inlineText(children), language: attrs.language || attrs.lang ? String(attrs.language || attrs.lang) : "" };
    case "label":
      return { type: "label", text: inlineText(children), size: enumAttr(attrs, "size", SIZES, "") };
    case "kbd":
      return { type: "kbd", text: inlineText(children) };
    case "link":
      return {
        type: "link",
        href: attrs.href != null && attrs.href !== true ? String(attrs.href) : "#",
        text: inlineText(children),
      };
    case "prose":
      return { type: "prose", children };
    case "option":
      return {
        type: "option",
        value: attrs.value != null && attrs.value !== true ? String(attrs.value) : inlineText(children),
        text: inlineText(children),
        selected: attrs.selected === true || attrs.selected === "true",
      };
    default:
      fail(`不认识标签 ${name}。`);
  }
  return { type: "text", text: "", align: "", tone: "plain", size: "" };
}

function voidNode(tag) {
  const { name, attrs } = tag;
  if (name === "arrow") {
    const direction = attrs.dir || attrs.direction || "down";
    if (direction !== "down" && direction !== "right" && direction !== "left" && direction !== "up") {
      fail("arrow 的 dir 只能是 down、up、left 或 right。");
    }
    return { type: "arrow", direction };
  }
  if (name === "fan") {
    const count = Number(attrs.n || attrs.count || 3);
    if (!Number.isInteger(count) || count < 2 || count > 4) fail("fan 的 n 只能是 2 到 4。");
    return { type: "fan", count };
  }
  if (name === "divider") return { type: "divider" };
  if (name === "kpi") {
    if (attrs.value == null || attrs.value === true) fail("kpi 要写 value。");
    return {
      type: "kpi",
      value: String(attrs.value),
      unit: attrs.unit ? String(attrs.unit) : "",
      label: attrs.label ? String(attrs.label) : "",
    };
  }
  if (name === "icon") {
    const iconName = attrs.name == null || attrs.name === true ? "" : String(attrs.name);
    if (!iconName) fail("icon 要写 name。");
    if (!hasIcon(iconName)) fail(`不认识图标 ${iconName}。`);
    return {
      type: "icon",
      name: iconName,
      size: enumAttr(attrs, "size", SIZES, "md"),
      inline: attrs.inline === true || attrs.inline === "true",
    };
  }
  if (name === "separator") return { type: "divider" };
  if (name === "spacer") {
    const size = enumAttr(attrs, "size", SIZES, "md");
    const n = spacingOf(attrs, "gap", size === "sm" ? 1 : size === "lg" ? 3 : size === "xl" ? 4 : 2);
    return { type: "spacer", gap: n };
  }
  if (name === "image") {
    const src = attrs.src != null && attrs.src !== true ? String(attrs.src) : "";
    if (!src) fail("image 要写 src。");
    return {
      type: "image",
      src,
      alt: attrs.alt != null && attrs.alt !== true ? String(attrs.alt) : "",
      size: enumAttr(attrs, "size", SIZES, "md"),
    };
  }
  if (name === "avatar") {
    return {
      type: "avatar",
      label: attrs.label != null && attrs.label !== true ? String(attrs.label) : (attrs.name != null && attrs.name !== true ? String(attrs.name) : "?"),
      size: enumAttr(attrs, "size", SIZES, "md"),
    };
  }
  if (name === "progress" || name === "meter") {
    const value = attrs.value != null && attrs.value !== true ? Number(attrs.value) : 0;
    const max = attrs.max != null && attrs.max !== true ? Number(attrs.max) : 100;
    return {
      type: name === "meter" ? "meter" : "progress",
      value: Number.isFinite(value) ? value : 0,
      max: Number.isFinite(max) && max > 0 ? max : 100,
      label: attrs.label != null && attrs.label !== true ? String(attrs.label) : "",
    };
  }
  if (name === "checkbox" || name === "radio") {
    return {
      type: name,
      checked: attrs.checked === true || attrs.checked === "true",
      label: attrs.label != null && attrs.label !== true ? String(attrs.label) : "",
      disabled: attrs.disabled === true || attrs.disabled === "true",
    };
  }
  if (name === "toggle" || name === "switch") {
    return {
      type: "toggle",
      checked: attrs.checked === true || attrs.checked === "true" || attrs.on === true || attrs.on === "true",
      label: attrs.label != null && attrs.label !== true ? String(attrs.label) : "",
    };
  }
  if (name === "input") {
    return {
      type: "input",
      value: attrs.value != null && attrs.value !== true ? String(attrs.value) : "",
      placeholder: attrs.placeholder != null && attrs.placeholder !== true ? String(attrs.placeholder) : "",
      label: attrs.label != null && attrs.label !== true ? String(attrs.label) : "",
    };
  }
  if (name === "select") {
    return {
      type: "select",
      value: attrs.value != null && attrs.value !== true ? String(attrs.value) : "",
      label: attrs.label != null && attrs.label !== true ? String(attrs.label) : "",
      options: attrs.options != null && attrs.options !== true ? String(attrs.options) : "",
    };
  }
  if (name === "textarea") {
    return {
      type: "textarea",
      value: attrs.value != null && attrs.value !== true ? String(attrs.value) : "",
      placeholder: attrs.placeholder != null && attrs.placeholder !== true ? String(attrs.placeholder) : "",
      label: attrs.label != null && attrs.label !== true ? String(attrs.label) : "",
    };
  }
  if (name === "button") {
    return {
      type: "button",
      text: attrs.label != null && attrs.label !== true ? String(attrs.label) : (attrs.value != null && attrs.value !== true ? String(attrs.value) : "Button"),
      tone: enumAttr(attrs, "tone", TONES, "accent"),
      size: enumAttr(attrs, "size", SIZES, "md"),
    };
  }
  if (name === "slider") {
    const value = attrs.value != null && attrs.value !== true ? Number(attrs.value) : 50;
    const min = attrs.min != null && attrs.min !== true ? Number(attrs.min) : 0;
    const max = attrs.max != null && attrs.max !== true ? Number(attrs.max) : 100;
    return {
      type: "slider",
      value: Number.isFinite(value) ? value : 50,
      min: Number.isFinite(min) ? min : 0,
      max: Number.isFinite(max) ? max : 100,
      label: attrs.label != null && attrs.label !== true ? String(attrs.label) : "",
      unit: attrs.unit != null && attrs.unit !== true ? String(attrs.unit) : "",
    };
  }
  if (name === "stat") {
    return {
      type: "stat",
      value: attrs.value != null && attrs.value !== true ? String(attrs.value) : "",
      unit: attrs.unit != null && attrs.unit !== true ? String(attrs.unit) : "",
      label: attrs.label != null && attrs.label !== true ? String(attrs.label) : "",
    };
  }
  if (name === "empty") {
    return {
      type: "empty",
      text: attrs.label != null && attrs.label !== true ? String(attrs.label) : (attrs.text != null && attrs.text !== true ? String(attrs.text) : "暂无内容"),
    };
  }
  fail(`${name} 不能自闭合。`);
  return { type: "divider" };
}

const COLOR_TAGS = new Set(["box", "card", "row", "stack", "columns", "grid", "grid-item", "pill", "band", "group", "field", "header", "footer", "figure", "title", "text", "caption", "label", "prose", "badge", "kpi", "stat", "list", "table", "tr", "th", "td", "thead", "tbody"]);
function withColors(node, tag) {
  for (const key of ["color", "backgroundColor"]) {
    if (tag.attrs[key] === undefined) continue;
    if (!COLOR_TAGS.has(tag.name)) fail(`${tag.name} 不支持 ${key}。`);
    if (!isColor(tag.attrs[key])) fail(`${key} 需要合法颜色（命名色、hex、rgb 或 hsl）。`);
    node[key] = tag.attrs[key].trim();
  }
  return node;
}

function parseRegion(src, from, stop, depth, state) {
  const nodes = [];
  let i = from;
  while (i < src.length) {
    const tag = findTag(src, i);
    if (!tag) {
      nodes.push(...regionTextNodes(src.slice(i), stop));
      i = src.length;
      break;
    }
    if (tag.index > i) nodes.push(...regionTextNodes(src.slice(i, tag.index), stop));
    if (tag.closing) {
      if (tag.name !== stop) fail(`多出来的 </${tag.name}>。`);
      return { nodes, index: tag.end };
    }
    if (depth + 1 > MAX_DEPTH) fail("嵌套太深（最多 10 层）。");
    state.nodes += 1;
    if (state.nodes > MAX_NODES) fail("节点太多（最多 220 个）。");
    if (tag.self || VOID.has(tag.name)) {
      if (!tag.self && !VOID.has(tag.name)) fail(`${tag.name} 没有闭合。`);
      if (!VOID.has(tag.name)) fail(`${tag.name} 不能自闭合。`);
      nodes.push(withColors(voidNode(tag), tag));
      i = tag.end;
      continue;
    }
    const inner = parseRegion(src, tag.end, tag.name, depth + 1, state);
    nodes.push(withColors(elementNode(tag, inner.nodes), tag));
    i = inner.index;
  }
  if (stop) fail(`缺少 </${stop}>。`);
  return { nodes, index: i };
}

function countNodes(nodes, state = { n: 0 }) {
  for (const node of nodes) {
    state.n += 1;
    if (node.children) countNodes(node.children, state);
    if (node.items) countNodes(node.items, state);
  }
  return state.n;
}

export function parseCompose(body) {
  const text = String(body ?? "").replace(/\s+$/u, "");
  if (!text.trim()) return uncompiled();
  if (!/<\/?[A-Za-z][\w-]*\b[^>]*>/u.test(text)) {
    if (looksLikeYamlSlots(text)) return invalid("不要写 YAML 槽。叶子用 Markdown，结构用标签。");
    return uncompiled();
  }
  try {
    if (/<intent\b/iu.test(text) && !/<\/intent>/iu.test(text)) fail("缺少 </intent>。");
    const intentMatch = /<intent>([\s\S]*?)<\/intent>/iu.exec(text);
    const intent = intentMatch ? intentMatch[1].trim() : "";
    const rest = intentMatch ? text.replace(intentMatch[0], "") : text;
    const { nodes } = parseRegion(rest, 0, "", 0, { nodes: 0 });
    if (!nodes.length) return uncompiled();
    if (countNodes(nodes) > MAX_NODES) fail("节点太多（最多 220 个）。");
    return {
      ok: true,
      uncompiled: false,
      doc: { title: "", caption: "", intent, nodes },
      error: null,
    };
  } catch (error) {
    if (error instanceof MarkupError) return invalid(error.message);
    throw error;
  }
}

// Re-export for docs/tests that want the catalog list.
export const CATALOG_TAGS = [...KNOWN].sort();
