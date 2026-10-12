import assert from "node:assert/strict";
import test from "node:test";
import { compileUiBlock } from "../ui/core/compile.mjs";
import { toDoc } from "../ui/core/static.mjs";

const payloadOf = (body) => {
  const { payload, check } = compileUiBlock(`---\nid: demo\ncaption: 判断\n---\n${body}`);
  assert.ok(payload, JSON.stringify(check.diagnostics));
  return payload;
};

test("bound Steps expand into an ordered list, each step evaluated at its own index", () => {
  const doc = toDoc(payloadOf(`<State step={0} />
<Let rows={step + 3} />
<Steps bind="step">
  <Step title="Prefill">已有 {rows} 行。</Step>
  <Step title="Decode">已有 {rows} 行。</Step>
</Steps>`));
  assert.equal(doc.length, 1);
  assert.equal(doc[0].k, "list");
  assert.equal(doc[0].ordered, true);
  const stepTexts = doc[0].items.map((item) => item[0].inl.filter((part) => part.k === "t").map((part) => part.v).join(""));
  assert.deepEqual(stepTexts, ["：已有 3 行。", "：已有 4 行。"]);
});

test("Each expands at the default state and Grid tones become annotations", () => {
  const doc = toDoc(payloadOf(`<State step={1} />
<Grid cols={["K"]} legend={{ new: "本步新算" }}>
  <Each of={range(0, 2)} as="i">
    <Row label={"t" + (i + 1)} cells={["k" + (i + 1)]} tones={i == step ? "new" : "cached"} />
  </Each>
</Grid>`));
  assert.deepEqual(doc[0], {
    k: "table",
    head: ["", "K"],
    rows: [["t1", "k1（读缓存）"], ["t2", "k2（本步新算）"]],
  });
});

test("sweep charts become six sample rows with computed values", () => {
  const doc = toDoc(payloadOf(`<State x={1} />
<Slider bind="x" label="x" min={0} max={10} />
<Chart sweep="x">
  <Line y={x * 2} label="两倍" />
</Chart>`));
  const table = doc.find((block) => block.k === "table");
  assert.deepEqual(table.head, ["x", "两倍"]);
  assert.deepEqual(table.rows, [["0", "0"], ["2", "4"], ["4", "8"], ["6", "12"], ["8", "16"], ["10", "20"]]);
});

test("inputs show their default value and data tables use column formats", () => {
  const doc = toDoc(payloadOf(`<State batch={8} />
<Slider bind="batch" label="batch" min={1} max={32} />
<Let bench={[{ t: 1, q: 98000 }]} />
<Table data={bench} columns={[{ label: "线程", key: "t" }, { label: "QPS", key: "q", format: "thousands" }]} />`));
  assert.equal(doc[0].k, "p");
  assert.deepEqual(doc[1], { k: "table", head: ["线程", "QPS"], rows: [["1", "98,000"]] });
});
