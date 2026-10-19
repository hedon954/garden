import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { foreignResolved } from "../scripts/check-lockfile-registry.mjs";

const script = new URL("../scripts/check-lockfile-registry.mjs", import.meta.url).pathname;

test("foreignResolved reports every download that is not on registry.npmjs.org", () => {
  const lock = {
    packages: {
      "": { name: "site" },
      "node_modules/a": { resolved: "https://registry.npmjs.org/a/-/a-1.0.0.tgz" },
      "node_modules/b": { resolved: "https://registry.npmmirror.com/b/-/b-1.0.0.tgz" },
      "node_modules/c": { resolved: "http://registry.npmjs.org/c/-/c-1.0.0.tgz" },
      "node_modules/d": { resolved: "https://registry.npmjs.org.evil.example/d.tgz" },
      "node_modules/e": { resolved: "git+ssh://git@github.com/x/e.git#abc" },
      "node_modules/ws": { resolved: "packages/ws", link: true },
    },
  };
  assert.deepEqual(foreignResolved(lock).map((item) => item.name), ["node_modules/b", "node_modules/c", "node_modules/d", "node_modules/e"]);
});

test("the repository's own lockfile only downloads from registry.npmjs.org", () => {
  const lock = JSON.parse(fs.readFileSync(new URL("../package-lock.json", import.meta.url), "utf8"));
  assert.deepEqual(foreignResolved(lock).slice(0, 5), []);
});

test("the check exits non-zero and names the mirror entries", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "lock-"));
  const file = path.join(dir, "package-lock.json");
  fs.writeFileSync(file, JSON.stringify({ packages: { "node_modules/b": { resolved: "https://registry.npmmirror.com/b/-/b-1.0.0.tgz" } } }));
  assert.throws(() => execFileSync(process.execPath, [script, file], { stdio: "pipe" }), (error) => error.status === 1 && /registry\.npmmirror\.com/u.test(String(error.stderr)));
  fs.writeFileSync(file, JSON.stringify({ packages: { "node_modules/a": { resolved: "https://registry.npmjs.org/a/-/a-1.0.0.tgz" } } }));
  assert.match(execFileSync(process.execPath, [script, file], { encoding: "utf8" }), /全部 resolved/u);
});

test("CI and the publish workflow run the lockfile check before installing", () => {
  for (const name of ["verify.yml", "publish.yml"]) {
    const workflow = fs.readFileSync(new URL(`../.github/workflows/${name}`, import.meta.url), "utf8");
    assert.ok(workflow.indexOf("node scripts/check-lockfile-registry.mjs") > -1, name);
    assert.ok(workflow.indexOf("node scripts/check-lockfile-registry.mjs") < workflow.indexOf("npm ci"), name);
  }
});
