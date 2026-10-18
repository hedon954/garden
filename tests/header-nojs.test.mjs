import assert from "node:assert/strict";
import test from "node:test";
import { builtCss, mediaMatches, winning } from "./css-cascade.mjs";

const css = builtCss();
const value = (cls, property, env) => winning(css, cls, property, env)?.value ?? null;

test("the cascade helper reads media queries the way a browser does", () => {
  assert.equal(mediaMatches("(max-width:820px)", { width: 390 }), true);
  assert.equal(mediaMatches("(width<=820px)", { width: 1440 }), false);
  assert.equal(mediaMatches("(scripting:none)", { width: 390, scripting: "none" }), true);
  assert.equal(mediaMatches("(width<=820px) and (scripting:none)", { width: 390, scripting: "enabled" }), false);
  // Later wins at equal specificity, whatever the media block.
  const order = ".a{display:none}@media (width<=820px){.a{display:flex}}";
  assert.equal(winning(order, "a", "display", { width: 390, scripting: "none" }).value, "flex");
  assert.equal(winning(".a{display:block}.b .a{display:none}", "a", "display", { width: 390 }).value, "none");
});

test("with JavaScript off the theme toggles are hidden at every width (built CSS)", () => {
  for (const width of [390, 820, 1440]) {
    for (const cls of [["sh-menu-theme"], ["sh-icon", "sh-theme"]]) {
      const win = winning(css, cls, "display", { width, scripting: "none" });
      assert.equal(win?.value, "none", `.${cls.join(".")} at ${width} with JS off is ${win?.value} from ${win?.media} ${win?.selector}`);
    }
  }
});

test("with JavaScript on the toggles still show where they belong (built CSS)", () => {
  assert.equal(value("sh-menu-theme", "display", { width: 390, scripting: "enabled" }), "flex");
  assert.equal(value(["sh-icon", "sh-theme"], "display", { width: 1440, scripting: "enabled" }), "inline-grid");
  assert.equal(value(["sh-icon", "sh-theme"], "display", { width: 390, scripting: "enabled" }), "none");
});
