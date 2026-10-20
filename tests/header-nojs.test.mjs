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

const header = (await import("node:fs")).readFileSync(new URL("../app/components/SiteHeader.tsx", import.meta.url), "utf8");
const at390off = { width: 390, scripting: "none" };
const at390on = { width: 390, scripting: "enabled" };
const opened = [":has(", ":target"];

test("with JavaScript off the ☰ opens the menu through :target and ✕ closes it", () => {
  // Both links target fixed anchors outside the sticky header, so neither scrolls the page.
  assert.match(header, /<span className="sh-menu-target" id="sh-menu-on" aria-hidden="true" \/>\s*<span className="sh-menu-target" id="sh-menu-off" aria-hidden="true" \/>\s*<header className="sh-header" id="site-header">/u);
  assert.match(header, /<a className="sh-icon sh-menu-nojs" id="sh-menu-open" href="#sh-menu-on" aria-label=\{t\.openMenu\}>\s*<span aria-hidden="true">☰<\/span>/u);
  assert.match(header, /<a className="sh-icon sh-menu-nojs-close" href="#sh-menu-off" aria-label=\{t\.closeMenu\}>/u);
  assert.doesNotMatch(header, /href="#site-header"|href="#sh-menu"/u);
  assert.equal(value("sh-menu-target", "position", at390off), "fixed");
  assert.match(header, /<header className="sh-header" id="site-header">/u);
  assert.match(header, /<nav className=\{`sh-menu\$\{menuOpen \? " is-open" : ""\}`\} id="sh-menu"/u);
  // Closed: a ☰ in the button's place, the menu hidden.
  assert.equal(value(["sh-icon", "sh-menu-btn"], "display", at390off), "none");
  assert.equal(value(["sh-icon", "sh-menu-nojs"], "display", at390off), "inline-grid");
  assert.equal(value(["sh-icon", "sh-menu-nojs-close"], "display", at390off), "none");
  assert.equal(value("sh-menu", "visibility", at390off), "hidden");
  // Open (#sh-menu-on is the target): menu visible, ✕ in the same place, theme row still hidden.
  assert.equal(value("sh-menu", "visibility", { ...at390off, state: opened }), "visible");
  assert.equal(value("sh-menu", "opacity", { ...at390off, state: opened }), "1");
  assert.equal(value(["sh-icon", "sh-menu-nojs"], "display", { ...at390off, state: opened }), "none");
  assert.equal(value(["sh-icon", "sh-menu-nojs-close"], "display", { ...at390off, state: opened }), "inline-grid");
  assert.equal(value("sh-menu-theme", "display", { ...at390off, state: opened }), "none");
  // Desktop without JavaScript: the full nav is in the bar, no ☰ at all.
  for (const cls of ["sh-menu-btn", "sh-menu-nojs", "sh-menu-nojs-close"]) assert.equal(value(["sh-icon", cls], "display", { width: 1440, scripting: "none" }), "none");
});

test("with JavaScript on the menu works as before and the no-JS links stay out of the way", () => {
  assert.equal(value(["sh-icon", "sh-menu-btn"], "display", at390on), "inline-grid");
  for (const cls of ["sh-menu-nojs", "sh-menu-nojs-close"]) {
    assert.equal(value(["sh-icon", cls], "display", at390on), "none");
    assert.equal(value(["sh-icon", cls], "display", { ...at390on, state: opened }), "none");
  }
  // Only .is-open (state) opens it; a #sh-menu-on hash does nothing.
  assert.equal(value("sh-menu", "visibility", { ...at390on, state: opened }), "hidden");
  assert.equal(value("sh-menu", "visibility", { ...at390on, state: [".is-open"] }), "visible");
  assert.match(header, /<button className="sh-icon sh-menu-btn" type="button" aria-expanded=\{menuOpen\} aria-controls="sh-menu" aria-label=\{menuOpen \? t\.closeMenu : t\.openMenu\} onClick=\{\(\) => setMenuOpen\(\(open\) => !open\)\}>/u);
});

test("with JavaScript off the phone search button is hidden; with it on it shows (built CSS)", () => {
  for (const width of [390, 820]) {
    const win = winning(css, ["sh-icon", "sh-search-m"], "display", { width, scripting: "none" });
    assert.equal(win?.value, "none", `.sh-search-m at ${width} with JS off is ${win?.value} from ${win?.media} ${win?.selector}`);
  }
  assert.equal(value(["sh-icon", "sh-search-m"], "display", at390on), "inline-grid");
  assert.equal(value(["sh-icon", "sh-search-m"], "display", { width: 1440, scripting: "none" }), "none", "phone button never shows on desktop");
});

test("with JavaScript off the desktop search button is hidden too; with it on it shows (built CSS)", () => {
  for (const width of [1440, 1024]) {
    const win = winning(css, ["sh-search"], "display", { width, scripting: "none" });
    assert.equal(win?.value, "none", `.sh-search at ${width} with JS off is ${win?.value} from ${win?.media} ${win?.selector}`);
  }
  assert.equal(value(["sh-search"], "display", { width: 1440, scripting: "enabled" }), "inline-flex");
  assert.equal(value(["sh-search"], "display", at390on), "none", "the phone uses its own button");
});
