import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const engine = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));

function initSite() {
  const parent = mkdtempSync(path.join(tmpdir(), "garden-init-"));
  const site = path.join(parent, "my-blog");
  execFileSync(process.execPath, [path.join(root, "bin/garden.mjs"), "init", site], { cwd: parent, stdio: "pipe" });
  return { parent, site };
}

test("the site template's package.json is valid JSON and pins no engine version of its own", () => {
  const template = JSON.parse(readFileSync(path.join(root, "templates/site/package.json"), "utf8"));
  assert.equal(template.dependencies?.[engine.name], undefined);
});

test("garden init writes a site whose package.json parses and pins the current engine", (t) => {
  const { parent, site } = initSite();
  t.after(() => rmSync(parent, { recursive: true, force: true }));
  const pkg = JSON.parse(readFileSync(path.join(site, "package.json"), "utf8"));
  assert.equal(pkg.dependencies[engine.name], `^${engine.version}`);
  assert.deepEqual(Object.keys(pkg.dependencies), [engine.name]);
  for (const file of ["site.config.yaml", "Makefile", "content/columns.yaml"]) {
    assert.ok(existsSync(path.join(site, file)), `${file} is missing`);
  }
  const makefile = readFileSync(path.join(site, "Makefile"), "utf8");
  for (const target of ["new", "dev", "update"]) assert.match(makefile, new RegExp(`^${target}:`, "m"));
});

// Installs the packed engine into a fresh site and builds it. Slow and needs the
// npm registry, so it runs only when GARDEN_INIT_BUILD=1 (CI sets it).
test("a site from garden init installs the packed engine and builds", { skip: process.env.GARDEN_INIT_BUILD !== "1", timeout: 15 * 60_000 }, (t) => {
  const { parent, site } = initSite();
  t.after(() => rmSync(parent, { recursive: true, force: true }));
  const packed = execFileSync("npm", ["pack", "--silent", "--pack-destination", parent], { cwd: root, encoding: "utf8" }).trim().split("\n").at(-1);
  const tarball = path.join(parent, packed);
  assert.ok(existsSync(tarball), `npm pack did not write ${tarball}`);
  execFileSync("npm", ["install", "--no-audit", "--no-fund", tarball], { cwd: site, stdio: "inherit" });
  const env = {
    ...process.env,
    STATIC_EXPORT: "1",
    SITE_URL: "https://example.github.io",
    NEXT_PUBLIC_SITE_URL: "https://example.github.io",
    GISCUS_DISABLED: "1",
  };
  execFileSync("npx", ["--no-install", "garden", "new"], { cwd: site, stdio: "inherit", env: { ...env, GARDEN_NEW_TITLE: "你好，世界", GARDEN_NEW_SLUG: "hello" } });
  execFileSync("npx", ["--no-install", "garden", "build"], { cwd: site, stdio: "inherit", env });
  execFileSync("npx", ["--no-install", "garden", "pages:validate"], { cwd: site, stdio: "inherit", env });
  assert.ok(existsSync(path.join(site, "dist/client/index.html")));
  assert.ok(readdirSync(path.join(site, "content/posts")).includes("hello.md"));
});
