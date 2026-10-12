import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { compileUiBlock } from "../ui/core/compile.mjs";
import { PARITY_FIXTURES } from "../ui/parity-fixtures.mjs";

test("the six interaction fixtures and the sandbox canvas compile", () => {
  for (const fixture of PARITY_FIXTURES) {
    const result = compileUiBlock(fixture.body);
    assert.equal(result.check.ok, true, `${fixture.id}: ${JSON.stringify(result.check.diagnostics)}`);
    assert.equal(result.payload.id, fixture.id);
  }
});

test("slider, chart, steps, grid, code and diagram keep the measured sizes", () => {
  const css = fs.readFileSync(path.join(import.meta.dirname, "../ui/react/ui.css"), "utf8");
  assert.match(css, /::-webkit-slider-runnable-track \{\s*height: 24px;/u);
  assert.match(css, /::-webkit-slider-thumb \{\s*width: 18px;\s*height: 18px;\s*margin-top: 3px;/u);
  assert.match(css, /input\[type="range"\] \{\s*display: block;\s*width: 100%;\s*height: 38px;/u);
  assert.match(css, /\.garden-ui-steps \.garden-ui-progress \{ height: 3px;/u);
  assert.match(css, /\.garden-ui-chart-axis \{ stroke: var\(--gui-border\);/u);
  assert.match(css, /--gui-chart: #f4f4f4;/u);
  assert.match(css, /--gui-series-accent: #0285ff;/u);
  assert.match(css, /\.garden-ui-cell \{\s*min-width: 40px;\s*height: 36px;/u);
  assert.match(css, /\.garden-ui-code \{[^}]*border-radius: 12px;[^}]*font-size: 13px;\s*line-height: 1\.6;/u);
  assert.match(css, /data-highlight="true"\] \{ background: var\(--gui-info-soft\); box-shadow: inset 2px 0 0 var\(--gui-accent\);/u);
  assert.match(css, /path\.garden-ui-diagram-on \{ stroke: var\(--gui-accent\) !important; stroke-width: 2px/u);
});
