import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import { mkdtempSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { ensureVinextRuntime } from "../scripts/vinext-runtime.mjs";

const engine = fileURLToPath(new URL("../", import.meta.url));

function tempSite() {
  const root = mkdtempSync(path.join(tmpdir(), "garden-runtime-"));
  fs.mkdirSync(path.join(root, "content", "posts"), { recursive: true });
  fs.writeFileSync(path.join(root, "site.config.yaml"), "name: Runtime\nlocale: zh_CN\n");
  return root;
}

test("runtime overlay links ui and scripts for a sibling file: engine", () => {
  const site = tempSite();
  try {
    const runtime = ensureVinextRuntime({ siteRoot: site, gardenPackageRoot: engine, lang: "zh" });
    assert.equal(fs.readlinkSync(path.join(runtime, "ui")), path.join(engine, "ui"));
    assert.equal(fs.readlinkSync(path.join(runtime, "app")), path.join(engine, "app"));
    assert.equal(fs.readlinkSync(path.join(runtime, "scripts")), path.join(engine, "scripts"));
    assert.ok(fs.existsSync(path.join(runtime, "ui", "garden", "feature-title-fit.mjs")));
  } finally {
    rmSync(site, { recursive: true, force: true });
  }
});

test("runtime overlay links ui when the engine lives in node_modules/hd-garden", () => {
  const site = tempSite();
  try {
    const installed = path.join(site, "node_modules", "hd-garden");
    fs.mkdirSync(path.dirname(installed), { recursive: true });
    fs.symlinkSync(engine, installed);
    const runtime = ensureVinextRuntime({ siteRoot: site, gardenPackageRoot: installed, lang: "zh" });
    assert.equal(fs.readlinkSync(path.join(runtime, "ui")), path.join(installed, "ui"));
    assert.ok(fs.existsSync(path.join(runtime, "ui", "garden", "feature-title-fit.mjs")));
  } finally {
    rmSync(site, { recursive: true, force: true });
  }
});

test("Vite cache next to overlay node_modules lets Node CJS resolve react-dom", () => {
  const site = tempSite();
  try {
    const runtime = ensureVinextRuntime({ siteRoot: site, gardenPackageRoot: engine, lang: "zh" });
    const require = createRequire(path.join(runtime, ".vite", "deps_ssr", "chunk.js"));
    assert.match(require.resolve("react-dom"), /react-dom/u);
  } finally {
    rmSync(site, { recursive: true, force: true });
  }
});

test("npm pack includes the ui files that ?raw imports need", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "garden-pack-"));
  try {
    const packed = execFileSync("npm", ["pack", "--ignore-scripts", "--json", "--pack-destination", dir], {
      cwd: engine,
      encoding: "utf8",
    });
    const [{ filename }] = JSON.parse(packed);
    const listing = execFileSync("tar", ["-tzf", path.join(dir, filename)], { encoding: "utf8" });
    assert.match(listing, /^package\/ui\/garden\/feature-title-fit\.mjs$/mu);
    assert.match(listing, /^package\/ui\/garden\/article-title-fit\.mjs$/mu);
    assert.match(listing, /^package\/app\/lib\/content-body\.ts$/mu);
    assert.match(listing, /^package\/scripts\/vinext-runtime\.mjs$/mu);
    assert.match(listing, /^package\/docs\/handbook\//mu);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
