import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import matter from "gray-matter";
import { countDemoWords } from "../ui/garden/word-count.mjs";

test("demo word count keeps fenced and inline code, and drops garden html documents", () => {
  const markdown = [
    "甲 `ab`",
    "",
    "```",
    "cd",
    "```",
    "",
    "```garden html",
    "title: 标题",
    "---",
    "<!doctype html><p>不应计入的正文</p>",
    "```",
    "",
    "```garden figure",
    "parts:",
    "  - { id: n1, label: 标签, text: 说明 }",
    "---",
    "<svg><text>图</text></svg>",
    "```",
    "",
  ].join("\n");

  assert.equal(countDemoWords(markdown), 10);
});

test("Go article word count uses the demo renderer rule", () => {
  const markdown = fs.readFileSync("parity/articles/go-gc-tri-color-marking.md", "utf8");
  const count = countDemoWords(matter(markdown).content);
  // The demo page prints 35,234. This parity article has the same prose and the
  // same fenced code. Its garden html block has no `fallback:` line. The demo
  // source renders that line in <noscript>, which the tag strip keeps: 129
  // characters. 35,234 − 35,105 = 129.
  assert.equal(count, 35105);
  assert.equal(35234 - count, 129);
});
