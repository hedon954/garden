import assert from "node:assert/strict";
import test from "node:test";
import { assertLayoutViewport } from "./browser-viewport.mjs";

test("overlay scrollbar viewports retain the requested layout width", () => {
  assertLayoutViewport([375, 375, 375], 375);
});
test("reserved scrollbar viewports use the actual content width", () => {
  assertLayoutViewport([1200, 1185, 1185], 1200);
});
test("overflow into the reserved scrollbar gutter is still rejected", () => {
  assert.throws(() => assertLayoutViewport([1200, 1185, 1200], 1200));
});
test("invalid or expanded layout viewports cannot pass as scrollbar differences", () => {
  for (const value of [[390, 390, 390], [375, 0, 0], [375, 390, 390]]) {
    assert.throws(() => assertLayoutViewport(value, 375));
  }
});
