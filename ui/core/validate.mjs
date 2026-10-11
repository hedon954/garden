import { COMPONENTS, COMPONENT_NAMES, TONES } from "./catalog.mjs";
import { analyzeExpr, createBudget, evaluate, ExprError } from "./expr.mjs";
import { compiledOf, ID_PATTERN, intentHash, resolveSidecarPath, splitUiBody } from "./fence.mjs";
import { isValidFormat } from "./format.mjs";
import { parseUiBody } from "./parse.mjs";
import {
  collectDecls,
  computeScope,
  defaultStateValues,
  isPowerOfTwo,
  isValidName,
  lookupFrom,
  orderLets,
  parseDataFile,
  runExpect,
} from "./state.mjs";

const HEADER_KEYS = new Set(["id", "caption", "intent", "compiled", "expect"]);
const MAX_ELEMENTS = 200;
const CONSTANT_NAMES = new Set(["PI", "E", "undefined", "NaN", "Infinity"]);
const INLINE_TYPES = new Set(["text", "x", "strong", "em", "code", "br", "link"]);
const DECL_COMPONENTS = new Set(["State", "Let", "Data"]);

function editDistance(left, right) {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let i = 1; i <= left.length; i += 1) {
    let diagonal = previous[0];
    previous[0] = i;
    for (let j = 1; j <= right.length; j += 1) {
      const saved = previous[j];
      previous[j] = Math.min(
        previous[j] + 1,
        previous[j - 1] + 1,
        diagonal + (left[i - 1].toLowerCase() === right[j - 1].toLowerCase() ? 0 : 1),
      );
      diagonal = saved;
    }
  }
  return previous[right.length];
}

export function suggestComponent(name) {
  let best = null;
  for (const candidate of COMPONENT_NAMES) {
    const distance = editDistance(name, candidate);
    if (distance <= 2 && (!best || distance < best.distance)) best = { name: candidate, distance };
  }
  return best?.name ?? null;
}

const isPlainObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);

/** Row fields shadow block names inside Chart / Table data mode. */
export const withRow = (row, lookup) => (name) =>
  isPlainObject(row) && Object.hasOwn(row, name) ? { found: true, value: row[name] } : lookup(name);

const propExpression = (prop) => (prop.k === "expr" ? prop.e : { type: "Literal", value: prop.v });

/** Checks a literal or evaluated value against a prop spec. Returns a reason or null. */
function typeProblem(spec, value) {
  switch (spec.type) {
    case "string":
      return typeof value === "string" || typeof value === "number" ? null : "需要文字";
    case "number":
      if (typeof value !== "number" || !Number.isFinite(value)) return "需要有限数字";
      if (spec.min !== undefined && value < spec.min) return `不能小于 ${spec.min}`;
      if (spec.max !== undefined && value > spec.max) return `不能大于 ${spec.max}`;
      return null;
    case "boolean":
      return typeof value === "boolean" ? null : "需要 true 或 false";
    case "array":
      return Array.isArray(value) ? null : "需要数组";
    case "object":
      return isPlainObject(value) ? null : "需要对象";
    case "enum":
      return spec.values.includes(value) ? null : `只能是 ${spec.values.join(" / ")}`;
    case "format":
      return isValidFormat(value) ? null : "格式只能是 number、fixed:N、percent、percent:N、bytes、si、thousands";
    case "gap":
      return Number.isInteger(value) && value >= 0 && value <= 4 ? null : "只能是 0–4 的整数";
    case "name":
      return typeof value === "string" && isValidName(value) ? null : "需要小写字母开头的名字，且不能与函数名重名";
    case "stateName":
      return typeof value === "string" ? null : "需要状态名";
    case "autoplay":
      return value === false || (typeof value === "number" && value >= 800) ? null : "只能是 false 或不小于 800 的毫秒数";
    default:
      return null;
  }
}

function headerLine(headerText, key, lineOffset) {
  const index = headerText.split("\n").findIndex((line) => line.startsWith(`${key}:`));
  return lineOffset + 2 + Math.max(0, index);
}

/**
 * Full check of a `ui` fence body: header, syntax, catalog rules, evaluation
 * at the default state (and at every bound step), `expect` and limits.
 * Lines in diagnostics are file lines when `lineOffset` is the fence's first line.
 */
export function checkUiBlock(body, options = {}) {
  const { lineOffset = 0, markdownPath = null, readData = null, skipData = false } = options;
  const diagnostics = [];
  const seen = new Set();
  const add = (code, line, message, severity = "error") => {
    const key = `${code}|${line}|${message}`;
    if (seen.has(key)) return;
    seen.add(key);
    diagnostics.push({ code, line, message, severity });
  };
  const result = (extra = {}) => ({
    ok: !diagnostics.some((item) => item.severity === "error"),
    diagnostics: diagnostics.sort((a, b) => a.line - b.line),
    ...extra,
  });

  const split = splitUiBody(body);
  if (!split.header) {
    add("ui-header", lineOffset + 1, split.error ?? "块头无效");
    return result({ header: null, root: null });
  }
  const { header, headerText } = split;
  for (const key of Object.keys(header)) {
    if (!HEADER_KEYS.has(key)) add("ui-header", headerLine(headerText, key, lineOffset), `块头不支持 ${key}`);
  }
  if (typeof header.id !== "string" || !ID_PATTERN.test(header.id)) {
    add("ui-id", headerLine(headerText, "id", lineOffset), "id 必填，只能用小写字母、数字和连字符");
  }
  if (typeof header.caption !== "string" || !header.caption.trim()) {
    add("ui-caption", headerLine(headerText, "caption", lineOffset), "caption 必填，写一句判断");
  }
  if (header.intent !== undefined && typeof header.intent !== "string") {
    add("ui-header", headerLine(headerText, "intent", lineOffset), "intent 必须是文字");
  }
  const compiled = compiledOf(headerText);
  if (compiled !== undefined && !/^[0-9a-f]{8}$/u.test(compiled)) {
    add("ui-header", headerLine(headerText, "compiled", lineOffset), "compiled 是工具写入的 8 位哈希，不要手改");
  } else if (typeof header.intent === "string" && compiled !== undefined && compiled !== intentHash(header.intent)) {
    add("ui-stale", headerLine(headerText, "compiled", lineOffset), "原话改过了，还没重编译", "warning");
  }
  if (header.expect !== undefined && !Array.isArray(header.expect)) {
    add("ui-header", headerLine(headerText, "expect", lineOffset), "expect 必须是数组");
  }

  const bodyLine = (line) => lineOffset + split.bodyLineOffset + line;
  const parsed = parseUiBody(split.bodyText);
  for (const item of parsed.diagnostics) add(item.code, bodyLine(item.line), item.message);
  if (!parsed.root) return result({ header, root: null });
  const { root } = parsed;

  const decls = collectDecls(root);
  const stateTypes = new Map();
  const declared = new Map();
  const declare = (name, line, kind) => {
    if (!isValidName(name)) {
      add("ui-prop", bodyLine(line), `${kind} 的名字 ${name} 不合法：要小写字母开头，不能与函数名重名`);
      return;
    }
    if (declared.has(name)) add("ui-prop", bodyLine(line), `名字 ${name} 重复声明`);
    declared.set(name, kind);
  };
  for (const state of decls.states) {
    declare(state.name, state.line, "State");
    if (state.prop.k !== "lit" || !["number", "string", "boolean"].includes(typeof state.prop.v)) {
      add("ui-prop", bodyLine(state.line), `State ${state.name} 的默认值只能是数字、文字或布尔字面量`);
    } else {
      stateTypes.set(state.name, typeof state.prop.v);
    }
  }
  for (const item of decls.lets) declare(item.name, item.line, "Let");
  for (const item of decls.data) declare(item.name, item.line, "Data");
  const knownNames = new Set(declared.keys());

  const { cycle } = orderLets(decls.lets);
  if (cycle) {
    const first = decls.lets.find((item) => item.name === cycle[0]);
    add("ui-cycle", bodyLine(first?.line ?? 1), `Let 互相依赖成环：${cycle.join(" → ")}`);
  }

  const checkExpression = (expression, line, locals, rowScope) => {
    const { problems, names } = analyzeExpr(expression);
    for (const problem of problems) add("ui-expr", bodyLine(line), problem);
    if (rowScope) return;
    for (const name of names) {
      if (!knownNames.has(name) && !locals.has(name) && !CONSTANT_NAMES.has(name)) {
        add("ui-expr", bodyLine(line), `未知名字 ${name}`);
      }
    }
  };

  for (const item of decls.lets) {
    if (item.prop.k === "expr") checkExpression(item.prop.e, item.line, new Set(), false);
  }

  const sliderByState = new Map();
  const collectSliders = (node) => {
    if (node?.t === "el" && node.n === "Slider" && node.p.bind?.k === "lit") sliderByState.set(node.p.bind.v, node);
    node?.c?.forEach?.(collectSliders);
  };
  collectSliders(root);

  // Static pass: catalog, props, children, bindings, names.
  const staticVisit = (node, parent, locals, chartDataMode) => {
    if (node.t === "x") {
      checkExpression(node.e, node.l, locals, false);
      return;
    }
    if (node.t !== "el") {
      node.c?.forEach((child) => staticVisit(child, parent, locals, chartDataMode));
      return;
    }
    const spec = COMPONENTS[node.n];
    if (!spec) {
      const suggestion = suggestComponent(node.n);
      add("ui-component", bodyLine(node.l), `组件 <${node.n}> 不在目录里${suggestion ? `，是不是 <${suggestion}>？` : ""}`);
      return;
    }
    const parentSpec = COMPONENTS[parent] ?? { children: "content" };
    if (spec.parents && !spec.parents.includes(parent)) {
      add("ui-children", bodyLine(node.l), `<${node.n}> 只能放在 ${spec.parents.map((name) => `<${name}>`).join(" / ")} 里`);
    } else if (spec.children === "transparent" || DECL_COMPONENTS.has(node.n)) {
      // If / Each take their parent's rule; declarations may sit anywhere.
    } else if (Array.isArray(parentSpec.children) && !parentSpec.children.includes(node.n)) {
      add("ui-children", bodyLine(node.l), `<${parent}> 里只能放 ${parentSpec.children.map((name) => `<${name}>`).join(" / ")}`);
    } else if (parentSpec.children === "none" || parentSpec.children === "text") {
      add("ui-children", bodyLine(node.l), `<${parent}> 里不能放组件`);
    }

    const isTransparent = spec.children === "transparent";
    const effectiveParent = isTransparent ? parent : node.n;
    const nextLocals = new Set(locals);

    if (!spec.kind) {
      for (const [name, prop] of Object.entries(node.p)) {
        const propSpec = spec.props[name];
        if (!propSpec) {
          add("ui-prop", bodyLine(node.l), `<${node.n}> 没有属性 ${name}`);
          continue;
        }
        if (prop.k === "expr") {
          if (propSpec.literal) {
            add("ui-prop", bodyLine(node.l), `<${node.n}> 的 ${name} 只能写字面量`);
            continue;
          }
          const rowScope = Boolean(
            (propSpec.rowScope && node.p.data) || (spec.rowScopeProps?.includes(name) && chartDataMode),
          );
          checkExpression(prop.e, node.l, locals, rowScope);
        } else {
          const problem = typeProblem(propSpec, prop.v);
          if (problem) add("ui-prop", bodyLine(node.l), `<${node.n}> 的 ${name} ${problem}`);
        }
      }
      for (const [name, propSpec] of Object.entries(spec.props)) {
        if (propSpec.required && !node.p[name]) add("ui-prop", bodyLine(node.l), `<${node.n}> 缺少 ${name}`);
      }
    }

    const bind = node.p.bind?.k === "lit" ? node.p.bind.v : null;
    if (bind !== null && spec.props.bind) {
      if (!stateTypes.has(bind)) {
        add("ui-bind", bodyLine(node.l), `<${node.n}> 绑定的 ${bind} 没有在 State 里声明`);
      } else if (spec.props.bind.stateType && stateTypes.get(bind) !== spec.props.bind.stateType) {
        add("ui-bind", bodyLine(node.l), `<${node.n}> 需要绑定${spec.props.bind.stateType === "number" ? "数字" : "布尔"}状态，${bind} 是 ${stateTypes.get(bind)}`);
      }
    }

    switch (node.n) {
      case "Each":
        if (node.p.as?.k === "lit" && typeof node.p.as.v === "string") nextLocals.add(node.p.as.v);
        if (node.p.index?.k === "lit" && typeof node.p.index.v === "string") nextLocals.add(node.p.index.v);
        break;
      case "Chart": {
        const hasSweep = Boolean(node.p.sweep);
        const hasData = Boolean(node.p.data);
        if (hasSweep === hasData) add("ui-prop", bodyLine(node.l), "<Chart> 的 sweep 和 data 必须写且只能写一个");
        if (hasData && !node.p.x) add("ui-prop", bodyLine(node.l), "<Chart> 数据模式需要 x");
        if (hasSweep && node.p.sweep.k === "lit") {
          const sweep = node.p.sweep.v;
          if (!stateTypes.has(sweep)) add("ui-bind", bodyLine(node.l), `<Chart> 的 sweep ${sweep} 没有在 State 里声明`);
          else if (stateTypes.get(sweep) !== "number") add("ui-bind", bodyLine(node.l), `<Chart> 的 sweep 必须是数字状态`);
          if (!sliderByState.has(sweep) && (!node.p.from || !node.p.to)) {
            add("ui-prop", bodyLine(node.l), `<Chart> 扫过的 ${sweep} 没有对应的 <Slider>，需要写 from 和 to`);
          }
        }
        for (const child of node.c) {
          if (child.t === "el" && (child.n === "Bar" || child.n === "Point") && hasSweep) {
            add("ui-children", bodyLine(child.l), `<${child.n}> 只能用于数据模式的 <Chart>`);
          }
        }
        break;
      }
      case "Button":
        if (Boolean(node.p.set) === Boolean(node.p.reset)) add("ui-prop", bodyLine(node.l), "<Button> 的 set 和 reset 必须写且只能写一个");
        break;
      case "Meter":
        if (Boolean(node.p.value) === Boolean(node.p.parts)) add("ui-prop", bodyLine(node.l), "<Meter> 的 value 和 parts 必须写且只能写一个");
        break;
      case "Table": {
        const hasRows = node.c.some((child) => child.t === "el");
        if (node.p.data && hasRows) add("ui-children", bodyLine(node.l), "<Table> 写了 data 就不能再写 <Row>");
        if (!node.p.data && !hasRows) add("ui-children", bodyLine(node.l), "<Table> 需要 <Row> 或 data");
        break;
      }
      case "Image":
        if (node.p.src?.k === "lit" && markdownPath) {
          const resolved = resolveSidecarPath(markdownPath, String(node.p.src.v));
          if (resolved.error) add("ui-prop", bodyLine(node.l), `<Image> 的 src ${resolved.error}`);
        }
        break;
      default:
        break;
    }

    if (spec.children === "none" && node.c.length) {
      add("ui-children", bodyLine(node.l), `<${node.n}> 不能有子元素`);
    }
    if (spec.children === "text") {
      for (const child of node.c) {
        const inlineOk = INLINE_TYPES.has(child.t) || (child.t === "p" && child.c.every((item) => INLINE_TYPES.has(item.t)));
        if (!inlineOk && child.t !== "el") add("ui-children", bodyLine(node.l), `<${node.n}> 里只能写一段文字`);
      }
    }
    if (Array.isArray(spec.children)) {
      for (const child of node.c) {
        if (child.t === "p" || child.t === "list" || child.t === "quote") {
          add("ui-children", bodyLine(node.l), `<${node.n}> 里只能放 ${spec.children.map((name) => `<${name}>`).join(" / ")}`);
        }
      }
    }

    const nextChartData = node.n === "Chart" ? Boolean(node.p.data) : chartDataMode;
    for (const child of node.c) staticVisit(child, effectiveParent, nextLocals, nextChartData);
  };
  for (const child of root.c) staticVisit(child, "root", new Set(), false);

  // Data files.
  const dataValues = {};
  for (const item of decls.data) {
    if (skipData) {
      dataValues[item.name] = [];
      continue;
    }
    if (markdownPath) {
      const resolved = resolveSidecarPath(markdownPath, item.src);
      if (resolved.error) {
        add("ui-data", bodyLine(item.line), `Data ${item.name}：${resolved.error}`);
        dataValues[item.name] = [];
        continue;
      }
    }
    const text = readData ? readData(item.src) : undefined;
    if (typeof text !== "string") {
      add("ui-data", bodyLine(item.line), `Data ${item.name}：读不到 ${item.src}`);
      dataValues[item.name] = [];
      continue;
    }
    const parsedData = parseDataFile(item.src, text);
    if (parsedData.error) {
      add("ui-data", bodyLine(item.line), `Data ${item.name}：${parsedData.error}`);
      dataValues[item.name] = [];
    } else {
      dataValues[item.name] = parsedData.value;
    }
  }

  const hasErrors = () => diagnostics.some((item) => item.severity === "error" && item.code !== "ui-data");
  if (hasErrors()) return result({ header, root, decls, dataValues });

  // Evaluation pass at the default state and at every bound step / tab.
  const defaults = defaultStateValues(decls);
  let elementCount = 0;

  const evalTree = (stateValues, countElements) => {
    const budget = createBudget(500000);
    const scope = computeScope(decls, {
      stateValues,
      dataValues,
      budget,
      onError: (item, error) => add("ui-eval", bodyLine(item.line), `Let ${item.name} 算不出来：${error.message}`),
    });

    const evalProp = (node, name, lookup) => {
      const prop = node.p[name];
      if (!prop) return undefined;
      if (prop.k === "lit") return prop.v;
      try {
        return evaluate(prop.e, lookup, budget);
      } catch (error) {
        add("ui-eval", bodyLine(node.l), `<${node.n}> 的 ${name} 算不出来：${error instanceof ExprError ? error.message : "出错"}`);
        return undefined;
      }
    };

    const expand = (children, lookup) => {
      const output = [];
      for (const child of children) {
        if (child.t !== "el") continue;
        if (child.n === "If") {
          if (evalProp(child, "test", lookup)) output.push(...expand(child.c, lookup));
        } else if (child.n === "Each") {
          const items = evalProp(child, "of", lookup);
          if (!Array.isArray(items)) continue;
          items.slice(0, 200).forEach((item, index) => {
            const locals = { [child.p.as.v]: item };
            if (child.p.index?.k === "lit") locals[child.p.index.v] = index;
            output.push(...expand(child.c, (name) => (Object.hasOwn(locals, name) ? { found: true, value: locals[name] } : lookup(name))));
          });
        } else {
          output.push({ node: child, lookup });
        }
      }
      return output;
    };

    const checkCount = (node, count, spec) => {
      if (spec.minChildren !== undefined && count < spec.minChildren) add("ui-limit", bodyLine(node.l), `<${node.n}> 至少要 ${spec.minChildren} 个子元素`);
      if (spec.maxChildren !== undefined && count > spec.maxChildren) add("ui-limit", bodyLine(node.l), `<${node.n}> 最多 ${spec.maxChildren} 个子元素`);
    };

    const checkTones = (node, tones, cellCount) => {
      if (tones === undefined || tones === null) return;
      const list = Array.isArray(tones) ? tones : [tones];
      if (Array.isArray(tones) && tones.length !== cellCount) add("ui-prop", bodyLine(node.l), `<Row> 的 tones 长度要等于列数 ${cellCount}`);
      for (const value of list) {
        if (!TONES.includes(value)) add("ui-prop", bodyLine(node.l), `tone ${String(value)} 不存在，只能是 ${TONES.join(" / ")}`);
      }
    };

    const visit = (node, lookup, parentContext) => {
      if (node.t === "x") {
        try {
          evaluate(node.e, lookup, budget);
        } catch (error) {
          add("ui-eval", bodyLine(node.l), `插值 {${node.s}} 算不出来：${error instanceof ExprError ? error.message : "出错"}`);
        }
        return;
      }
      if (node.t !== "el") {
        node.c?.forEach((child) => visit(child, lookup, parentContext));
        return;
      }
      if (DECL_COMPONENTS.has(node.n)) return;
      const spec = COMPONENTS[node.n];
      if (!spec) return;

      if (node.n === "If" || node.n === "Each") {
        for (const item of expand([node], lookup)) visit(item.node, item.lookup, parentContext);
        node.c.forEach((child) => {
          if (child.t !== "el") visit(child, lookup, parentContext);
        });
        return;
      }

      if (countElements) elementCount += 1;
      const values = {};
      for (const [name, propSpec] of Object.entries(spec.props)) {
        const prop = node.p[name];
        if (!prop) continue;
        const rowScope = (propSpec.rowScope && node.p.data) || (spec.rowScopeProps?.includes(name) && parentContext.chartData);
        if (rowScope) continue;
        values[name] = evalProp(node, name, lookup);
        if (prop.k === "expr" && values[name] !== undefined) {
          const problem = typeProblem(propSpec.type === "stateName" ? { type: "string" } : propSpec, values[name]);
          if (problem && propSpec.type !== "any") add("ui-prop", bodyLine(node.l), `<${node.n}> 的 ${name} ${problem}`);
        }
      }

      const childContext = { ...parentContext };
      switch (node.n) {
        case "Slider": {
          const value = stateValues[values.bind];
          const { min, max } = values;
          if (typeof min === "number" && typeof max === "number") {
            if (min >= max) add("ui-prop", bodyLine(node.l), "<Slider> 的 max 必须大于 min");
            const scale = values.scale ?? "linear";
            if (scale === "log" && min <= 0) add("ui-prop", bodyLine(node.l), "<Slider> 对数刻度的 min 必须大于 0");
            if (typeof value === "number" && (value < min || value > max)) {
              add("ui-prop", bodyLine(node.l), `<Slider> 的默认值 ${value} 不在 ${min}–${max} 之间`);
            }
            const snap = values.snap ?? (scale === "log" && isPowerOfTwo(min) && isPowerOfTwo(max) ? "pow2" : "none");
            if (snap === "pow2" && (!isPowerOfTwo(min) || !isPowerOfTwo(max) || (typeof value === "number" && !isPowerOfTwo(value)))) {
              add("ui-prop", bodyLine(node.l), "<Slider> 只停在 2 的幂上时，min、max 和默认值都要是 2 的幂");
            }
          }
          break;
        }
        case "Choice": {
          const options = values.options;
          if (Array.isArray(options)) {
            if (options.length < 2 || options.length > 8) add("ui-limit", bodyLine(node.l), "<Choice> 要有 2–8 个选项");
            const optionValues = options.map((option) => (isPlainObject(option) ? option.value : option));
            if (optionValues.some((value) => !["number", "string"].includes(typeof value))) {
              add("ui-prop", bodyLine(node.l), "<Choice> 的选项只能是数字、文字或 { value, label }");
            }
            const current = stateValues[values.bind];
            if (current !== undefined && !optionValues.includes(current)) {
              add("ui-prop", bodyLine(node.l), `<Choice> 的默认值 ${String(current)} 不在选项里`);
            }
          }
          break;
        }
        case "Checklist":
          if (Array.isArray(values.items) && (values.items.length < 1 || values.items.length > 30)) {
            add("ui-limit", bodyLine(node.l), "<Checklist> 要有 1–30 项");
          }
          break;
        case "Stepper": {
          const { min, max } = values;
          if (typeof min === "number" && typeof max === "number" && min >= max) add("ui-prop", bodyLine(node.l), "<Stepper> 的 max 必须大于 min");
          const current = stateValues[values.bind];
          if (typeof current === "number" && typeof min === "number" && typeof max === "number" && (current < min || current > max)) {
            add("ui-prop", bodyLine(node.l), `<Stepper> 的默认值 ${current} 不在 ${min}–${max} 之间`);
          }
          break;
        }
        case "Pie":
          checkCount(node, expand(node.c, lookup).length, spec);
          break;
        case "Meter":
          if (Array.isArray(values.parts) && values.parts.length > 5) add("ui-limit", bodyLine(node.l), "<Meter> 最多 5 段");
          break;
        case "Code":
          if (typeof values.code === "string" && values.code.split("\n").length > 60) add("ui-limit", bodyLine(node.l), "<Code> 不能超过 60 行");
          break;
        case "Diagram":
          if (typeof values.mermaid === "string" && !/^\s*(?:graph|flowchart|stateDiagram)/u.test(values.mermaid)) {
            add("ui-prop", bodyLine(node.l), "<Diagram> 只支持 graph、flowchart 和 stateDiagram");
          }
          break;
        case "Table": {
          const columns = Array.isArray(values.columns) ? values.columns : [];
          childContext.columns = columns.length;
          if (node.p.data) {
            const rows = Array.isArray(values.data) ? values.data : [];
            if (rows.length > 50) add("ui-limit", bodyLine(node.l), "<Table> 最多 50 行");
            if (columns.some((column) => !isPlainObject(column) || typeof column.key !== "string")) {
              add("ui-prop", bodyLine(node.l), "<Table> 数据模式下每列都要写 { label, key }");
            }
            if (node.p.rowTone?.k === "expr") {
              for (const row of rows.slice(0, 50)) {
                try {
                  const toneValue = evaluate(node.p.rowTone.e, withRow(row, lookup), budget);
                  if (toneValue !== null && toneValue !== undefined && !TONES.includes(toneValue)) {
                    add("ui-prop", bodyLine(node.l), `rowTone 返回了不存在的 tone ${String(toneValue)}`);
                    break;
                  }
                } catch (error) {
                  add("ui-eval", bodyLine(node.l), `<Table> 的 rowTone 算不出来：${error.message}`);
                  break;
                }
              }
            }
          } else {
            checkCount(node, expand(node.c, lookup).length, spec);
          }
          break;
        }
        case "Grid": {
          const cols = Array.isArray(values.cols) ? values.cols : [];
          if (cols.length > 16) add("ui-limit", bodyLine(node.l), "<Grid> 最多 16 列");
          childContext.columns = cols.length;
          checkCount(node, expand(node.c, lookup).length, spec);
          break;
        }
        case "Row": {
          const cells = values.cells;
          if (Array.isArray(cells) && parentContext.columns !== undefined && cells.length !== parentContext.columns) {
            add("ui-prop", bodyLine(node.l), `<Row> 的 cells 有 ${cells.length} 项，表头有 ${parentContext.columns} 列`);
          }
          if (Array.isArray(cells)) checkTones(node, values.tones, cells.length);
          if (Array.isArray(values.notes) && Array.isArray(cells) && values.notes.length !== cells.length) {
            add("ui-prop", bodyLine(node.l), "<Row> 的 notes 长度要等于 cells");
          }
          break;
        }
        case "Chart": {
          const series = expand(node.c, lookup);
          checkCount(node, series.length, spec);
          if (node.p.data) {
            childContext.chartData = true;
            const rows = Array.isArray(values.data) ? values.data : [];
            if (rows.length > 2000) add("ui-limit", bodyLine(node.l), "<Chart> 最多 2000 个数据点");
            const firstRow = rows.find(isPlainObject);
            if (firstRow) {
              const rowLookup = withRow(firstRow, lookup);
              try {
                evaluate(propExpression(node.p.x), rowLookup, budget);
              } catch (error) {
                add("ui-eval", bodyLine(node.l), `<Chart> 的 x 算不出来：${error.message}`);
              }
              for (const item of series) {
                const y = item.node.p.y;
                if (!y) continue;
                try {
                  evaluate(propExpression(y), rowLookup, budget);
                } catch (error) {
                  add("ui-eval", bodyLine(item.node.l), `<${item.node.n}> 的 y 算不出来：${error.message}`);
                }
              }
            }
          } else {
            childContext.chartData = false;
            const sweep = values.sweep;
            const slider = sliderByState.get(sweep);
            const from = values.from ?? (slider ? evalProp(slider, "min", lookup) : undefined);
            const to = values.to ?? (slider ? evalProp(slider, "max", lookup) : undefined);
            const scale = values.scale ?? (slider?.p.scale?.v ?? "linear");
            if (typeof from === "number" && typeof to === "number") {
              if (from >= to) add("ui-prop", bodyLine(node.l), "<Chart> 的 to 必须大于 from");
              if (scale === "log" && from <= 0) add("ui-prop", bodyLine(node.l), "<Chart> 对数刻度的起点必须大于 0");
            }
          }
          break;
        }
        case "Steps":
        case "Tabs":
        case "Columns":
        case "Image":
          checkCount(node, expand(node.c, lookup).length, spec);
          break;
        default:
          break;
      }
      node.c.forEach((child) => visit(child, lookup, childContext));
    };

    const rootLookup = lookupFrom(scope);
    root.c.forEach((child) => visit(child, rootLookup, { chartData: false }));
    return { scope, expand };
  };

  const first = evalTree(defaults, true);
  if (elementCount > MAX_ELEMENTS) add("ui-limit", bodyLine(1), `元素展开后有 ${elementCount} 个，上限 ${MAX_ELEMENTS}`);

  const boundSwitchers = [];
  const findSwitchers = (node) => {
    if (node?.t === "el" && (node.n === "Steps" || node.n === "Tabs") && node.p.bind?.k === "lit") boundSwitchers.push(node);
    node?.c?.forEach?.(findSwitchers);
  };
  findSwitchers(root);
  for (const switcher of boundSwitchers) {
    const name = switcher.p.bind.v;
    if (!stateTypes.has(name)) continue;
    const count = first.expand(switcher.c, lookupFrom(first.scope)).length;
    for (let index = 0; index < count; index += 1) {
      if (index === defaults[name]) continue;
      evalTree({ ...defaults, [name]: index }, false);
    }
  }

  if (Array.isArray(header.expect)) {
    for (const failure of runExpect(decls, header.expect, { dataValues })) {
      const where = headerLine(headerText, "expect", lineOffset);
      const label = `expect 第 ${failure.index + 1} 条`;
      if (failure.reason === "shape") add("ui-expect", where, `${label}格式不对：要写成 { given: {...}, 名字: 期望值 }`);
      else if (failure.reason === "unknown-state") add("ui-expect", where, `${label}的 given 里 ${failure.name} 不是状态`);
      else if (failure.reason === "unknown-name") add("ui-expect", where, `${label}里 ${failure.name} 不是状态或 Let`);
      else add("ui-expect", where, `${label}：${failure.name} 期望 ${failure.expected}，实际 ${failure.actual}`);
    }
  }

  return result({ header, root, decls, dataValues });
}
