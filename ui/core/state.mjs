import { analyzeExpr, createBudget, evaluate, ExprError, RESERVED_NAMES } from "./expr.mjs";

export const NAME_PATTERN = /^[a-z][A-Za-z0-9_]*$/u;

export const isValidName = (name) => NAME_PATTERN.test(name) && !RESERVED_NAMES.has(name);

/** Walks the whole tree for State / Let / Data; they are block-wide wherever written. */
export function collectDecls(root) {
  const states = [];
  const lets = [];
  const data = [];
  const visit = (node) => {
    if (!node || typeof node !== "object") return;
    if (node.t === "el") {
      if (node.n === "State") {
        for (const [name, prop] of Object.entries(node.p)) states.push({ name, prop, line: node.l });
      } else if (node.n === "Let") {
        for (const [name, prop] of Object.entries(node.p)) lets.push({ name, prop, line: node.l });
      } else if (node.n === "Data") {
        const name = node.p.name?.k === "lit" ? node.p.name.v : null;
        const src = node.p.src?.k === "lit" ? node.p.src.v : null;
        if (typeof name === "string" && typeof src === "string") data.push({ name, src, line: node.l });
      }
    }
    if (Array.isArray(node.c)) node.c.forEach(visit);
  };
  visit(root);
  return { states, lets, data };
}

export function defaultStateValues(decls) {
  const values = {};
  for (const state of decls.states) {
    if (state.prop.k === "lit") values[state.name] = state.prop.v;
  }
  return values;
}

/** Topological order of Let; `cycle` lists the names involved when there is one. */
export function orderLets(lets) {
  const byName = new Map(lets.map((item) => [item.name, item]));
  const dependencies = new Map(
    lets.map((item) => [
      item.name,
      item.prop.k === "expr" ? [...analyzeExpr(item.prop.e).names].filter((name) => byName.has(name)) : [],
    ]),
  );
  const order = [];
  const state = new Map();
  let cycle = null;
  const visit = (name, path) => {
    if (cycle) return;
    const mark = state.get(name);
    if (mark === "done") return;
    if (mark === "active") {
      cycle = [...path.slice(path.indexOf(name)), name];
      return;
    }
    state.set(name, "active");
    for (const dependency of dependencies.get(name) ?? []) visit(dependency, [...path, name]);
    state.set(name, "done");
    order.push(byName.get(name));
  };
  for (const item of lets) visit(item.name, []);
  return { order: cycle ? [] : order, cycle };
}

export function lookupFrom(...layers) {
  return (name) => {
    for (const layer of layers) {
      if (layer && Object.hasOwn(layer, name)) return { found: true, value: layer[name] };
    }
    return { found: false, value: undefined };
  };
}

/**
 * State values plus every Let, evaluated in dependency order. A Let that
 * throws becomes `undefined`; `onError(item, error)` lets callers report it.
 * @param {{ states: any[], lets: any[], data: any[] }} decls
 * @param {{ stateValues?: Record<string, unknown>, dataValues?: Record<string, unknown>, budget?: { steps: number, max: number }, onError?: (item: any, error: any) => void }} [options]
 * @returns {Record<string, unknown>}
 */
export function computeScope(decls, { stateValues, dataValues = {}, budget = createBudget(), onError } = {}) {
  const scope = { ...dataValues, ...stateValues };
  const { order, cycle } = orderLets(decls.lets);
  if (cycle) {
    for (const item of decls.lets) scope[item.name] = undefined;
    return scope;
  }
  for (const item of order) {
    if (item.prop.k === "lit") {
      scope[item.name] = item.prop.v;
      continue;
    }
    try {
      scope[item.name] = evaluate(item.prop.e, lookupFrom(scope), budget);
    } catch (error) {
      scope[item.name] = undefined;
      if (onError) onError(item, error);
      else if (!(error instanceof ExprError)) throw error;
    }
  }
  return scope;
}

const isPowerOfTwo = (value) => Number.isInteger(value) && value > 0 && (value & (value - 1)) === 0;
export { isPowerOfTwo };

export function sampleDomain({ from, to, scale = "linear", samples = 64, pow2 = false }) {
  if (pow2) {
    const values = [];
    for (let value = from; value <= to && values.length < 200; value *= 2) values.push(value);
    return values;
  }
  const count = Math.max(2, Math.min(200, Math.trunc(samples)));
  if (scale === "log") {
    const low = Math.log(from);
    const high = Math.log(to);
    return Array.from({ length: count }, (_, index) => Math.exp(low + ((high - low) * index) / (count - 1)));
  }
  return Array.from({ length: count }, (_, index) => from + ((to - from) * index) / (count - 1));
}

/**
 * Evaluates each series at every sample of the swept state.
 * @param {{ states: any[], lets: any[], data: any[] }} decls
 * @param {{ stateValues: Record<string, unknown>, dataValues?: Record<string, unknown>, sweep: string, domain: any, series: any[], budget?: { steps: number, max: number } }} options
 */
export function sweepSeries(decls, { stateValues, dataValues, sweep, domain, series, budget = createBudget(400000) }) {
  return sampleDomain(domain).map((x) => {
    const scope = computeScope(decls, { stateValues: { ...stateValues, [sweep]: x }, dataValues, budget, onError: () => {} });
    const ys = series.map((expression) => {
      try {
        const value = evaluate(expression, lookupFrom(scope), budget);
        return typeof value === "number" ? value : Number.NaN;
      } catch {
        return Number.NaN;
      }
    });
    return { x, ys };
  });
}

const closeEnough = (actual, expected, tolerance) => {
  if (typeof actual !== "number" || !Number.isFinite(actual)) return false;
  if (expected === 0) return Math.abs(actual) <= tolerance;
  return Math.abs(actual - expected) <= tolerance * Math.abs(expected);
};

/** Runs block-header `expect` items; returns failures with stable reasons. */
export function runExpect(decls, expectList, { dataValues = {} } = {}) {
  const failures = [];
  if (!Array.isArray(expectList)) return failures;
  const defaults = defaultStateValues(decls);
  const stateNames = new Set(decls.states.map((state) => state.name));
  expectList.forEach((item, index) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      failures.push({ index, reason: "shape", name: null });
      return;
    }
    const given = item.given ?? {};
    if (typeof given !== "object" || Array.isArray(given)) {
      failures.push({ index, reason: "shape", name: "given" });
      return;
    }
    const unknownGiven = Object.keys(given).find((name) => !stateNames.has(name));
    if (unknownGiven) {
      failures.push({ index, reason: "unknown-state", name: unknownGiven });
      return;
    }
    const scope = computeScope(decls, { stateValues: { ...defaults, ...given }, dataValues, onError: () => {} });
    for (const [name, expectation] of Object.entries(item)) {
      if (name === "given") continue;
      if (!Object.hasOwn(scope, name)) {
        failures.push({ index, reason: "unknown-name", name });
        continue;
      }
      const actual = scope[name];
      if (expectation && typeof expectation === "object" && !Array.isArray(expectation)) {
        const tolerance = typeof expectation.tol === "number" ? expectation.tol : 1e-9;
        if (!closeEnough(actual, expectation.value, tolerance)) failures.push({ index, reason: "mismatch", name, actual, expected: expectation.value });
      } else if (typeof expectation === "number") {
        if (!closeEnough(actual, expectation, 1e-9)) failures.push({ index, reason: "mismatch", name, actual, expected: expectation });
      } else if (actual !== expectation) {
        failures.push({ index, reason: "mismatch", name, actual, expected: expectation });
      }
    }
  });
  return failures;
}

const NUMBER_CELL = /^-?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/iu;

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[index + 1] === "\n") index += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  const [header = [], ...body] = rows.filter((current) => current.some((cell) => cell.trim()));
  const keys = header.map((cell) => cell.trim());
  return body.map((cells) =>
    Object.fromEntries(
      keys.map((key, index) => {
        const raw = (cells[index] ?? "").trim();
        return [key, NUMBER_CELL.test(raw) ? Number(raw) : raw];
      }),
    ),
  );
}

export const MAX_DATA_BYTES = 200 * 1024;

/** Parses a Data file; returns `{ value }` or `{ error }`. */
export function parseDataFile(src, text) {
  if (new TextEncoder().encode(text).length > MAX_DATA_BYTES) return { error: "数据文件超过 200 KB" };
  const lower = src.toLowerCase();
  if (lower.endsWith(".json")) {
    try {
      const value = JSON.parse(text);
      if (!value || typeof value !== "object") return { error: "JSON 顶层必须是数组或对象" };
      return { value };
    } catch {
      return { error: "不是有效的 JSON" };
    }
  }
  if (lower.endsWith(".csv")) return { value: parseCsv(text) };
  return { error: "只支持 .csv 或 .json" };
}
