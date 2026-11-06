import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { compileUiBlock } from "../ui/core/compile.mjs";
import { dilToUiSource, parsePlayCompose } from "../ui/compose/dil.mjs";

const css = fs.readFileSync(path.join(import.meta.dirname, "../ui/react/ui.css"), "utf8");

test("chart series palette does not use Claude paper --blue", () => {
  assert.match(css, /--gui-series-accent:\s*var\(--gui-info\)/u);
  assert.doesNotMatch(css, /--gui-series-accent:\s*var\(--blue\)/u);
  assert.match(css, /--gui-cat-0:\s*#539af8/u);
  assert.match(css, /\.garden-ui-cat-3\s*\{\s*--gui-series:\s*var\(--gui-cat-3\)/u);
});

test("frameless host chrome is opt-in via data-frame=none", () => {
  assert.match(css, /\.garden-ui\[data-frame="none"\]/u);
  const block = parsePlayCompose(
    { id: "bare" },
    `caption: bare
frame: none
---
{@body const n = 1}
<stat label="n" value={n} />`,
  );
  assert.equal(block.error, undefined, JSON.stringify(block.error));
  const { payload, check } = compileUiBlock(block.uiSource);
  assert.equal(check.ok, true, JSON.stringify(check.diagnostics));
  assert.equal(payload.frame, "none");
});

test("stack justify between compiles for title-left badge-right", () => {
  const body = `caption: header
---
{@body const rows=[{h:"20:00",p:0.28}]}
<stack direction="row" justify="between" align="center" gap={2}>
  <caption>用户活跃时间分布（示例）</caption>
  <badge tone="new">推荐 20:00</badge>
</stack>
<chart data={rows} x={h} yFormat="percent" yMax={0.32} yStep={0.08}>
  <bar y={p} label="活跃概率" />
</chart>`;
  const block = parsePlayCompose({ id: "hdr" }, body);
  const { check } = compileUiBlock(block.uiSource);
  assert.equal(check.ok, true, JSON.stringify(check.diagnostics));
  assert.match(block.uiSource, /justify="between"/);
});

test("chart yStep and palette categorical compile; yStep 0 fails", () => {
  const ok = parsePlayCompose(
    { id: "cat" },
    `caption: c
---
{@body const rows=[{h:"08:00",p:0.05},{h:"20:00",p:0.28}]}
<chart data={rows} x={h} palette="categorical" yMax={0.32} yStep={0.08} overflow="expand">
  <bar y={p} label="p" />
</chart>`,
  );
  const { check } = compileUiBlock(ok.uiSource);
  assert.equal(check.ok, true, JSON.stringify(check.diagnostics));

  const bad = dilToUiSource({
    id: "bad-step",
    props: { caption: "c" },
    body: `<chart data={[{h:1,p:1}]} x={h} yStep={0}>
  <bar y={p} />
</chart>`,
  });
  const { check: c2 } = compileUiBlock(bad.source);
  assert.equal(c2.ok, false);
  assert.ok(c2.diagnostics.some((d) => /yStep/.test(d.message)));
});

test("fusion weight extremes compile with expand overflow", () => {
  const body = `caption: fusion
frame: none
---
{@body const [w, setW] = DIL.useState(45)}
{@body const a = w / 100}
{@body const p08 = a * 0.05 + (1 - a) * 0.12}
{@body const p12 = a * 0.12 + (1 - a) * 0.22}
{@body const p18 = a * 0.20 + (1 - a) * 0.26}
{@body const p20 = a * 0.45 + (1 - a) * 0.28}
{@body const p22 = a * 0.18 + (1 - a) * 0.12}
{@body const rows = [{ h: "08:00", p: p08 }, { h: "12:00", p: p12 }, { h: "18:00", p: p18 }, { h: "20:00", p: p20 }, { h: "22:00", p: p22 }]}
{@body const peak = max(p08, p12, p18, p20, p22)}
{@body const best = p20 == peak ? "20:00" : (p18 == peak ? "18:00" : (p12 == peak ? "12:00" : (p22 == peak ? "22:00" : "08:00")))}
<choice value={w} onChange={setW} label="权重快切" options={[{value:0,label:"0%"},{value:45,label:"45%"},{value:100,label:"100%"}]} />
<slider min={0} max={100} value={w} onChange={setW} label="个人活跃数据权重" unit="%" />
<chart data={rows} x={h} palette="categorical" yLabel="融合后活跃概率" yFormat="percent" yMax={0.4} overflow="expand" height={280}>
  <bar y={p} label="融合后活跃概率" />
</chart>
<stat label="预测最佳时间" value={best} />`;
  const block = parsePlayCompose({ id: "fusion" }, body);
  const { check, payload } = compileUiBlock(block.uiSource);
  assert.equal(check.ok, true, JSON.stringify(check.diagnostics));
  assert.equal(payload.frame, "none");
});

test("best-time switching fixture: peak moves when weights change", () => {
  const body = `caption: flip
---
{@body const [w, setW] = DIL.useState(0)}
{@body const a = w / 100}
{@body const p12 = a * 0.50 + (1 - a) * 0.10}
{@body const p20 = a * 0.10 + (1 - a) * 0.40}
{@body const rows = [{ h: "12:00", p: p12 }, { h: "20:00", p: p20 }]}
{@body const best = p12 >= p20 ? "12:00" : "20:00"}
<slider min={0} max={100} value={w} onChange={setW} label="α" unit="%" />
<chart data={rows} x={h} yFormat="percent" overflow="expand">
  <bar y={p} label="p" />
</chart>
<stat label="预测最佳时间" value={best} />`;
  const block = parsePlayCompose({ id: "flip" }, body);
  const { check } = compileUiBlock(block.uiSource);
  assert.equal(check.ok, true, JSON.stringify(check.diagnostics));
  assert.ok(0.4 > 0.1);
  assert.ok(0.5 > 0.1);
});
