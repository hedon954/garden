import assert from "node:assert/strict";
import test from "node:test";
import { readPayload } from "../ui/core/compile.mjs";
import { scanFences } from "../ui/core/fence.mjs";
import { contentForDistribution, contentForFeed, contentToSearchText, transformUiContent } from "../ui/core/transform.mjs";

const NOTE = "AUTHOR-NOTE-7f3a";

const post = [
  "开头。", //                                  1
  "",
  "```intent",
  `让读者拧一个数。${NOTE}`,
  "```",
  "",
  "```ui",
  "---",
  "id: bench",
  "caption: QPS 随线程上升。",
  `intent: ${NOTE}`,
  "---",
  '<Data name="bench" src="./post/bench.csv" />',
  "<Chart data={bench} x={threads}>",
  '  <Bar y={qps} label="QPS" />',
  "</Chart>",
  "```",
  "",
  "```ui",
  "---",
  "id: broken",
  "caption: 坏块。",
  "---",
  '<Slidr bind="x" />', //                     24
  "```",
  "",
].join("\n");

const options = {
  markdownPath: "content/posts/post.md",
  readData: (src) => (src === "./post/bench.csv" ? "threads,qps\n1,10\n2,20\n" : undefined),
};
const blockLangs = (content) => scanFences(content).map((fence) => fence.lang);

test("publish refuses intent and broken ui blocks, citing file lines", () => {
  const { errors } = transformUiContent(post, { ...options, mode: "publish", lineOffset: 10 });
  assert.deepEqual(
    errors.map((item) => [item.code, item.line]),
    [
      ["intent-uncompiled", 13],
      ["ui-component", 34],
    ],
  );
});

test("publish replaces a ui block with its payload, data inlined and the authoring header dropped", () => {
  const valid = post.slice(post.indexOf("```ui"), post.indexOf("```ui", post.indexOf("```ui") + 1));
  const { content, errors } = transformUiContent(valid, { ...options, mode: "publish" });
  assert.deepEqual(errors, []);
  const fences = scanFences(content);
  assert.deepEqual(fences.map((fence) => fence.lang), ["ui"]);
  const payload = readPayload(fences[0].body);
  assert.equal(payload.id, "bench");
  assert.equal(payload.caption, "QPS 随线程上升。");
  assert.equal("intent" in payload, false);
  assert.deepEqual(payload.data.bench, [
    { threads: 1, qps: 10 },
    { threads: 2, qps: 20 },
  ]);
});

test("preview keeps intent as a card and turns a broken block into a ui-error card", () => {
  const { content, errors } = transformUiContent(post, { ...options, mode: "preview" });
  assert.deepEqual(errors, []);
  assert.deepEqual(blockLangs(content), ["intent", "ui", "ui-error"]);
  const card = JSON.parse(scanFences(content)[2].body);
  assert.equal(card.id, "broken");
  assert.deepEqual(card.diagnostics.map((item) => item.code), ["ui-component"]);
});

test("search text, feed and distribution never carry author notes or raw blocks", () => {
  const { content } = transformUiContent(post, { ...options, mode: "preview" });
  assert.equal(contentToSearchText(content).includes(NOTE), false);
  for (const derived of [contentForFeed(content, { pageUrl: "https://example.com/blog/post" }), contentForDistribution(content)]) {
    assert.equal(derived.includes(NOTE), false);
    assert.deepEqual(blockLangs(derived).filter((lang) => ["ui", "ui-error", "intent"].includes(lang)), []);
  }
});
