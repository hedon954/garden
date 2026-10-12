import assert from "node:assert/strict";
import test from "node:test";
import { applyBlock, ApplyError } from "../ui/core/apply.mjs";
import { compiledOf, fenceHash, findBlocks, intentHash, splitUiBody } from "../ui/core/fence.mjs";

const POST = `前面的段落。

\`\`\`intent kv
让读者拧 batch。
\`\`\`

中间的段落。

\`\`\`intent
没有 id 的想法。
\`\`\`

后面的段落。
`;

const UI = `\`\`\`ui
---
id: kv
caption: 显存随 batch 线性增长。
intent: |
  让读者拧 batch。
---
<State batch={1} />
<Slider bind="batch" label="batch" min={1} max={32} />
\`\`\``;

const codeOf = (fn) => {
  try {
    fn();
  } catch (error) {
    assert.ok(error instanceof ApplyError);
    return error.code;
  }
  return null;
};

test("replaces only the target block and stamps compiled", () => {
  const { markdown, kind } = applyBlock(POST, { id: "kv" }, UI);
  assert.equal(kind, "ui");
  const [first, second] = findBlocks(markdown);
  assert.equal(first.lang, "ui");
  assert.equal(compiledOf(splitUiBody(first.body).headerText), intentHash("让读者拧 batch。\n"));
  assert.equal(markdown.slice(0, first.start), POST.slice(0, findBlocks(POST)[0].start));
  assert.equal(markdown.slice(second.start), POST.slice(findBlocks(POST)[1].start));
});

test("locates a block without id by its intent hash", () => {
  const { markdown } = applyBlock(POST, { intentHash: intentHash("没有 id 的想法。") }, "改回一句正文。");
  assert.ok(markdown.includes("中间的段落。\n\n改回一句正文。\n\n后面的段落。"));
  assert.equal(findBlocks(markdown).length, 1);
});

test("refuses ambiguous, missing or untargeted blocks", () => {
  const twice = `${POST}\n\`\`\`intent kv\n重复\n\`\`\`\n`;
  assert.equal(codeOf(() => applyBlock(twice, { id: "kv" }, UI)), "apply-ambiguous");
  assert.equal(codeOf(() => applyBlock(POST, { id: "nope" }, UI)), "apply-not-found");
  assert.equal(codeOf(() => applyBlock(POST, {}, UI)), "apply-target");
});

test("--base protects a block that changed locally", () => {
  const current = fenceHash(findBlocks(POST)[0].raw);
  assert.doesNotThrow(() => applyBlock(POST, { id: "kv" }, UI, { base: current }));
  assert.equal(codeOf(() => applyBlock(POST, { id: "kv" }, UI, { base: "00000000" })), "apply-base");
});

test("rejects an invalid ui block and prose that still contains fences", () => {
  const broken = UI.replace("<Slider", "<Slidr");
  assert.equal(codeOf(() => applyBlock(POST, { id: "kv" }, broken)), "apply-invalid");
  assert.equal(codeOf(() => applyBlock(POST, { id: "kv" }, `正文\n\n\`\`\`intent\nx\n\`\`\``)), "apply-content");
});

test("keeps CRLF line endings", () => {
  const crlf = POST.replace(/\n/gu, "\r\n");
  const { markdown } = applyBlock(crlf, { id: "kv" }, UI);
  assert.equal(markdown.includes("\n") && !/[^\r]\n/u.test(markdown), true);
});
