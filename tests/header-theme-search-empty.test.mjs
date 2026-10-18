import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const header = fs.readFileSync(new URL("../app/components/SiteHeader.tsx", import.meta.url), "utf8");
const shell = fs.readFileSync(new URL("../app/styles/shell.css", import.meta.url), "utf8");

test("the mobile menu ends with a dark mode switch that shares the desktop toggle", () => {
  assert.match(header, /<button className="sh-menu-theme" type="button" role="switch" aria-checked=\{dark\} onClick=\{toggleTheme\}>\s*<span>深色模式<\/span>/);
  assert.match(header, /className="sh-icon sh-theme" type="button" onClick=\{toggleTheme\}/);
  assert.equal(header.match(/const toggleTheme = /g)?.length, 1, "one implementation");
  // Without a stored choice the theme follows the system, also when it changes.
  assert.match(header, /system\.addEventListener\("change", apply\)/);
  assert.match(header, /stored === "dark" \|\| \(!stored && system\.matches\)/);
  // The row comes after the nav links, inside the menu.
  assert.ok(header.indexOf('className="sh-menu-theme"') > header.indexOf("{nav.map((item) => ("));
  assert.match(shell, /\.sh-menu-theme\{[^}]*min-height:44px;[^}]*border-top:1px solid var\(--rule\)/);
  assert.match(shell, /@media \(scripting:none\)\{\.sh-theme,\.sh-menu-theme\{display:none\}\}/);
  assert.doesNotMatch(shell, /\.theme-row/);
});
