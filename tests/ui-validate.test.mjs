import assert from "node:assert/strict";
import test from "node:test";
import { intentHash } from "../ui/core/fence.mjs";
import { checkUiBlock } from "../ui/core/validate.mjs";

const block = (body, header = "id: demo\ncaption: 一句判断") => `---\n${header}\n---\n${body}`;
const errorCodes = (body, header, options) =>
  checkUiBlock(block(body, header), options).diagnostics.filter((item) => item.severity === "error").map((item) => item.code);

const KV = `<State batch={1} seq={4096} />
<Let mem={2 * 32 * 8 * 128 * seq * batch * 2} />
<Slider bind="batch" label="batch" min={1} max={32} />
<Slider bind="seq" label="序列长度" min={1024} max={32768} scale="log" />
batch 为 {batch} 时要 {bytes(mem)}。
<Chart sweep="seq">
  <Line y={mem} format="bytes" />
</Chart>`;

test("a well-formed block passes, including its expect", () => {
  const result = checkUiBlock(block(KV, "id: kv\ncaption: 显存随 batch 线性增长\nexpect:\n  - given: { batch: 1, seq: 4096 }\n    mem: 536870912"));
  assert.equal(result.ok, true);
  assert.deepEqual(result.diagnostics, []);
});

test("requires id and caption in the block header and rejects unknown keys", () => {
  assert.deepEqual(new Set(errorCodes("<State a={1} />", "caption: x")), new Set(["ui-id"]));
  assert.deepEqual(new Set(errorCodes("<State a={1} />", "id: a")), new Set(["ui-caption"]));
  assert.deepEqual(new Set(errorCodes("<State a={1} />", "id: a\ncaption: b\nsrc: ./x.ui")), new Set(["ui-header"]));
  assert.deepEqual(errorCodes("<State a={1} />", "id: Bad_Id\ncaption: b"), ["ui-id"]);
});

test("flags a stale block as a warning, reading compiled from raw text", () => {
  const stale = checkUiBlock(block("<State a={1} />", "id: a\ncaption: b\nintent: 原话\ncompiled: 12e45678"));
  assert.equal(stale.ok, true);
  assert.deepEqual(stale.diagnostics.map((item) => [item.code, item.severity]), [["ui-stale", "warning"]]);
  const fresh = checkUiBlock(block("<State a={1} />", `id: a\ncaption: b\nintent: 原话\ncompiled: ${intentHash("原话")}`));
  assert.deepEqual(fresh.diagnostics, []);
});

test("unknown components get ui-component", () => {
  assert.deepEqual(errorCodes('<State x={1} />\n<Slidr bind="x" />'), ["ui-component"]);
});

test("props: unknown, missing, literal-only and wrong literal type", () => {
  assert.ok(errorCodes('<State x={1} />\n<Slider bind="x" label="x" min={0} max={2} color="red" />').includes("ui-prop"));
  assert.ok(errorCodes('<State x={1} />\n<Slider bind="x" min={0} max={2} />').includes("ui-prop"));
  assert.ok(errorCodes('<State x={1} />\n<Slider bind="x" label="x" min={0} max={2} scale={"log"} />').includes("ui-prop"));
  assert.ok(errorCodes('<Stack gap={9}>x</Stack>').includes("ui-prop"));
});

test("bindings must point at a declared state of the right type", () => {
  assert.deepEqual(errorCodes('<Slider bind="y" label="y" min={0} max={2} />'), ["ui-bind"]);
  assert.deepEqual(errorCodes('<State on={1} />\n<Toggle bind="on" label="开关" />'), ["ui-bind"]);
});

test("expressions are checked for whitelist and names", () => {
  assert.deepEqual(errorCodes('<State x={1} />\n<Stat label="a" value={Math.pow(x, 2)} />'), ["ui-expr"]);
  assert.deepEqual(errorCodes('<Stat label="a" value={ghost} />'), ["ui-expr"]);
  assert.deepEqual(errorCodes("{ghost} 不存在"), ["ui-expr"]);
});

test("child placement rules: Step only in Steps, Row only in Table / Grid", () => {
  assert.deepEqual(errorCodes('<Step title="a">x</Step>'), ["ui-children"]);
  assert.deepEqual(errorCodes('<Steps>\n  <Card>x</Card>\n  <Step title="a">x</Step>\n</Steps>'), ["ui-children"]);
  assert.deepEqual(errorCodes('<Steps>\n  <Step title="a">x</Step>\n</Steps>'), ["ui-limit"]);
  assert.deepEqual(errorCodes('<Grid cols={["a"]}>\n  <Each of={[1, 2]} as="i">\n    <Row cells={[i]} />\n  </Each>\n</Grid>'), []);
});

test("Markdown restrictions: no headings or raw HTML", () => {
  assert.deepEqual(errorCodes("## 标题"), ["ui-markdown"]);
  assert.ok(errorCodes("<div>x</div>").includes("ui-component"));
});

test("Let cycles are reported", () => {
  assert.deepEqual(errorCodes("<Let a={b + 1} b={a + 1} />"), ["ui-cycle"]);
});

test("evaluated checks: slider range, choice default, row width, tone names", () => {
  assert.deepEqual(errorCodes('<State x={0} />\n<Slider bind="x" label="x" min={1} max={2} />'), ["ui-prop"]);
  assert.deepEqual(errorCodes('<State x={1} />\n<Slider bind="x" label="x" min={0} max={2} scale="log" />'), ["ui-prop"]);
  assert.deepEqual(errorCodes('<State m="c" />\n<Choice bind="m" label="m" options={["a", "b"]} />'), ["ui-prop"]);
  assert.deepEqual(errorCodes('<Table columns={["a", "b"]}>\n  <Row cells={[1]} />\n</Table>'), ["ui-prop"]);
  assert.deepEqual(errorCodes('<Grid cols={["a"]}>\n  <Row cells={[1]} tones="glow" />\n</Grid>'), ["ui-prop"]);
});

test("evaluation errors inside a step are found even when that step is not the default", () => {
  const body = `<State step={0} />
<Let rows={[1, 2]} />
<Steps bind="step">
  <Step title="a">{rows[step]}</Step>
  <Step title="b">{rows[step + 5].x}</Step>
</Steps>`;
  assert.deepEqual(errorCodes(body), ["ui-eval"]);
});

test("Chart needs exactly one of sweep and data, and Bar only in data mode", () => {
  assert.ok(errorCodes('<State x={1} />\n<Chart>\n  <Line y={x} />\n</Chart>').includes("ui-prop"));
  assert.ok(errorCodes('<State x={1} />\n<Slider bind="x" label="x" min={0} max={2} />\n<Chart sweep="x">\n  <Bar y={x} />\n</Chart>').includes("ui-children"));
  assert.deepEqual(errorCodes('<Let rows={[{ t: 1, q: 2 }]} />\n<Chart data={rows} x={t}>\n  <Bar y={q} />\n</Chart>'), []);
});

test("expect failures surface as ui-expect", () => {
  assert.deepEqual(
    errorCodes("<State x={1} />\n<Let y={x * 2} />", "id: a\ncaption: b\nexpect:\n  - given: { x: 2 }\n    y: 5"),
    ["ui-expect"],
  );
});

test("limits: Steps count and Data files through readData", () => {
  const steps = Array.from({ length: 25 }, (_, index) => `  <Step title="s${index}">x</Step>`).join("\n");
  assert.deepEqual(errorCodes(`<Steps>\n${steps}\n</Steps>`), ["ui-limit"]);
  const dataBody = '<Data name="bench" src="./post/bench.csv" />\n<Table data={bench} columns={[{ label: "q", key: "q" }]} />';
  assert.deepEqual(errorCodes(dataBody, undefined, { markdownPath: "posts/post.md", readData: () => "q\n1\n" }), []);
  assert.deepEqual(errorCodes(dataBody, undefined, { markdownPath: "posts/post.md", readData: () => undefined }), ["ui-data"]);
  assert.deepEqual(
    errorCodes('<Data name="bench" src="../other/bench.csv" />', undefined, { markdownPath: "posts/post.md", readData: () => "q\n1" }),
    ["ui-data"],
  );
});

test("diagnostic lines are file lines when lineOffset is the fence's first line", () => {
  const result = checkUiBlock(block('<State x={1} />\n<Slidr bind="x" />'), { lineOffset: 10 });
  // fence line 10, header ---/id/caption/--- occupy 11–14, body starts at 15.
  assert.deepEqual(result.diagnostics.map((item) => item.line), [16]);
});
