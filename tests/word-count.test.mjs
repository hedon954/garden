import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import matter from "gray-matter";
import { countDemoWords } from "../ui/garden/word-count.mjs";

test("demo word count keeps fenced and inline code, and excludes isolated sandbox source while counting its visible fallback", () => {
  const markdown = [
    "甲 `ab`",
    "",
    "```",
    "cd",
    "```",
    "",
    "```garden compose",
    "caption: 标题",
    "---",
    '<sandbox title="画布" html={"<p>不应计入的正文</p>"} />',
    "```",
    "",
    "<svg><text>图</text></svg>",
    "",
  ].join("\n");

  assert.equal(countDemoWords(markdown), 6 + "标题（网页中可交互：画布）".length);
});

test("Go article word count uses the demo renderer rule", () => {
  const markdown = fs.readFileSync("parity/articles/go-gc-tri-color-marking.md", "utf8");
  const count = countDemoWords(matter(markdown).content);
  const [scene] = matter(markdown).content.match(/^```garden compose\n[\s\S]*?^```/mu);
  // The migrated source retains the exact prose/static-SVG baseline. Only the
  // visible Compose caption and static sandbox fallback add countable text.
  assert.equal(countDemoWords(matter(markdown).content.replace(scene, "")), 34714);
  const title = "三色标记 + 删除屏障演示";
  assert.equal(count, 34714 + `${title}（网页中可交互：${title}）`.replace(/\s/gu, "").length);
});
