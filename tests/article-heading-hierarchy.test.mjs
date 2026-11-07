import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const a2 = fs.readFileSync(new URL("../app/styles/a2.css", import.meta.url), "utf8");
const tokens = fs.readFileSync(new URL("../app/styles/tokens.css", import.meta.url), "utf8");

test("article H2 > H3 > H4 uses sans and clear size steps", () => {
  assert.match(tokens, /--fs-h2:\s*26px;/u);
  assert.match(tokens, /--fs-lead:\s*20px;/u);
  assert.match(tokens, /--fs-body:\s*17px;/u);
  assert.match(a2, /\.markdown-body h2 \{\s*font: 700 var\(--fs-h2\) \/ 1\.4 var\(--sans\);/u);
  assert.match(a2, /\.markdown-body h3 \{\s*font: 600 var\(--fs-lead\) \/ 1\.5 var\(--sans\);/u);
  assert.match(a2, /\.markdown-body h4 \{\s*font: 600 var\(--fs-body\) \/ 1\.55 var\(--sans\);/u);
  // Explicitly not serif for article H4 (brand wordmark may stay serif elsewhere).
  const h4 = a2.slice(a2.indexOf(".markdown-body h4 {"), a2.indexOf(".markdown-body h4 {") + 220);
  assert.match(h4, /var\(--sans\)/u);
  assert.doesNotMatch(h4, /var\(--serif\)/u);
  assert.match(h4, /letter-spacing: 0;/u);
});
