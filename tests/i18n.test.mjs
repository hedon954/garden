import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync(new URL("../app/lib/i18n.ts", import.meta.url), "utf8");
const keysOf = (name) => {
  const body = source.match(new RegExp(`const ${name}[^=]*= \\{([\\s\\S]*?)\\n\\};`, "u"))[1];
  return [...body.matchAll(/^  (\w+):/gmu)].map((m) => m[1]).sort();
};

test("English chrome strings cover every Chinese key", () => {
  assert.deepEqual(keysOf("en"), keysOf("zh"));
});

test("the site language comes from site.config locale at build time", () => {
  assert.match(source, /langOf\(siteConfig\.locale\)/u);
});

test("the handbook meta has the same chrome keys in both languages", () => {
  const meta = fs.readFileSync(new URL("../app/lib/garden-docs-meta.ts", import.meta.url), "utf8");
  const block = (lang) => [...meta.match(new RegExp(`\\n  ${lang}: \\{([\\s\\S]*?)\\n  \\}`, "u"))[1].matchAll(/^    (\w+):/gmu)].map((m) => m[1]).sort();
  assert.deepEqual(block("en"), block("zh"));
});

test("English handbook pages are served under /garden/en/ and listed in the sitemap", () => {
  const build = fs.readFileSync(new URL("../scripts/build-content.mjs", import.meta.url), "utf8");
  assert.match(build, /doc\.path\.startsWith\("en\/"\)/u);
  assert.match(build, /`\/garden\/en\/\$\{entry\.path\}\/`/u);
});
