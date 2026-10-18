import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { noResultsText } from "../ui/garden/search-preview.mjs";

const header = fs.readFileSync(new URL("../app/components/SiteHeader.tsx", import.meta.url), "utf8");
const shell = fs.readFileSync(new URL("../app/styles/shell.css", import.meta.url), "utf8");
const globals = fs.readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

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

test("a search with no results shows one line naming the query, escaped", () => {
  assert.equal(noResultsText("随想"), "没有找到和「随想」相关的文章");
  assert.equal(noResultsText("  随想  "), "没有找到和「随想」相关的文章");
  const html = renderToStaticMarkup(createElement("p", { className: "empty-state" }, noResultsText('<img src=x onerror="alert(1)">')));
  assert.equal(html, '<p class="empty-state">没有找到和「&lt;img src=x onerror=&quot;alert(1)&quot;&gt;」相关的文章</p>');
  // The count label is not shown for zero results, and the line is a text child.
  assert.match(header, /\{query && engine && resultTotal === 0 \? null : \(/);
  assert.match(header, /\{engine \? noResultsText\(query\) :/);
  assert.doesNotMatch(header, /dangerouslySetInnerHTML=\{\{ __html: [^}]*query/);
  assert.match(globals, /\.empty-state \{[^}]*color: var\(--muted\);[^}]*text-align: center;/);
  assert.match(globals, /\.search-results:has\(> \.empty-state:only-child\) \{\s*align-content: center;/);
});
