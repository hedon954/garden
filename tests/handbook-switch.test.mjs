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
