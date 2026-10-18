import { parse as parseYaml } from "yaml";
import { CATALOG, knownName, legacyOf } from "./catalog.mjs";

const FENCE_RE = /^( {0,3})(`{3,}|~{3,})(.*)$/u;

/** Fences in document order. Line numbers are 1-based in `markdown`. */
export function scanFences(markdown) {
  const lines = String(markdown ?? "").split(/\r?\n/u);
  const fences = [];
  let open = null;
  lines.forEach((line, index) => {
    const match = FENCE_RE.exec(line);
    if (open) {
      const closer = match
        && match[2][0] === open.marker[0]
        && match[2].length >= open.marker.length
        && !match[3].trim()
        && match[1].length <= open.indent;
      if (closer) {
        fences.push({
          indent: open.indent,
          marker: open.marker,
          info: open.info,
          lang: open.lang,
          meta: open.meta,
          line: open.line,
          endLine: index + 1,
          body: open.body.join("\n"),
        });
        open = null;
      } else {
        open.body.push(line);
      }
      return;
    }
    if (!match) return;
    const info = match[3].trim();
    const lang = info.split(/\s+/u)[0] ?? "";
    open = {
      indent: match[1].length,
      marker: match[2],
      info,
      lang: lang.toLowerCase(),
      meta: info.slice(lang.length).trim(),
      line: index + 1,
      body: [],
    };
  });
  if (open) {
    fences.push({ ...open, endLine: lines.length, body: open.body.join("\n"), unclosed: true });
  }
  return fences;
}

export function isGardenLang(lang) {
  return lang === "garden" || String(lang || "").startsWith("garden:");
}

/** `garden`, `garden stat`, `garden stat #id`, or legacy `garden:stat`. */
export function parseGardenInfo(info) {
  const raw = String(info ?? "").trim();
  const legacy = /^garden:([a-z][\w-]*)$/iu.exec(raw.split(/\s+/u)[0] ?? "");
  if (legacy) {
    const id = /#([\w-]+)/u.exec(raw)?.[1] ?? null;
    return { legacy: true, legacyLang: legacy[0].toLowerCase(), name: legacy[1].toLowerCase(), id };
  }
  if (!/^garden(?:\s|$)/iu.test(raw)) return null;
  const rest = raw.slice("garden".length).trim();
  if (!rest) return { legacy: false, name: "", id: null };
  const match = /^([a-z][\w-]*)(?:\s+#([\w-]+))?$/iu.exec(rest);
  if (!match) return { legacy: false, name: rest.split(/\s+/u)[0].toLowerCase(), id: null, bad: true };
  return { legacy: false, name: match[1].toLowerCase(), id: match[2] ?? null };
}

export function splitPropsAndChildren(body) {
  const text = String(body ?? "").replace(/\s+$/u, "");
  const lines = text.split("\n");
  const sep = lines.findIndex((line, index) => index > 0 && /^---\s*$/u.test(line));
  if (sep === -1) return { yamlText: text, children: "" };
  return { yamlText: lines.slice(0, sep).join("\n"), children: lines.slice(sep + 1).join("\n").replace(/^\n/u, "") };
}

function asObject(value) {
  if (Array.isArray(value)) return { items: value };
  if (value && typeof value === "object") return value;
  return null;
}

/**
 * One node: { name, props, children }.
 * An empty name is an idea. Invalid YAML or an unknown name is still returned,
 * with `error` set, so the checker and the renderer share one parse.
 */
export function parseGardenBlock(info, body) {
  const header = parseGardenInfo(info);
  if (!header) return null;
  const { yamlText, children } = splitPropsAndChildren(body);
  if (!header.name) {
    const text = String(body ?? "").trim();
    return { name: "", props: header.id ? { id: header.id } : {}, children: text, idea: text, legacy: header.legacy, legacyLang: header.legacyLang };
  }
  let parsed;
  try {
    parsed = yamlText.trim() ? parseYaml(yamlText) : {};
  } catch (error) {
    return {
      name: header.name,
      props: {},
      children,
      id: header.id,
      legacy: header.legacy,
      legacyLang: header.legacyLang,
      error: { code: "garden-yaml", message: `YAML 解析失败：${error.message}` },
    };
  }
  const props = asObject(parsed);
  if (!props) {
    return {
      name: header.name,
      props: {},
      children,
      id: header.id,
      legacy: header.legacy,
      error: { code: "garden-yaml", message: "YAML 必须是一组键值，或条目列表。" },
    };
  }
  if (header.id && props.id == null) props.id = header.id;
  const spec = CATALOG[header.name];
  if (!knownName(header.name) || !spec) {
    return {
      name: header.name,
      props,
      children,
      id: header.id ?? props.id ?? null,
      legacy: header.legacy,
      legacyLang: header.legacyLang,
      error: { code: "garden-name", message: `未知名字 ${header.name}` },
    };
  }
  const unknown = Object.keys(props).filter((key) => key !== "id" && !spec.keys.includes(key) && !spec.builtKeys?.includes(key));
  if (unknown.length) {
    return {
      name: header.name,
      props,
      children,
      id: header.id ?? props.id ?? null,
      legacy: header.legacy,
      error: { code: "garden-yaml", message: `不支持的键 ${unknown.join("、")}`, unknown, allowed: spec.keys },
    };
  }
  return {
    name: header.name,
    props,
    children,
    id: header.id ?? props.id ?? null,
    legacy: Boolean(header.legacy),
    legacyLang: header.legacyLang,
  };
}

export function fenceInfo(fence) {
  if (!fence) return "";
  if (fence.lang === "garden") return `garden${fence.meta ? ` ${fence.meta}` : ""}`.trim();
  return fence.info || fence.lang;
}

export function classifyFence(fence) {
  const legacy = legacyOf(fence.lang);
  if (legacy) return { kind: "legacy", ...legacy, fence };
  if (fence.lang === "html" && /\bgarden\b/u.test(fence.meta)) {
    return { kind: "legacy", lang: "html", name: "html", suggestion: "`html garden` 已改为 `garden html`", fence };
  }
  if (isGardenLang(fence.lang)) {
    const block = parseGardenBlock(fenceInfo(fence), fence.body);
    return { kind: "garden", block, fence };
  }
  if (fence.lang === "diff") return { kind: "diff", fence };
  if (fence.lang === "mermaid") return { kind: "mermaid", fence };
  return { kind: "code", fence };
}

const COMPONENT_LANGS = new Set(["mermaid", "diff", "embed", "widget", "intent", "ui", "ui-error", "html"]);

export function isFullCodeFence(fence) {
  if (!fence || fence.kind && fence.kind !== "code") return false;
  const lang = fence.lang ?? fence.fence?.lang;
  if (!lang) return true;
  if (COMPONENT_LANGS.has(lang) || isGardenLang(lang)) return false;
  return true;
}

export function blanksBetween(markdown, fromLine, toLine) {
  const lines = String(markdown).split(/\r?\n/u);
  for (let line = fromLine; line < toLine - 1; line += 1) {
    if (lines[line]?.trim()) return false;
  }
  return true;
}
