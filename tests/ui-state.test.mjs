import assert from "node:assert/strict";
import test from "node:test";
import { parseUiBody } from "../ui/core/parse.mjs";
import { collectDecls, computeScope, defaultStateValues, orderLets, parseDataFile, runExpect, sampleDomain } from "../ui/core/state.mjs";

const declsOf = (body) => collectDecls(parseUiBody(body).root);

test("orders Let by dependency regardless of writing order", () => {
  const decls = declsOf("<State a={2} />\n<Let c={b * 10} b={a + 1} />");
  assert.deepEqual(orderLets(decls.lets).order.map((item) => item.name), ["b", "c"]);
  assert.deepEqual(computeScope(decls, { stateValues: defaultStateValues(decls) }), { a: 2, b: 3, c: 30 });
});

test("detects Let cycles", () => {
  const decls = declsOf("<Let a={b + 1} b={c} c={a} />");
  const { cycle, order } = orderLets(decls.lets);
  assert.deepEqual(order, []);
  assert.equal(cycle.at(0), cycle.at(-1));
  assert.ok(cycle.includes("a") && cycle.includes("b") && cycle.includes("c"));
});

test("a Let that cannot be computed becomes undefined without stopping the others", () => {
  const decls = declsOf("<State n={1} />\n<Let bad={rows[3].x} ok={n + 1} />");
  const errors = [];
  const scope = computeScope(decls, { stateValues: defaultStateValues(decls), onError: (item) => errors.push(item.name) });
  assert.equal(scope.bad, undefined);
  assert.equal(scope.ok, 2);
  assert.deepEqual(errors, ["bad"]);
});

test("samples linear, log and power-of-two domains", () => {
  assert.deepEqual(sampleDomain({ from: 0, to: 10, samples: 3 }), [0, 5, 10]);
  const log = sampleDomain({ from: 1, to: 100, scale: "log", samples: 3 });
  assert.equal(log.length, 3);
  assert.ok(Math.abs(log[1] - 10) < 1e-9);
  assert.deepEqual(sampleDomain({ from: 1024, to: 8192, pow2: true }), [1024, 2048, 4096, 8192]);
});

test("expect passes within tolerance and reports typed failures", () => {
  const decls = declsOf("<State guests={6} />\n<Let lamb={0.4 * guests} />");
  assert.deepEqual(runExpect(decls, [{ given: { guests: 6 }, lamb: 2.4 }]), []);
  assert.deepEqual(runExpect(decls, [{ given: { guests: 6 }, lamb: { value: 2.5, tol: 0.05 } }]), []);
  assert.deepEqual(
    runExpect(decls, [
      { given: { guests: 6 }, lamb: 3 },
      { given: { people: 6 }, lamb: 2.4 },
      { given: { guests: 6 }, ghost: 1 },
    ]).map((failure) => failure.reason),
    ["mismatch", "unknown-state", "unknown-name"],
  );
});

test("parses CSV with numeric coercion and quoted fields", () => {
  const { value } = parseDataFile("bench.csv", 'threads,qps,note\n1,98000,"a, b"\n2,181000,plain\n');
  assert.deepEqual(value, [
    { threads: 1, qps: 98000, note: "a, b" },
    { threads: 2, qps: 181000, note: "plain" },
  ]);
  assert.ok(parseDataFile("bench.txt", "x").error);
  assert.ok(parseDataFile("bench.json", "not json").error);
});
