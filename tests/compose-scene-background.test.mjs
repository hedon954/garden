import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import postcss from "postcss";
import { parseCompose, renderCompose } from "../ui/compose/index.mjs";

const stylesheet = file => postcss.parse(fs.readFileSync(new URL(file, import.meta.url), "utf8"));
const compose = stylesheet("../ui/compose/compose.css");
function declarations(css, selector) {
  const values = {};
  css.walkRules(rule => {
    if (!rule.selectors.includes(selector)) return;
    rule.walkDecls(decl => { values[decl.prop] = decl.value; });
  });
  return values;
}

// These are source/cascade contracts, not a substitute for browser geometry.
test("default static scenes are transparent without removing their frame or inherited type", () => {
  const style = declarations(compose, ".g-compose");
  assert.equal(style.background, "transparent");
  assert.match(style.border, /^1px solid /);
  assert.equal(style["border-radius"], "8px");
  assert.notEqual(style.padding, "0");
  assert.equal(style["font-family"], "inherit");
  assert.equal(style["font-size"], "inherit");
  const parsed = parseCompose("<text>Article diagram</text>");
  assert.equal(parsed.ok, true);
  assert.match(renderCompose(parsed.doc), /^<figure class="g-compose">/);
  assert.doesNotMatch(renderCompose(parsed.doc), /data-frame="none"/);
});

test("explicit colors, theme surfaces and accent tones keep their own fills", () => {
  const parsed = parseCompose('<figure><card backgroundColor="#d7e7fb"><text>Explicit</text></card><box background="surface"><text>Surface</text></box><card tone="accent"><text>Accent</text></card></figure>');
  assert.equal(parsed.ok, true, parsed.error?.message);
  const html = renderCompose(parsed.doc);
  assert.match(html, /background-color:#d7e7fb/);
  assert.match(html, /data-bg="surface"/);
  assert.match(html, /data-tone="accent"/);
  assert.equal(declarations(compose, '.g-compose-card[data-bg="surface"]').background, "var(--paper)");
  assert.match(declarations(compose, '.g-compose-card[data-tone="accent"]').background, /color-mix/);
  assert.equal(declarations(compose, ".g-compose-card").background, "transparent");
});

test("frame none remains an independent opt-out of borders, radius and spacing", () => {
  const style = declarations(compose, '.g-compose[data-frame="none"]');
  assert.equal(style.background, "transparent");
  assert.equal(style.border, "0");
  assert.equal(style["border-radius"], "0");
  assert.equal(style.padding, "0");
});

test("fullscreen backgrounds are owned by the host, not the inline scene", () => {
  const host = stylesheet("../app/styles/a2.css");
  assert.equal(declarations(host, ".ux-fs:fullscreen").background, "var(--paper)");
  assert.equal(declarations(host, ".ux-fs.ux-fs-on").background, "var(--paper)");
  const play = stylesheet("../ui/react/ui.css");
  assert.equal(declarations(play, ".garden-ui").background, "transparent");
  assert.equal(declarations(play, ".garden-ui-sandbox").background, "transparent");
});
