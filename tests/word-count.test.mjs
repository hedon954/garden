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
    "<svg><text>图</text></svg>",
    "",
  ].join("\n");

  assert.equal(countDemoWords(markdown), 6);
});

test("Go article word count uses the demo renderer rule", () => {
  const markdown = fs.readFileSync("parity/articles/go-gc-tri-color-marking.md", "utf8");
  const count = countDemoWords(matter(markdown).content);
  // Diagrams in this article are static SVG. The count includes that SVG text
  // and the prose, and leaves out the old annotated-diagram tab labels.
  assert.equal(count, 34714);
});
