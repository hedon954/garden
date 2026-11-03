import { parse as parseYaml } from "yaml";

export const PRIMITIVES = [
  "stack",
  "row",
  "card",
  "title",
  "text",
  "steps",
  "compare",
  "callout",
  "divider",
  "badge",
  "kpi",
  "arrow",
  "fan",
  "join",
  "lanes",
  "notes",
];

const ROOT_META = ["title", "caption", "intent"];
const ROOT_BODY = ["steps", "notes", "tree", "children"];
const TONES = ["plain", "accent", "muted"];
const ALIGNS = ["start", "center"];
const FRAMES = ["card", "band", "text", "pill"];
const MARKS = ["shield"];
const TEXT_TONES = ["plain", "muted"];
const LANE_TONES = ["forward", "back"];
const CALLOUT_TONES = ["note", "tip", "warn"];
const MAX_TEXT = 800;
const MAX_INTENT = 2000;
const MAX_NODES = 80;
const MAX_DEPTH = 8;

class ComposeInvalid extends Error {}
class ComposeUncompiled extends Error {}

const problem = (message) => {
  throw new ComposeInvalid(message);
};

const firstLine = (error) => String(error?.message ?? error).split("\n")[0];

function uncompiled(message = "这段 compose 还是想法，还没有编译成 YAML 树。") {
  return { ok: false, uncompiled: true, doc: null, error: { code: "compose-uncompiled", message } };
}

function invalid(message) {
  return { ok: false, uncompiled: false, doc: null, error: { code: "compose-invalid", message } };
}

function looksLikeTree(text) {
  return /^(?:title|caption|intent|steps|notes|tree|children|type)\s*:/mu.test(text);
}

function unknownKeys(object, allowed) {
  return Object.keys(object).filter((key) => !allowed.includes(key));
}

function asText(value, path, { required = true, max = MAX_TEXT } = {}) {
  if (value == null || value === "") {
    if (!required) return "";
    problem(`${path} 要写文字。`);
  }
  const text = typeof value === "number" && Number.isFinite(value) ? String(value) : value;
  if (typeof text !== "string") problem(`${path} 要写文字。`);
  const trimmed = text.trim();
  if (!trimmed && required) problem(`${path} 要写文字。`);
  if ([...trimmed].length > max) problem(`${path} 太长。`);
  return trimmed;
}

function asEnum(value, allowed, path, fallback) {
  if (value == null || value === "") return fallback;
  if (typeof value !== "string" || !allowed.includes(value)) problem(`${path} 只能是 ${allowed.join("、")}。`);
  return value;
}

function asBool(value, path, fallback) {
  if (value == null) return fallback;
  if (typeof value !== "boolean") problem(`${path} 要写 true 或 false。`);
  return value;
}

function asAlign(value, path) {
  return asEnum(value, ALIGNS, `${path}.align`, "start");
}

function asGap(value, path) {
  if (value == null) return 3;
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > 4) problem(`${path} 只能是 0 到 4。`);
  return value;
}

function asId(value, path, required) {
  if (value == null || value === "") {
    if (!required) return "";
    problem(`${path} 要写 id。`);
  }
  if (typeof value !== "string" && typeof value !== "number") problem(`${path} 要写 id。`);
  const id = String(value).trim();
  if (!/^[A-Za-z][\w-]*$/u.test(id) || id.length > 40) problem(`${path} 的 id 要用字母开头，只能含字母、数字、_ 和 -。`);
  return id;
}

function asBadge(value, path) {
  if (value == null || value === "") return null;
  if (typeof value === "string" || typeof value === "number") return { text: asText(value, path), tone: "accent" };
  if (typeof value !== "object" || Array.isArray(value)) problem(`${path} 要写文字或 { text, tone }。`);
  const unknown = unknownKeys(value, ["text", "tone"]);
  if (unknown.length) problem(`${path} 不支持 ${unknown.join("、")}。`);
  return { text: asText(value.text, `${path}.text`), tone: asEnum(value.tone, TONES, `${path}.tone`, "accent") };
}

function asKpi(value, path) {
  if (value == null) return null;
  if (typeof value !== "object" || Array.isArray(value)) problem(`${path} 要写 value。`);
  const unknown = unknownKeys(value, ["value", "label", "unit"]);
  if (unknown.length) problem(`${path} 不支持 ${unknown.join("、")}。`);
  if (typeof value.value !== "string" && typeof value.value !== "number") problem(`${path}.value 要写文字或数字。`);
  return {
    value: asText(value.value, `${path}.value`),
    label: value.label == null || value.label === "" ? "" : asText(value.label, `${path}.label`),
    unit: value.unit == null || value.unit === "" ? "" : asText(value.unit, `${path}.unit`),
  };
}

function asStep(value, path) {
  if (!value || typeof value !== "object" || Array.isArray(value)) problem(`${path} 要写 title。`);
  const unknown = unknownKeys(value, ["id", "title", "text", "tone", "badge", "kpi"]);
  if (unknown.length) problem(`${path} 不支持 ${unknown.join("、")}。`);
  return {
    id: asId(value.id, `${path}.id`, false),
    title: asText(value.title, `${path}.title`),
    text: value.text == null || value.text === "" ? "" : asText(value.text, `${path}.text`),
    tone: asEnum(value.tone, TONES, `${path}.tone`, "plain"),
    badge: asBadge(value.badge, `${path}.badge`),
    kpi: asKpi(value.kpi, `${path}.kpi`),
  };
}

function asCompareItem(value, path) {
  if (!value || typeof value !== "object" || Array.isArray(value)) problem(`${path} 要写 title。`);
  const unknown = unknownKeys(value, ["title", "text", "tone"]);
  if (unknown.length) problem(`${path} 不支持 ${unknown.join("、")}。`);
  return {
    title: asText(value.title, `${path}.title`),
    text: value.text == null || value.text === "" ? "" : asText(value.text, `${path}.text`),
    tone: asEnum(value.tone, TONES, `${path}.tone`, "plain"),
  };
}

function asNote(value, path) {
  if (!value || typeof value !== "object" || Array.isArray(value)) problem(`${path} 要写 for 和 text。`);
  const unknown = unknownKeys(value, ["for", "text", "title"]);
  if (unknown.length) problem(`${path} 不支持 ${unknown.join("、")}。`);
  return {
    for: asId(value.for, `${path}.for`, true),
    text: asText(value.text, `${path}.text`),
    title: value.title == null || value.title === "" ? "" : asText(value.title, `${path}.title`),
  };
}

function asList(value, path, map, { min, max }) {
  if (!Array.isArray(value)) problem(`${path} 要写成列表。`);
  if (value.length < min || value.length > max) problem(`${path} 需要 ${min} 到 ${max} 项，现在是 ${value.length} 项。`);
  return value.map((item, index) => map(item, `${path}[${index + 1}]`));
}

function coerceShorthand(value, path) {
  if (typeof value.type === "string") return value;
  const keys = Object.keys(value);
  if (keys.length !== 1 || !PRIMITIVES.includes(keys[0])) problem(`${path} 要写 type，或只写一个零件名。`);
  const type = keys[0];
  const inner = value[type];
  if (inner == null) return { type };
  if ((type === "stack" || type === "row") && Array.isArray(inner)) return { type, children: inner };
  if ((type === "steps" || type === "notes" || type === "compare") && Array.isArray(inner)) return { type, items: inner };
  if (type === "arrow" && (typeof inner === "string" || typeof inner === "number")) return { type, direction: String(inner) };
  if (type === "fan" && (typeof inner === "number" || typeof inner === "string")) return { type, count: Number(inner) };
  if (type === "join" && (typeof inner === "string" || typeof inner === "number")) return { type, text: inner };
  if ((type === "title" || type === "text" || type === "badge" || type === "callout") && (typeof inner === "string" || typeof inner === "number")) {
    return { type, text: inner };
  }
  if (typeof inner === "object" && !Array.isArray(inner)) return { type, ...inner };
  problem(`${path} 的 ${type} 写法规格不对。`);
  return { type };
}

function asLaneIndex(value, count, path) {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1 || value > count) {
    problem(`${path} 要写 1 到 ${count} 的序号。`);
  }
  return value;
}

function normalizeLanes(typed, path) {
  if (!Array.isArray(typed.actors) || typed.actors.length < 2 || typed.actors.length > 4) {
    problem(`${path}.actors 要写 2 到 4 个泳道。`);
  }
  const actors = typed.actors.map((actor, index) => asText(actor, `${path}.actors[${index + 1}]`));
  const messages = asList(typed.messages, `${path}.messages`, (value, itemPath) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) problem(`${itemPath} 要写 from、to 和 text。`);
    const unknown = unknownKeys(value, ["from", "to", "text", "tone"]);
    if (unknown.length) problem(`${itemPath} 不支持 ${unknown.join("、")}。`);
    const from = asLaneIndex(value.from, actors.length, `${itemPath}.from`);
    const to = asLaneIndex(value.to, actors.length, `${itemPath}.to`);
    if (from === to) problem(`${itemPath} 的 from 和 to 不能相同。`);
    return {
      from,
      to,
      text: asText(value.text, `${itemPath}.text`),
      tone: asEnum(value.tone, LANE_TONES, `${itemPath}.tone`, "forward"),
    };
  }, { min: 1, max: 8 });
  return { type: "lanes", actors, messages };
}

function normalizeNode(value, path, depth, state) {
  if (!value || typeof value !== "object" || Array.isArray(value)) problem(`${path} 要写成一个零件。`);
  if (depth > MAX_DEPTH) problem("嵌套太深（最多 8 层）。");
  state.nodes += 1;
  if (state.nodes > MAX_NODES) problem("节点太多（最多 80 个）。");
  const typed = coerceShorthand(value, path);
  const type = typed.type;
  if (!PRIMITIVES.includes(type)) problem(`${path} 不认识零件 ${String(type)}。`);
  const allowed = {
    stack: ["gap", "align", "children"],
    row: ["align", "children"],
    card: ["id", "title", "text", "tone", "align", "frame", "mark", "badge", "kpi", "children"],
    title: ["text", "align"],
    text: ["text", "align", "tone"],
    steps: ["direction", "arrow", "items", "notes"],
    compare: ["items"],
    callout: ["text", "tone"],
    divider: [],
    badge: ["text", "tone"],
    kpi: ["value", "label", "unit"],
    arrow: ["direction"],
    fan: ["count"],
    join: ["text"],
    lanes: ["actors", "messages"],
    notes: ["items"],
  }[type];
  const unknown = unknownKeys(typed, ["type", ...allowed]);
  if (unknown.length) problem(`${path} 不支持 ${unknown.join("、")}。`);
  if (type === "divider") return { type };
  if (type === "arrow") return { type, direction: asEnum(typed.direction, ["down", "right"], `${path}.direction`, "down") };
  if (type === "fan") {
    const count = typed.count == null ? 3 : typed.count;
    if (typeof count !== "number" || !Number.isInteger(count) || count < 2 || count > 4) problem(`${path}.count 只能是 2 到 4。`);
    return { type, count };
  }
  if (type === "join") return { type, text: asText(typed.text, `${path}.text`) };
  if (type === "lanes") return normalizeLanes(typed, path);
  if (type === "title") return { type, text: asText(typed.text, `${path}.text`), align: asAlign(typed.align, path) };
  if (type === "text") {
    return {
      type,
      text: asText(typed.text, `${path}.text`),
      align: asAlign(typed.align, path),
      tone: asEnum(typed.tone, TEXT_TONES, `${path}.tone`, "plain"),
    };
  }
  if (type === "badge") return { type, text: asText(typed.text, `${path}.text`), tone: asEnum(typed.tone, TONES, `${path}.tone`, "accent") };
  if (type === "kpi") return { type, ...asKpi({ value: typed.value, label: typed.label, unit: typed.unit }, path) };
  if (type === "callout") {
    return { type, text: asText(typed.text, `${path}.text`), tone: asEnum(typed.tone, CALLOUT_TONES, `${path}.tone`, "note") };
  }
  if (type === "stack" || type === "row") {
    const children = asNodeList(typed.children, `${path}.children`, depth, state);
    const align = asAlign(typed.align, path);
    return type === "stack" ? { type, gap: asGap(typed.gap, `${path}.gap`), align, children } : { type, align, children };
  }
  if (type === "card") {
    const children = typed.children == null ? [] : asNodeList(typed.children, `${path}.children`, depth, state);
    const title = typed.title == null || typed.title === "" ? "" : asText(typed.title, `${path}.title`);
    const text = typed.text == null || typed.text === "" ? "" : asText(typed.text, `${path}.text`);
    const badge = asBadge(typed.badge, `${path}.badge`);
    const kpi = asKpi(typed.kpi, `${path}.kpi`);
    if (!title && !text && !badge && !kpi && children.length === 0) problem(`${path} 卡片里什么都没有。`);
    const mark = typed.mark == null || typed.mark === "" ? "" : asEnum(typed.mark, MARKS, `${path}.mark`, "");
    return {
      type,
      id: asId(typed.id, `${path}.id`, false),
      title,
      text,
      tone: asEnum(typed.tone, TONES, `${path}.tone`, "plain"),
      align: asAlign(typed.align, path),
      frame: asEnum(typed.frame, FRAMES, `${path}.frame`, "card"),
      mark,
      badge,
      kpi,
      children,
    };
  }
  if (type === "steps") {
    return {
      type,
      direction: asEnum(typed.direction, ["col", "row"], `${path}.direction`, "col"),
      arrow: asBool(typed.arrow, `${path}.arrow`, true),
      items: asList(typed.items, `${path}.items`, asStep, { min: 1, max: 8 }),
      notes: typed.notes == null ? [] : asList(typed.notes, `${path}.notes`, asNote, { min: 1, max: 8 }),
    };
  }
  if (type === "compare") {
    return { type, items: asList(typed.items, `${path}.items`, asCompareItem, { min: 2, max: 4 }) };
  }
  if (type === "notes") return { type, items: asList(typed.items, `${path}.items`, asNote, { min: 1, max: 8 }) };
  problem(`${path} 不认识零件 ${type}。`);
  return { type: "divider" };
}

function asNodeList(value, path, depth, state) {
  if (!Array.isArray(value) || value.length === 0) problem(`${path} 要写至少一个零件。`);
  if (value.length > 12) problem(`${path} 太多（最多 12 个）。`);
  return value.map((item, index) => normalizeNode(item, `${path}[${index + 1}]`, depth + 1, state));
}

function collect(nodes, ids, notes) {
  for (const node of nodes) {
    if (node.type === "card" && node.id) {
      if (ids.has(node.id)) problem(`id「${node.id}」重复了。`);
      ids.add(node.id);
    }
    if (node.type === "steps") {
      for (const item of node.items) {
        if (!item.id) continue;
        if (ids.has(item.id)) problem(`id「${item.id}」重复了。`);
        ids.add(item.id);
      }
      notes.push(...node.notes);
    }
    if (node.type === "notes") notes.push(...node.items);
    if (node.children) collect(node.children, ids, notes);
  }
}

function linkedCard(node, noteFors) {
  return node.type === "card" && node.id && noteFors.has(node.id);
}

function checkNesting(nodes, insideLabel, noteFors) {
  for (const node of nodes) {
    const stepsLinked = node.type === "steps" && node.items.some((item) => item.id && noteFors.has(item.id));
    const cardLinked = linkedCard(node, noteFors);
    if (insideLabel && (cardLinked || stepsLinked)) problem("点选卡片不要套在另一张点选卡片里。");
    if (node.children) checkNesting(node.children, insideLabel || cardLinked, noteFors);
  }
}

function normalizeRoot(parsed) {
  const keys = Object.keys(parsed);
  if (!keys.some((key) => ROOT_BODY.includes(key))) throw new ComposeUncompiled();
  const unknown = keys.filter((key) => !ROOT_META.includes(key) && !ROOT_BODY.includes(key));
  if (unknown.length) problem(`不支持的键 ${unknown.join("、")}。`);
  if ((parsed.tree || parsed.children) && (parsed.steps || parsed.notes)) problem("tree 和 steps 只能写一种。");
  if (parsed.tree && parsed.children) problem("tree 和 children 只能写一种。");
  const state = { nodes: 0 };
  let nodes;
  if (parsed.steps || (parsed.notes && !parsed.tree && !parsed.children)) {
    if (!parsed.steps) problem("notes 要跟 steps 一起写，或放在 tree 里。");
    nodes = [normalizeNode({ type: "steps", items: parsed.steps, notes: parsed.notes, arrow: true, direction: "col" }, "steps", 1, state)];
  } else {
    const list = parsed.tree ?? parsed.children;
    nodes = asNodeList(list, "tree", 0, state);
  }
  const ids = new Set();
  const notes = [];
  collect(nodes, ids, notes);
  const noteFors = new Set(notes.map((note) => note.for));
  for (const note of notes) {
    if (!ids.has(note.for)) problem(`注释指向的 ${note.for} 不存在。`);
  }
  checkNesting(nodes, false, noteFors);
  return {
    title: parsed.title == null || parsed.title === "" ? "" : asText(parsed.title, "title"),
    caption: parsed.caption == null || parsed.caption === "" ? "" : asText(parsed.caption, "caption"),
    intent: parsed.intent == null || parsed.intent === "" ? "" : asText(parsed.intent, "intent", { max: MAX_INTENT }),
    nodes,
  };
}

/**
 * A compose fence body.
 * Plain language (or YAML with no tree) is uncompiled.
 * A YAML tree that breaks the catalog is compose-invalid.
 */
export function parseCompose(body) {
  const text = String(body ?? "").replace(/\s+$/u, "");
  if (!text.trim()) return uncompiled();
  let parsed;
  try {
    parsed = parseYaml(text);
  } catch (error) {
    if (!looksLikeTree(text)) return uncompiled();
    return invalid(`YAML 解析失败：${firstLine(error)}`);
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return uncompiled();
  try {
    return { ok: true, uncompiled: false, doc: normalizeRoot(parsed), error: null };
  } catch (error) {
    if (error instanceof ComposeUncompiled) return uncompiled();
    if (error instanceof ComposeInvalid) return invalid(error.message);
    throw error;
  }
}
