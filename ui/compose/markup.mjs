/**
 * One-shot compile of a compose fence.
 * Leaves are Markdown. Composition is a catalog of tags.
 * Unclosed tags fail. There is no stream repair and no script evaluation.
 */

const LAYOUT = new Set(["box", "row", "stack", "grid", "pill", "band", "steps", "step", "lanes", "compare", "item", "callout"]);
const TEXTISH = new Set(["title", "text", "badge", "note", "actor", "intent", "join"]);
const VOID = new Set(["arrow", "fan", "divider", "kpi"]);
const KNOWN = new Set([...LAYOUT, ...TEXTISH, ...VOID, "message"]);

const TONES = new Set(["plain", "accent", "tip", "muted"]);
const LANE_TONES = new Set(["forward", "back"]);
const CALLOUT_TONES = new Set(["note", "tip", "warn"]);
const FRAMES = new Set(["card", "band", "text", "pill"]);
const ALIGNS = new Set(["start", "center"]);
const MAX_NODES = 80;
const MAX_DEPTH = 8;

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
    if (text) nodes.push({ type: "text", text, align: "", tone: "plain" });
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
      nodes.push({ type: "title", text: heading[1].trim(), align: "", tone: "plain" });
      continue;
    }
    const item = /^[-*]\s+(.+)$/u.exec(trimmed);
    if (item) {
      flush();
      nodes.push({ type: "text", text: item[1].trim(), align: "", tone: "plain" });
      continue;
    }
    para.push(trimmed);
  }
  flush();
  return nodes;
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

function textNode(attrs, children) {
  return {
    type: "text",
    text: inlineText(children),
    align: enumAttr(attrs, "align", ALIGNS, ""),
    tone: enumAttr(attrs, "tone", TONES, "plain"),
  };
}

function titleNode(attrs, children) {
  return {
    type: "title",
    text: inlineText(children),
    align: enumAttr(attrs, "align", ALIGNS, ""),
    tone: "plain",
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
    children: [card, { type: "notes", items: [{ for: card.id, text: note.text, title: "" }] }],
  };
}

function boxNode(attrs, children, frame) {
  const title = children.find((child) => child.type === "title");
  const badge = children.find((child) => child.type === "badge");
  const rest = children.filter((child) => child !== title && child !== badge && child.type !== "note");
  return {
    type: "card",
    id: typeof attrs.id === "string" ? attrs.id : "",
    frame,
    tone: enumAttr(attrs, "tone", TONES, "plain"),
    align: enumAttr(attrs, "align", ALIGNS, ""),
    mark: attrs.mark === "shield" ? "shield" : "",
    title: title?.text || "",
    text: "",
    badge: badge ? { text: badge.text, tone: badge.tone || "accent" } : null,
    kpi: null,
    children: rest,
  };
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
    case "badge":
      return { type: "badge", text: inlineText(children), tone: enumAttr(attrs, "tone", TONES, "accent") };
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
      return finishBox({ ...attrs, align: attrs.align || "center" }, children.some((child) => child.type === "title") ? children : children.map((child) => (child.type === "text" ? { ...child, type: "title" } : child)), "pill");
    case "band":
      return finishBox(attrs, children, "band");
    case "stack":
    case "row":
    case "grid":
      return {
        type: name === "grid" ? "row" : name,
        align: enumAttr(attrs, "align", ALIGNS, ""),
        gap: 3,
        children,
      };
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
        badge: badge ? { text: badge.text, tone: badge.tone || "accent" } : null,
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
    default:
      fail(`不认识标签 ${name}。`);
  }
  return { type: "text", text: "", align: "", tone: "plain" };
}

function voidNode(tag) {
  const { name, attrs } = tag;
  if (name === "arrow") {
    const direction = attrs.dir || attrs.direction || "down";
    if (direction !== "down" && direction !== "right") fail("arrow 的 dir 只能是 down 或 right。");
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
    return { type: "kpi", value: String(attrs.value), unit: attrs.unit ? String(attrs.unit) : "", label: attrs.label ? String(attrs.label) : "" };
  }
  fail(`${name} 不能自闭合。`);
  return { type: "divider" };
}

function parseRegion(src, from, stop, depth, state) {
  const nodes = [];
  let i = from;
  while (i < src.length) {
    const tag = findTag(src, i);
    if (!tag) {
      nodes.push(...markdownNodes(src.slice(i)));
      i = src.length;
      break;
    }
    if (tag.index > i) nodes.push(...markdownNodes(src.slice(i, tag.index)));
    if (tag.closing) {
      if (tag.name !== stop) fail(`多出来的 </${tag.name}>。`);
      return { nodes, index: tag.end };
    }
    if (depth + 1 > MAX_DEPTH) fail("嵌套太深（最多 8 层）。");
    state.nodes += 1;
    if (state.nodes > MAX_NODES) fail("节点太多（最多 80 个）。");
    if (tag.self || VOID.has(tag.name)) {
      if (!tag.self && !VOID.has(tag.name)) fail(`${tag.name} 没有闭合。`);
      if (!VOID.has(tag.name)) fail(`${tag.name} 不能自闭合。`);
      nodes.push(voidNode(tag));
      i = tag.end;
      continue;
    }
    const inner = parseRegion(src, tag.end, tag.name, depth + 1, state);
    nodes.push(elementNode(tag, inner.nodes));
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
    if (countNodes(nodes) > MAX_NODES) fail("节点太多（最多 80 个）。");
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
