import assert from "node:assert/strict";
import test from "node:test";
import * as acorn from "acorn";
import { analyzeExpr, createBudget, evaluate, ExprError } from "../ui/core/expr.mjs";
import { lookupFrom } from "../ui/core/state.mjs";

const parse = (source) => acorn.parseExpressionAt(source, 0, { ecmaVersion: "latest" });
const run = (source, scope = {}, budget) => evaluate(parse(source), lookupFrom(scope), budget);

test("follows JavaScript precedence for arithmetic, comparison and logic", () => {
  assert.equal(run("2 + 3 * 4 ** 2"), 50);
  assert.equal(run("(2 + 3) * 4"), 20);
  assert.equal(run("-(2 ** 2)"), -4);
  assert.equal(run("a > 1 && b < 1 || c", { a: 2, b: 0, c: false }), true);
  assert.equal(run("x ?? 7", { x: null }), 7);
  assert.equal(run("step == 0 ? 'new' : 'cached'", { step: 0 }), "new");
});

test("treats == as strict equality", () => {
  assert.equal(run("1 == '1'"), false);
  assert.equal(run("0 != false"), true);
});

test("keeps IEEE-754 double semantics", () => {
  assert.equal(run("0.1 + 0.2"), 0.30000000000000004);
  assert.equal(run("1 / 0"), Number.POSITIVE_INFINITY);
});

test("reads array items, object fields and length", () => {
  assert.equal(run("rows[1].qps", { rows: [{ qps: 1 }, { qps: 2 }] }), 2);
  assert.equal(run("['a', 'b'][step]", { step: 1 }), "b");
  assert.equal(run("items.length", { items: [1, 2, 3] }), 3);
  assert.equal(run("row.missing", { row: { a: 1 } }), undefined);
});

test("calls whitelisted functions", () => {
  assert.equal(run("max(1, pow(2, 3), sqrt(49))"), 8);
  assert.deepEqual(run("range(0, 3)"), [0, 1, 2]);
  assert.equal(run("sum(col(rows, 'v'))", { rows: [{ v: 2 }, { v: 3 }] }), 5);
  assert.equal(run("clamp(15, 0, 10)"), 10);
});

test("rejects syntax outside the whitelist before anything runs", () => {
  for (const source of [
    "Math.pow(2, 3)",
    "rows.map(1)",
    "(() => 1)()",
    "/a/.test('a')",
    "fetch('x')",
    "[...rows]",
    "a?.b",
    "new Date()",
    "typeof a",
    "a in b",
  ]) {
    assert.notEqual(analyzeExpr(parse(source)).problems.length, 0, source);
  }
});

test("reports the free names an expression reads", () => {
  const { names, problems } = analyzeExpr(parse("2 * seq * batch + max(a, PI)"));
  assert.deepEqual(problems, []);
  assert.deepEqual([...names].sort(), ["PI", "a", "batch", "seq"]);
});

test("blocks prototype access at runtime", () => {
  assert.throws(() => run("o['__proto__']", { o: {} }), ExprError);
  assert.throws(() => run("o[key]", { o: {}, key: "constructor" }), ExprError);
});

test("throws a typed error for unknown names and reading from undefined", () => {
  assert.throws(() => run("missing + 1"), ExprError);
  assert.throws(() => run("rows[5].qps", { rows: [] }), ExprError);
});

test("caps range length and evaluation steps", () => {
  assert.throws(() => run("range(0, 5000)"), ExprError);
  assert.throws(() => run("1 + 1 + 1 + 1 + 1", {}, createBudget(3)), ExprError);
});
