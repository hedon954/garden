import assert from "node:assert/strict";
import test from "node:test";
import { dilToUiSource, looksLikeDilPlay, parsePlayCompose } from "../ui/compose/dil.mjs";
import { compileUiBlock } from "../ui/core/compile.mjs";

test("detects DIL without stealing static scenes", () => {
  assert.equal(looksLikeDilPlay("{@body const [n, setN] = DIL.useState(1)}\n<slider value={n} onChange={setN} />"), true);
  assert.equal(looksLikeDilPlay("<box><text>Static</text></box>"), false);
});

test("lowers slider + body + expr", () => {
  const body = `caption: pot
---
{@body const [diameter, setDiameter] = DIL.useState(12)}
{@body const water = Math.round(diameter * diameter * 0.35 + 20)}
<slider min={8} max={24} value={diameter} onChange={setDiameter} label="盆口直径" unit="cm" />
<stat label="这一次" value={water} unit="ml" />
`;
  const block = parsePlayCompose({ id: "pot-water" }, body);
  assert.equal(block.mode, "play");
  assert.equal(block.dil, true);
  assert.match(block.uiSource, /<State diameter=\{12\}/);
  assert.match(block.uiSource, /bind="diameter"/);
  const { check } = compileUiBlock(block.uiSource);
  assert.equal(check.ok, true, JSON.stringify(check.diagnostics));
});

test("lowers if/each and pie slices", () => {
  const ifEach = parsePlayCompose(
    { id: "flow" },
    `caption: x\n---\n{@body const items = [1,2,3]}\n{#each items as item, i}\n第 {i + 1} 项：{item}\n{/each}\n{#if items.length > 2}\nok\n{:else}\nempty\n{/if}`,
  );
  const { check: c1 } = compileUiBlock(ifEach.uiSource);
  assert.equal(c1.ok, true, JSON.stringify(c1.diagnostics));

  const pie = dilToUiSource({
    id: "pie",
    props: { caption: "t" },
    body: `<pie title="t" slices={[{label:"a", value:1}, {label:"b", value:2}]} />`,
  });
  assert.match(pie.source, /<Slice label=\{"a"\} value=\{1\}/);
  const { check: c2 } = compileUiBlock(pie.source);
  assert.equal(c2.ok, true, JSON.stringify(c2.diagnostics));
});

test("lowers button onClick setName(expr)", () => {
  const block = parsePlayCompose(
    { id: "btn" },
    `caption: x\n---\n{@body const [n, setN] = DIL.useState(3)}\n<button onClick={setN(1)}>清为 1</button>`,
  );
  assert.match(block.uiSource, /set=\{\{\s*n:\s*1\s*\}\}/);
  const { check } = compileUiBlock(block.uiSource);
  assert.equal(check.ok, true, JSON.stringify(check.diagnostics));
});

test("intent YAML may mention {@body} without breaking the tree", () => {
  const body = `caption: pot
intent: |
  验收 slider 与 {@body} 派生值。
---
{@body const [diameter, setDiameter] = DIL.useState(12)}
{@body const water = Math.round(diameter * diameter * 0.35 + 20)}
<slider min={8} max={24} value={diameter} onChange={setDiameter} label="盆口直径" unit="cm" />
<stat label="这一次" value={water} unit="ml" />
`;
  const block = parsePlayCompose({ id: "pot-water" }, body);
  assert.equal(block.error, undefined, JSON.stringify(block.error));
  assert.equal(block.dil, true);
  assert.match(block.uiSource, /bind="diameter"/);
  const { check } = compileUiBlock(block.uiSource);
  assert.equal(check.ok, true, JSON.stringify(check.diagnostics));
});

test("if/each plain text lowers to a painted Caption leaf", () => {
  const block = parsePlayCompose(
    { id: "flow" },
    `caption: x
---
{@body const items = ["香草", "多肉"]}
{@body const seats = 8}
{#each items as name, i}
第 {i + 1} 项：{name}
{/each}
{#if seats >= 5}
批量折扣档：{seats} 席
{:else}
标准档：{seats} 席
{/if}
`,
  );
  assert.match(block.uiSource, /<Each[\s\S]*<Caption>第 \{i \+ 1\} 项：\{name\}<\/Caption>/);
  assert.match(block.uiSource, /<If test=\{seats >= 5\}>[\s\S]*<Caption>批量折扣档：\{seats\} 席<\/Caption>/);
  const { check } = compileUiBlock(block.uiSource);
  assert.equal(check.ok, true, JSON.stringify(check.diagnostics));
});
