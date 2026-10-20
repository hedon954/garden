import test from "node:test";
import assert from "node:assert/strict";
import { handbookPageLang, handbookSwitchLabel, handbookSwitchTarget, handbookSwitchTitle } from "../app/lib/handbook-switch.mjs";

const pages = [
  ["/garden/", "zh"], ["/garden/reference/card/", "zh"], ["/garden-081/garden/", "zh"],
  ["/garden/en/", "en"], ["/garden/en/reference/card/", "en"], ["/garden-081/garden/en/reference/figure/", "en"],
];

test("Chinese handbook pages offer English and English pages offer Chinese, with or without a base path", () => {
  for (const [pathname, lang] of pages) {
    assert.equal(handbookPageLang(pathname), lang, pathname);
    assert.equal(handbookSwitchTarget(lang), lang === "en" ? "zh" : "en", pathname);
    assert.equal(handbookSwitchLabel(lang), lang === "en" ? "Switch to Chinese" : "Read in English", pathname);
  }
});

test("built-HTML tooltip names the missing counterpart language, matching the hydrated link", () => {
  assert.equal(handbookSwitchTitle("en", "zh"), "No Chinese version of this page yet");
  assert.equal(handbookSwitchTitle("en", "en"), "No Chinese version of this page yet");
  assert.equal(handbookSwitchTitle("zh", "zh"), "这一页还没有英文版");
  assert.equal(handbookSwitchTitle("zh", "en"), "No English version of this page yet");
});

import fs from "node:fs";
import path from "node:path";

test("every Chinese handbook page has an English counterpart (the switch on English sites relies on it)", () => {
  const root = path.resolve(import.meta.dirname, "../docs/handbook");
  const walk = (dir, base = "") => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? (base === "" && entry.name === "en" ? [] : walk(path.join(dir, entry.name), path.join(base, entry.name)))
      : entry.name.endsWith(".md") ? [path.join(base, entry.name)] : []);
  const zh = walk(root);
  assert.ok(zh.length > 10);
  const missing = zh.filter((file) => !fs.existsSync(path.join(root, "en", file)));
  assert.deepEqual(missing, []);
});
