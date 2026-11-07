/**
 * ChatGPT-shaped DIL play surface for `garden compose`.
 *
 * Authors write Markdown + lowercase tags + {@body} / {expr} / {#if} / {#each}.
 * This module lowers that document to the existing Ui IR so leaf components
 * (Slider, Chart, …) and the whitelist expression interpreter stay in place.
 * PascalCase is an internal compile target, not the author language.
 *
 * TEMP: looksLikeLegacyPlay / passthrough still accept old State/Slider trees
 * until every sample is migrated; delete that path once none remain.
 */

import { parse as parseYaml, stringify } from "yaml";

/** PascalCase interactive tags — author language we are retiring. */
const LEGACY_TAG_RE =
  /<(State|Let|Data|If|Each|Slider|Choice|Toggle|Button|Stepper|Checklist|Stat|Chart|Bar|Line|Area|Pie|Heatmap|Grid|Code|Math|Image|Video|Audio|Tabs|Tab|Steps|Step|Stack|Columns|Card|Reset)\b/u;

const DIL_BODY_RE = /\{@body\b/u;
const DIL_IF_RE = /\{#if\b/u;
const DIL_EACH_RE = /\{#each\b/u;

/** Lowercase play-only tags. Do NOT list diagram tags (stack/card/badge/…) — those would steal static compose fences. */
const PLAY_TAG_RE =
  /<\/?(?:slider|button|choice|segmented-control|toggle|stat|chart|pie|pie-chart|meter|checklist|stepper)\b/iu;

const TAG_MAP = {
  slider: "Slider",
  button: "Button",
  choice: "Choice",
  "segmented-control": "Choice",
  toggle: "Toggle",
  stat: "Stat",
  chart: "Chart",
  pie: "Pie",
  "pie-chart": "Pie",
  stack: "Stack",
  columns: "Columns",
  card: "Card",
  meter: "Meter",
  badge: "Badge",
  table: "Table",
  caption: "Caption",
  cite: "Cite",
  checklist: "Checklist",
  stepper: "Stepper",
  line: "Line",
  area: "Area",
  bar: "Bar",
  slice: "Slice",
  divider: "Divider",
  reset: "Reset",
};

const MATH_FNS = [
  "abs", "min", "max", "floor", "ceil", "round", "trunc", "sqrt", "cbrt",
  "pow", "exp", "log", "log2", "log10", "sin", "cos", "tan", "atan2",
];

export function looksLikeLegacyPlay(body) {
  return LEGACY_TAG_RE.test(String(body ?? "").replace(/<(markdown|html)>[\s\S]*?<\/\1>/giu, ""));
}

export function looksLikeDilPlay(body) {
  const text = String(body ?? "").replace(/<(markdown|html)>[\s\S]*?<\/\1>/giu, "");
  return DIL_BODY_RE.test(text) || DIL_IF_RE.test(text) || DIL_EACH_RE.test(text) || PLAY_TAG_RE.test(text);
}

export function looksLikePlayCompose(body) {
  return looksLikeDilPlay(body) || looksLikeLegacyPlay(body);
}

function rewriteMath(expr) {
  let out = String(expr);
  for (const name of MATH_FNS) {
    out = out.replace(new RegExp(`\\bMath\\.${name}\\b`, "gu"), name);
  }
  return out;
}

function rewriteExpr(expr) {
  return rewriteMath(String(expr).trim());
}

function splitHeader(raw) {
  const lines = String(raw ?? "").replace(/\r\n?/gu, "\n").split("\n");
  const sep = lines.findIndex((line, index) => index > 0 && /^---\s*$/u.test(line));
  if (sep < 0) return { yamlText: "", tree: lines.join("\n") };
  const head = lines.slice(0, sep).join("\n");
  // Only treat head as "not YAML" when DIL/markup starts a line. Prose in intent
  // may mention `{@body}` mid-sentence without being a real body statement.
  if (
    /(?:^|\n)\s*<\/?[A-Za-z]/m.test(head) ||
    /(?:^|\n)\s*\{@body\b/m.test(head) ||
    /(?:^|\n)\s*\{#(?:if|each)\b/m.test(head)
  ) {
    return { yamlText: "", tree: lines.join("\n") };
  }
  return { yamlText: head, tree: lines.slice(sep + 1).join("\n") };
}

/**
 * Pull ChatGPT `{@body …}` statements. Supports:
 *   const [name, setName] = DIL.useState(init)
 *   const name = expr
 */
function extractBodyBlocks(source) {
  const blocks = [];
  const text = String(source ?? "");
  let i = 0;
  while (i < text.length) {
    const start = text.indexOf("{@body", i);
    if (start < 0) break;
    let j = start + 6;
    while (j < text.length && /\s/u.test(text[j])) j += 1;
    let depth = 1;
    let k = j;
    while (k < text.length) {
      const ch = text[k];
      if (ch === "{") depth += 1;
      else if (ch === "}") {
        depth -= 1;
        if (depth === 0) break;
      } else if (ch === '"' || ch === "'" || ch === "`") {
        const quote = ch;
        k += 1;
        while (k < text.length) {
          if (text[k] === "\\") { k += 2; continue; }
          if (text[k] === quote) break;
          k += 1;
        }
      }
      k += 1;
    }
    if (depth !== 0) {
      blocks.push({ full: text.slice(start), raw: text.slice(j), error: "未闭合的 {@body}" });
      break;
    }
    blocks.push({ full: text.slice(start, k + 1), raw: text.slice(j, k) });
    i = k + 1;
  }
  return blocks;
}

function parseBodies(source) {
  const state = {};
  const lets = [];
  const errors = [];
  let cleaned = source;
  const replacements = [];
  for (const match of extractBodyBlocks(source)) {
    if (match.error) {
      errors.push(match.error);
      replacements.push(match.full);
      continue;
    }
    const raw = match.raw.trim().replace(/;?\s*$/u, "");
    const useState =
      /^const\s*\[\s*([A-Za-z_]\w*)\s*,\s*([A-Za-z_]\w*)\s*\]\s*=\s*DIL\.useState\(([\s\S]+)\)$/u.exec(raw) ||
      /^let\s*\[\s*([A-Za-z_]\w*)\s*,\s*([A-Za-z_]\w*)\s*\]\s*=\s*DIL\.useState\(([\s\S]+)\)$/u.exec(raw);
    if (useState) {
      const name = useState[1];
      let initSrc = useState[3].trim();
      const withKey = /^([\s\S]+?)\s*,\s*\{[\s\S]*\}\s*$/u.exec(initSrc);
      if (withKey) initSrc = withKey[1].trim();
      state[name] = rewriteExpr(initSrc);
      replacements.push(match.full);
      continue;
    }
    const simple =
      /^const\s+([A-Za-z_]\w*)\s*=\s*([\s\S]+)$/u.exec(raw) ||
      /^let\s+([A-Za-z_]\w*)\s*=\s*([\s\S]+)$/u.exec(raw);
    if (simple) {
      lets.push({ name: simple[1], expr: rewriteExpr(simple[2]) });
      replacements.push(match.full);
      continue;
    }
    errors.push(`不支持的 {@body}：${raw.slice(0, 80)}`);
    replacements.push(match.full);
  }
  for (const chunk of replacements) cleaned = cleaned.replace(chunk, "");
  return { state, lets, errors, rest: cleaned };
}

/**
 * Plain Markdown / text inside {#if}/{#each} must become a painted leaf.
 * If the body already has a component tag, leave it alone; otherwise wrap in Caption
 * (always visible in the play runtime) so derived copy cannot silently vanish.
 */
function wrapFlowBody(body) {
  const text = String(body ?? "");
  if (!text.trim()) return text;
  if (/<[A-Za-z][\w-]*/u.test(text)) return text;
  // Preserve leading/trailing newlines for readability in lowered source.
  const lead = text.match(/^\s*/u)?.[0] ?? "";
  const trail = text.match(/\s*$/u)?.[0] ?? "";
  const inner = text.trim();
  return `${lead}<Caption>${inner}</Caption>${trail}`;
}

function expandControl(source) {
  let text = source;
  text = text.replace(
    /\{#each\s+([^]+?)\s+as\s+([A-Za-z_]\w*)(?:\s*,\s*([A-Za-z_]\w*))?\s*\}([\s\S]*?)\{\/each\}/gu,
    (_, list, asName, indexName, body) => {
      const index = indexName ? ` index="${indexName}"` : "";
      return `<Each of={${rewriteExpr(list)}} as="${asName}"${index}>${wrapFlowBody(body)}</Each>`;
    },
  );

  for (let pass = 0; pass < 20; pass += 1) {
    const next = text.replace(/\{#if\s+([^}]+)\}([\s\S]*?)\{\/if\}/gu, (_, cond, inner) => {
      const elseIfRe = /\{:else\s+if\s+([^}]+)\}/gu;
      const elseRe = /\{:else\}/u;
      const markers = [];
      let m;
      while ((m = elseIfRe.exec(inner))) {
        markers.push({ kind: "elseif", cond: m[1], index: m.index, end: m.index + m[0].length });
      }
      const elseMatch = elseRe.exec(inner);
      if (elseMatch) markers.push({ kind: "else", index: elseMatch.index, end: elseMatch.index + elseMatch[0].length });
      markers.sort((a, b) => a.index - b.index);

      const conditions = [{ cond: rewriteExpr(cond), start: 0 }];
      for (const marker of markers) {
        conditions[conditions.length - 1].end = marker.index;
        if (marker.kind === "elseif") conditions.push({ cond: rewriteExpr(marker.cond), start: marker.end });
        else conditions.push({ cond: null, start: marker.end });
      }
      conditions[conditions.length - 1].end = inner.length;

      const parts = [];
      const firstCond = rewriteExpr(cond);
      for (const piece of conditions) {
        const body = inner.slice(piece.start, piece.end);
        if (piece.cond == null) {
          parts.push(`<If test={!(${firstCond})}>${wrapFlowBody(body)}</If>`);
        } else {
          parts.push(`<If test={${piece.cond}}>${wrapFlowBody(body)}</If>`);
        }
      }
      return parts.join("\n");
    });
    if (next === text) break;
    text = next;
  }
  return text;
}

function rewriteTags(source) {
  let text = source;

  text = text.replace(/<slider\b([^>]*)\/?\s*>/giu, (_full, attrs) => {
    let next = attrs;
    const valueBind = /\bvalue=\{\s*([A-Za-z_]\w*)\s*\}/u.exec(next);
    const onChange = /\bonChange=\{\s*set([A-Za-z_]\w*)\s*\}/u.exec(next);
    if (valueBind && !/\bbind=/u.test(next)) {
      next = next.replace(valueBind[0], `bind="${valueBind[1]}"`);
    }
    if (onChange) next = next.replace(onChange[0], "");
    // Self-closing preserved if original ended with /
    const self = /\/\s*$/u.test(attrs) ? " /" : "";
    return `<Slider${next.replace(/\/\s*$/u, "")}${self}>`;
  });
  text = text.replace(/<\/slider>/giu, "</Slider>");

  text = text.replace(/<(segmented-control|choice)\b([^>]*)\/?\s*>/giu, (_full, _name, attrs) => {
    let next = attrs;
    const valueBind = /\bvalue=\{\s*([A-Za-z_]\w*)\s*\}/u.exec(next);
    const onChange = /\bonChange=\{\s*set([A-Za-z_]\w*)\s*\}/u.exec(next);
    if (valueBind && !/\bbind=/u.test(next)) {
      next = next.replace(valueBind[0], `bind="${valueBind[1]}"`);
    }
    if (onChange) next = next.replace(onChange[0], "");
    const self = /\/\s*$/u.test(attrs) ? " /" : "";
    return `<Choice${next.replace(/\/\s*$/u, "")}${self}>`;
  });
  text = text.replace(/<\/(?:segmented-control|choice)>/giu, "</Choice>");

  text = text.replace(/<pie-chart\b/giu, "<Pie");
  text = text.replace(/<\/pie-chart>/giu, "</Pie>");

  // ChatGPT: onClick={setName(expr)} / onClick={setName} → Ui Button set={{ name: expr }}
  text = text.replace(/<button\b([^>]*)>([\s\S]*?)<\/button>/giu, (_full, attrs, body) => {
    let next = attrs;
    const call = /\bonClick=\{\s*set([A-Za-z_]\w*)\s*\(([^)]*)\)\s*\}/u.exec(next);
    const bare = /\bonClick=\{\s*set([A-Za-z_]\w*)\s*\}/u.exec(next);
    if (call) {
      const name = call[1][0].toLowerCase() + call[1].slice(1);
      const value = call[2].trim() === "" ? "true" : rewriteExpr(call[2]);
      next = next.replace(call[0], ` set={{ ${name}: ${value} }}`);
    } else if (bare) {
      const name = bare[1][0].toLowerCase() + bare[1].slice(1);
      next = next.replace(bare[0], ` set={{ ${name}: true }}`);
    }
    if (/\breset\b/u.test(next) === false && /\bonClick=\{\s*reset\s*\}/u.test(attrs)) {
      next = attrs.replace(/\bonClick=\{\s*reset\s*\}/u, " reset");
    }
    return `<Button${next}>${body}</Button>`;
  });
  text = text.replace(/<button\b([^>]*)\/\s*>/giu, (_full, attrs) => `<Button${attrs} />`);

  for (const [from, to] of Object.entries(TAG_MAP)) {
    if (from === "slider" || from === "choice" || from === "segmented-control" || from === "pie-chart" || from === "button") continue;
    text = text.replace(new RegExp(`<${from}\\b`, "giu"), `<${to}`);
    text = text.replace(new RegExp(`</${from}>`, "giu"), `</${to}>`);
  }

  // <Pie slices={[{label, value}, ...]} /> → <Pie><Slice …/></Pie> (after tag rename)
  text = text.replace(/<Pie\b([^>]*?)\bslices=\{(\[[\s\S]*?\])\}([^>]*)\/\s*>/gu, (_full, pre, arrSrc, post) => {
    try {
      const items = Function(`"use strict"; return (${arrSrc});`)();
      if (!Array.isArray(items)) return _full;
      const kids = items.map((item) => {
        const label = item?.label ?? item?.name ?? "";
        const value = item?.value ?? item?.v ?? 0;
        return `<Slice label={${JSON.stringify(String(label))}} value={${Number(value)}} />`;
      }).join("\n  ");
      return `<Pie${pre}${post}>\n  ${kids}\n</Pie>`;
    } catch {
      return _full;
    }
  });

  text = text.replace(/\{([^{}]+)\}/gu, (full, expr) => {
    const trimmed = expr.trimStart();
    if (trimmed.startsWith("@") || trimmed.startsWith("#") || trimmed.startsWith(":")) return full;
    return `{${rewriteExpr(expr)}}`;
  });

  return text;
}

function emitDecls(state, lets) {
  const lines = [];
  const entries = Object.entries(state);
  if (entries.length) {
    lines.push(`<State ${entries.map(([name, init]) => `${name}={${init}}`).join(" ")} />`);
  }
  for (const item of lets) {
    lines.push(`<Let ${item.name}={${item.expr}} />`);
  }
  return lines.join("\n");
}

function buildUiSource(headerProps, children, legacyPlay, dil) {
  const header = {
    id: headerProps.id || "compose-play",
    caption: headerProps.caption ?? "",
    intent: headerProps.intent ?? "",
    ...(headerProps.expect ? { expect: headerProps.expect } : {}),
    ...(headerProps.frame ? { frame: headerProps.frame } : {}),
  };
  const yaml = stringify(header);
  return {
    ok: true,
    error: null,
    source: `---\n${yaml}---\n${children}`,
    legacyPlay,
    dil,
  };
}

/** Lower a DIL play body to the `ui` fence source compileUiBlock expects. */
export function dilToUiSource({ id, props = {}, body = "" }) {
  const { tree } = splitHeader(String(body ?? ""));
  const headerProps = { ...props, id: id || props.id || "compose-play" };
  const islands = [];
  const masked = tree.replace(/<(markdown|html)>([\s\S]*?)<\/\1>/giu, (_whole, _tag, source) => {
    const token = `GARDENCONTENTISLAND${islands.length}END`;
    islands.push({ token, source });
    return token;
  });
  const { state, lets, errors, rest } = parseBodies(masked);
  if (errors.length) {
    return { ok: false, error: errors[0], source: null, legacyPlay: false, dil: true };
  }
  const children = [emitDecls(state, lets), rewriteTags(expandControl(rest))]
    .filter((part) => String(part).trim())
    .join("\n\n");
  const restored = islands.reduce((value, island) => value.replace(island.token, `<Content source={${JSON.stringify(island.source)}} />`), children);
  return buildUiSource(headerProps, restored, false, true);
}

/** TEMP: old PascalCase body → ui source unchanged. */
export function legacyPlayToUiSource({ id, props = {}, body = "" }) {
  const { tree } = splitHeader(String(body ?? ""));
  const headerProps = { ...props, id: id || props.id || "compose-play" };
  return buildUiSource(headerProps, tree, true, false);
}

/**
 * Parse a compose play fence into the block shape garden parse expects.
 */
export function parsePlayCompose(header, body) {
  const raw = String(body ?? "");
  const dil = looksLikeDilPlay(raw);
  const legacy = looksLikeLegacyPlay(raw) && !dil;
  const { yamlText, tree } = splitHeader(raw);

  let props = {};
  let error = null;
  if (yamlText.trim()) {
    try {
      const parsed = parseYaml(yamlText);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        error = { code: "garden-yaml", message: "YAML 必须是一组键值，或条目列表。" };
      } else props = parsed;
    } catch (err) {
      error = {
        code: "garden-yaml",
        message: `YAML 解析失败：${err instanceof Error ? err.message : "解析失败"}`,
      };
    }
  }
  if (header.id && props.id == null) props.id = header.id;
  const allowed = new Set(["id", "caption", "intent", "expect", "frame"]);
  const unknown = Object.keys(props).filter((key) => !allowed.has(key));
  if (!error && unknown.length) {
    error = {
      code: "garden-yaml",
      message: `不支持的键 ${unknown.join("、")}`,
      unknown,
      allowed: [...allowed],
    };
  }

  const lowered = legacy
    ? legacyPlayToUiSource({ id: header.id ?? props.id, props, body: tree })
    : dilToUiSource({ id: header.id ?? props.id, props, body: tree });

  if (!lowered.ok && !error) {
    error = { code: "compose-dil", message: lowered.error || "DIL 解析失败" };
  }

  const block = {
    name: "compose",
    mode: "play",
    dil: Boolean(lowered.dil),
    legacyPlay: Boolean(lowered.legacyPlay),
    props,
    children: tree,
    uiSource: lowered.source,
    id: header.id ?? props.id ?? null,
    legacy: Boolean(header.legacy),
    legacyLang: header.legacyLang,
    idea: typeof props.intent === "string" ? props.intent : "",
  };
  if (error) return { ...block, error };
  return block;
}
