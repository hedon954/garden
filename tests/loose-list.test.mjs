import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const PREFIX = ".markdown-body :is(ol, ul):not(.g-steps) > li > ";

test("loose list paragraphs: no margin, and the in-item gap rule has the same specificity so it wins", async () => {
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  const reset = css.indexOf(`${PREFIX}p {\n  margin: 0;`);
  const gap = css.indexOf(`${PREFIX}p + p,`);
  assert.ok(reset >= 0, "li > p reset");
  assert.ok(gap > reset, "gap rule comes after the reset with the same prefix");
  assert.match(css.slice(gap, gap + 400), /margin-top: 12px;/);
  assert.doesNotMatch(css, /^\.markdown-body li > p \+ p/m);
});
