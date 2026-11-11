import assert from "node:assert/strict";

export function assertLayoutViewport([viewportWidth, contentWidth, documentWidth], expectedWidth) {
  assert.equal(viewportWidth, expectedWidth, "layout viewport changed");
  assert.ok(contentWidth > 0 && contentWidth <= viewportWidth, "invalid content viewport");
  assert.equal(documentWidth, contentWidth, "whole-page horizontal overflow");
}
