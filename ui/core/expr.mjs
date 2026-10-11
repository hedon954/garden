import { bits32, bits64, bytes, fixed, float32, percent, si, thousands } from "./format.mjs";

export class ExprError extends Error {}

const MAX_RANGE = 1000;

function range(start, end, step = 1) {
  if (![start, end, step].every((value) => typeof value === "number" && Number.isFinite(value))) {
    throw new ExprError("range 的参数必须是有限数字");
  }
  if (step === 0) throw new ExprError("range 的步长不能是 0");
  const values = [];
  for (let value = start; step > 0 ? value < end : value > end; value += step) {
    values.push(value);
    if (values.length > MAX_RANGE) throw new ExprError(`range 最多 ${MAX_RANGE} 项`);
  }
  return values;
}

const numbers = (values) => (Array.isArray(values) ? values.filter((value) => typeof value === "number") : []);

const FUNCTIONS = {
  abs: Math.abs,
  min: Math.min,
  max: Math.max,
  floor: Math.floor,
  ceil: Math.ceil,
  round: Math.round,
  trunc: Math.trunc,
  sqrt: Math.sqrt,
  cbrt: Math.cbrt,
  pow: Math.pow,
  exp: Math.exp,
  log: Math.log,
  log2: Math.log2,
  log10: Math.log10,
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  atan2: Math.atan2,
  clamp: (value, low, high) => Math.min(Math.max(value, low), high),
  range,
  len: (value) => (Array.isArray(value) || typeof value === "string" ? value.length : 0),
  sum: (values) => numbers(values).reduce((total, value) => total + value, 0),
  avg: (values) => {
    const list = numbers(values);
    return list.length ? list.reduce((total, value) => total + value, 0) / list.length : Number.NaN;
  },
  col: (rows, key) => (Array.isArray(rows) ? rows.map((row) => readMember(row, key)) : []),
  includes: (values, item) => (Array.isArray(values) || typeof values === "string" ? values.includes(item) : false),
  join: (values, separator = "、") => (Array.isArray(values) ? values.map(String).join(String(separator)) : ""),
  fixed,
  percent,
  bytes,
  si,
  thousands,
  float32,
  bits32,
  bits64,
};

const CONSTANTS = { PI: Math.PI, E: Math.E };

export const FUNCTION_NAMES = Object.freeze(Object.keys(FUNCTIONS));
export const RESERVED_NAMES = new Set([...FUNCTION_NAMES, ...Object.keys(CONSTANTS), "undefined", "NaN", "Infinity"]);

const BINARY = new Set(["+", "-", "*", "/", "%", "**", "==", "!=", "===", "!==", "<", "<=", ">", ">="]);
const LOGICAL = new Set(["&&", "||", "??"]);
const UNARY = new Set(["-", "+", "!"]);
const FORBIDDEN_KEYS = new Set(["__proto__", "prototype", "constructor"]);

const isPlainObject = (value) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

function readMember(target, key) {
  if (typeof key !== "string" && typeof key !== "number") return undefined;
  const name = String(key);
  if (FORBIDDEN_KEYS.has(name)) throw new ExprError(`不能读取 ${name}`);
  if (Array.isArray(target) || typeof target === "string") {
    if (name === "length") return target.length;
    if (/^\d+$/u.test(name)) return target[Number(name)];
    return undefined;
  }
  if (isPlainObject(target)) return Object.hasOwn(target, name) ? target[name] : undefined;
  if (target === undefined || target === null) throw new ExprError(`不能从空值读取 ${name}`);
  return undefined;
}

/**
 * Static check: reports syntax outside the whitelist and returns the free
 * names an expression reads, so validation can resolve them against the block.
 */
export function analyzeExpr(node) {
  const problems = [];
  const names = new Set();
  const visit = (current) => {
    if (!current || typeof current !== "object") {
      problems.push("表达式不完整");
      return;
    }
    switch (current.type) {
      case "Literal":
        if (current.regex) problems.push("不能使用正则");
        if (typeof current.value === "bigint") problems.push("不能使用 BigInt");
        return;
      case "TemplateLiteral":
        current.expressions.forEach(visit);
        return;
      case "Identifier":
        names.add(current.name);
        return;
      case "ArrayExpression":
        for (const element of current.elements) {
          if (!element) problems.push("数组里不能有空位");
          else if (element.type === "SpreadElement") problems.push("不能使用展开语法 ...");
          else visit(element);
        }
        return;
      case "ObjectExpression":
        for (const property of current.properties) {
          if (property.type !== "Property" || property.kind !== "init" || property.method) {
            problems.push("对象里只能写 键: 值");
            continue;
          }
          if (property.computed) {
            problems.push("对象的键不能是计算出来的");
            continue;
          }
          visit(property.value);
        }
        return;
      case "UnaryExpression":
        if (!UNARY.has(current.operator)) problems.push(`不能使用运算符 ${current.operator}`);
        visit(current.argument);
        return;
      case "BinaryExpression":
        if (!BINARY.has(current.operator)) problems.push(`不能使用运算符 ${current.operator}`);
        visit(current.left);
        visit(current.right);
        return;
      case "LogicalExpression":
        if (!LOGICAL.has(current.operator)) problems.push(`不能使用运算符 ${current.operator}`);
        visit(current.left);
        visit(current.right);
        return;
      case "ConditionalExpression":
        visit(current.test);
        visit(current.consequent);
        visit(current.alternate);
        return;
      case "CallExpression":
        if (current.optional) problems.push("不能使用 ?.()");
        if (current.callee.type !== "Identifier") {
          problems.push("只能直接调用白名单函数，不能调用方法");
        } else if (!Object.hasOwn(FUNCTIONS, current.callee.name)) {
          problems.push(`不能调用 ${current.callee.name}`);
        }
        for (const argument of current.arguments) {
          if (argument.type === "SpreadElement") problems.push("不能使用展开语法 ...");
          else visit(argument);
        }
        return;
      case "MemberExpression":
        if (current.optional) problems.push("不能使用 ?.");
        visit(current.object);
        if (current.computed) visit(current.property);
        else if (FORBIDDEN_KEYS.has(current.property.name)) problems.push(`不能读取 ${current.property.name}`);
        return;
      case "ChainExpression":
        problems.push("不能使用 ?.");
        return;
      default:
        problems.push(`不能使用 ${current.type}`);
    }
  };
  visit(node);
  return { problems, names };
}

export function createBudget(max = 100000) {
  return { steps: 0, max };
}

/**
 * Evaluates a pre-checked ESTree expression. `lookup(name)` returns
 * `{ found, value }`; nothing outside the whitelist is reachable.
 */
export function evaluate(node, lookup, budget = createBudget()) {
  budget.steps += 1;
  if (budget.steps > budget.max) throw new ExprError("表达式计算步数超出预算");
  switch (node.type) {
    case "Literal":
      return node.value;
    case "TemplateLiteral": {
      let output = "";
      node.quasis.forEach((quasi, index) => {
        output += quasi.value.cooked ?? quasi.value.raw;
        if (index < node.expressions.length) {
          const value = evaluate(node.expressions[index], lookup, budget);
          output += value === undefined || value === null ? "" : String(value);
        }
      });
      return output;
    }
    case "Identifier": {
      if (Object.hasOwn(CONSTANTS, node.name)) return CONSTANTS[node.name];
      if (node.name === "undefined") return undefined;
      if (node.name === "NaN") return Number.NaN;
      if (node.name === "Infinity") return Number.POSITIVE_INFINITY;
      const result = lookup(node.name);
      if (!result.found) throw new ExprError(`未知名字 ${node.name}`);
      return result.value;
    }
    case "ArrayExpression":
      return node.elements.map((element) => evaluate(element, lookup, budget));
    case "ObjectExpression": {
      const output = {};
      for (const property of node.properties) {
        const key = property.key.type === "Identifier" ? property.key.name : String(property.key.value);
        if (FORBIDDEN_KEYS.has(key)) throw new ExprError(`不能使用键 ${key}`);
        output[key] = evaluate(property.value, lookup, budget);
      }
      return output;
    }
    case "UnaryExpression": {
      const value = evaluate(node.argument, lookup, budget);
      if (node.operator === "-") return -value;
      if (node.operator === "+") return +value;
      return !value;
    }
    case "BinaryExpression": {
      const left = evaluate(node.left, lookup, budget);
      const right = evaluate(node.right, lookup, budget);
      switch (node.operator) {
        case "+":
          return left + right;
        case "-":
          return left - right;
        case "*":
          return left * right;
        case "/":
          return left / right;
        case "%":
          return left % right;
        case "**":
          return left ** right;
        case "==":
        case "===":
          return left === right;
        case "!=":
        case "!==":
          return left !== right;
        case "<":
          return left < right;
        case "<=":
          return left <= right;
        case ">":
          return left > right;
        case ">=":
          return left >= right;
        default:
          throw new ExprError(`不能使用运算符 ${node.operator}`);
      }
    }
    case "LogicalExpression": {
      const left = evaluate(node.left, lookup, budget);
      if (node.operator === "&&") return left ? evaluate(node.right, lookup, budget) : left;
      if (node.operator === "||") return left ? left : evaluate(node.right, lookup, budget);
      return left ?? evaluate(node.right, lookup, budget);
    }
    case "ConditionalExpression":
      return evaluate(node.test, lookup, budget)
        ? evaluate(node.consequent, lookup, budget)
        : evaluate(node.alternate, lookup, budget);
    case "CallExpression": {
      const fn = FUNCTIONS[node.callee.name];
      if (!fn) throw new ExprError(`不能调用 ${node.callee.name}`);
      return fn(...node.arguments.map((argument) => evaluate(argument, lookup, budget)));
    }
    case "MemberExpression": {
      const target = evaluate(node.object, lookup, budget);
      const key = node.computed ? evaluate(node.property, lookup, budget) : node.property.name;
      return readMember(target, key);
    }
    default:
      throw new ExprError(`不能使用 ${node.type}`);
  }
}

const KEEP = new Set([
  "type", "value", "raw", "regex", "name", "operator", "prefix", "left", "right", "argument", "test",
  "consequent", "alternate", "callee", "arguments", "object", "property", "computed", "optional",
  "elements", "properties", "key", "kind", "method", "shorthand", "quasis", "expressions", "cooked", "tail",
]);

/** Drops positions and parser metadata so the tree is small and JSON-safe. */
export function pruneExpr(node) {
  if (Array.isArray(node)) return node.map(pruneExpr);
  if (!node || typeof node !== "object") return node;
  const output = {};
  for (const [key, value] of Object.entries(node)) {
    if (!KEEP.has(key)) continue;
    if (key === "value" && node.type === "Literal" && typeof value === "bigint") continue;
    output[key] = value && typeof value === "object" ? pruneExpr(value) : value;
  }
  return output;
}
