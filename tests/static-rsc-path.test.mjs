import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import staticRscPath, { exportRscAddress } from "../build/static-rsc-path-plugin.mjs";

const vinextDist = path.dirname(fileURLToPath(import.meta.resolve("vinext")));
const busting = path.join(vinextDist, "server", "app-rsc-cache-busting.js");

// Just vinext's address builder, taken out of its module.
function addressBuilder(code) {
  const source = code.match(/function toRscRequestPath\(href\) \{[\s\S]*?\n\}/u)?.[0];
  assert.ok(source, "toRscRequestPath in vinext");
  return new Function(`${source}; return toRscRequestPath;`)();
}

test("the static export asks for the home RSC payload at /index.rsc", () => {
  const original = fs.readFileSync(busting, "utf8");
  const before = addressBuilder(original);
  assert.equal(before("/"), "/.rsc", "vinext's own address for the home page");
  const after = addressBuilder(exportRscAddress(original));
  assert.equal(after("/"), "/index.rsc");
  assert.equal(after("/?_rsc=1"), "/index.rsc?_rsc=1");
  assert.equal(after("/#top"), "/index.rsc");
  // Every other page already matches the exported file.
  assert.equal(after("/blog/"), "/blog.rsc");
  assert.equal(after("/blog/go/go-lock/"), "/blog/go/go-lock.rsc");
  assert.equal(after("/columns/?a=1"), "/columns.rsc?a=1");
});

test("the rewrite only touches the browser bundle of a static export", () => {
  const code = fs.readFileSync(busting, "utf8");
  const run = (plugin, name, id = busting) => plugin.transform.call({ environment: { name } }, code, id);
  assert.equal(run(staticRscPath({ enabled: false }), "client"), null);
  assert.equal(run(staticRscPath({ enabled: true }), "rsc"), null);
  assert.equal(run(staticRscPath({ enabled: true }), "ssr"), null);
  assert.equal(run(staticRscPath({ enabled: true }), "client", "/x/other.js"), null);
  assert.match(run(staticRscPath({ enabled: true }), "client", `${busting}?v=1`).code, /pathname === "\/" \? "\/index"/);
  // Prefetch is not switched off anywhere.
  assert.doesNotMatch(fs.readFileSync(new URL("../build/static-rsc-path-plugin.mjs", import.meta.url), "utf8"), /prefetch\s*[:=]\s*false/);
});

test("a vinext that builds the address differently stops the build", () => {
  assert.throws(() => exportRscAddress("function toRscRequestPath(href) { return href + '.rsc'; }"), /could not find vinext's RSC address builder/);
});

// Only a static export (STATIC_EXPORT=1) writes index.rsc; the test build is not one.
const staticExport = fs.existsSync(new URL("../dist/client/index.rsc", import.meta.url));
test("the exported client bundle asks for /index.rsc for the home page", { skip: !staticExport && "dist is not a static export" }, () => {
  const assets = new URL("../dist/client/assets/", import.meta.url);
  const scripts = fs.readdirSync(assets).filter((name) => name.endsWith(".js")).map((name) => fs.readFileSync(new URL(name, assets), "utf8")).join("\n");
  assert.match(scripts, /[`"]\/index[`"]/);
});
