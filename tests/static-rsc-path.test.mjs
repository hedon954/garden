import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import staticRscPath, { exportNavigation, exportRscAddress } from "../build/static-rsc-path-plugin.mjs";

const vinextDist = path.dirname(fileURLToPath(import.meta.resolve("vinext")));
const busting = path.join(vinextDist, "server", "app-rsc-cache-busting.js");
const browserEntry = path.join(vinextDist, "server", "app-browser-entry.js");

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

test("client navigation accepts .rsc served as application/octet-stream and never lands on /index", () => {
  const original = fs.readFileSync(browserEntry, "utf8");
  const patched = exportNavigation(original);
  // vinext 0.0.50 only takes text/x-component; GitHub Pages sends .rsc as octet-stream.
  const check = patched.match(/const isRscResponse = (.+);/u)[1];
  const accepts = (type) => new Function("navResponse", `return ${check};`)({ headers: new Headers(type ? { "content-type": type } : {}) });
  assert.equal(accepts("text/x-component; charset=utf-8"), true);
  assert.equal(accepts("application/octet-stream"), true);
  assert.equal(accepts("text/html; charset=utf-8"), false, "a 404 page is still not a payload");
  assert.equal(accepts(null), false);
  // The full-load fallback for the home payload goes to "/", not "/index".
  assert.match(patched, /let pathname = stripRscSuffix\(parsed\.pathname\); if \(pathname === "\/index"\) pathname = "\/";/u);
  assert.throws(() => exportNavigation("const isRscResponse = true;"), /could not find/u);
  // Client bundle of a static export only.
  const run = (plugin, name) => plugin.transform.call({ environment: { name } }, original, browserEntry);
  assert.equal(run(staticRscPath({ enabled: true }), "ssr"), null);
  assert.equal(run(staticRscPath({ enabled: false }), "client"), null);
  assert.match(run(staticRscPath({ enabled: true }), "client").code, /application\\\/octet-stream/u);
});

test("only a 2xx octet-stream or text/x-component response with a body counts as a payload", () => {
  const patched = exportNavigation(fs.readFileSync(browserEntry, "utf8"));
  const check = patched.match(/const isRscResponse = (.+);/u)[1];
  const failure = patched.match(/if \((!navResponse\.ok \|\| !isRscResponse \|\| !navResponse\.body)\) \{/u)?.[1];
  assert.ok(failure, "vinext's failure check is still there");
  const fails = (status, type, body = "x") => {
    const navResponse = new Response(status === 204 || status === 304 ? null : body, { status, headers: type ? { "content-type": type } : {} });
    const isRscResponse = new Function("navResponse", `return ${check};`)(navResponse);
    return new Function("navResponse", "isRscResponse", `return ${failure};`)(navResponse, isRscResponse);
  };
  // Success: 2xx with either payload type.
  assert.equal(fails(200, "application/octet-stream"), false);
  assert.equal(fails(200, "text/x-component; charset=utf-8"), false);
  // Any non-2xx fails, whatever it claims to be.
  for (const status of [301, 304, 400, 403, 404, 410, 500, 503]) {
    assert.equal(fails(status, "application/octet-stream"), true, `${status} octet-stream`);
    assert.equal(fails(status, "text/x-component"), true, `${status} text/x-component`);
    assert.equal(fails(status, "text/html; charset=utf-8", "<!doctype html>"), true, `${status} html`);
  }
  // An HTML page is not a payload even with 200, and neither is a response without a type or body.
  assert.equal(fails(200, "text/html; charset=utf-8", "<!doctype html><title>404</title>"), true);
  assert.equal(fails(200, null), true);
  assert.equal(fails(204, "application/octet-stream"), true);
  // A vinext without the ok check stops the build.
  const source = fs.readFileSync(browserEntry, "utf8");
  assert.throws(() => exportNavigation(source.replace("!navResponse.ok || ", "")), /could not find/u);
});
