import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { syncEditorVersion } from "../scripts/sync-editor-version.mjs";

function fixture(run) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "garden-version-"));
  fs.mkdirSync(path.join(root, "editors/vscode"), { recursive: true });
  const write = (name, value) => fs.writeFileSync(path.join(root, name), JSON.stringify(value));
  write("package.json", { version: "1.2.3" });
  write("editors/vscode/package.json", { name: "garden-ui", version: "0.1.1" });
  write("editors/vscode/package-lock.json", { version: "0.1.1", packages: { "": { version: "0.1.1" }, "node_modules/example": { version: "9.9.9" } } });
  try { run(root, write); } finally { fs.rmSync(root, { recursive: true, force: true }); }
}

test("release check fails rather than publishing an out-of-sync extension", () => fixture((root) => {
  assert.throws(() => syncEditorVersion({ root, check: true }), /must match Garden 1.2.3/u);
}));

test("sync follows Garden version, including both lockfile versions, without changing dependencies", () => fixture((root) => {
  assert.equal(syncEditorVersion({ root }), "1.2.3");
  assert.equal(syncEditorVersion({ root, check: true }), "1.2.3");
  const lock = JSON.parse(fs.readFileSync(path.join(root, "editors/vscode/package-lock.json")));
  assert.equal(lock.version, "1.2.3");
  assert.equal(lock.packages[""].version, "1.2.3");
  assert.equal(lock.packages["node_modules/example"].version, "9.9.9");
  const before = fs.readFileSync(path.join(root, "editors/vscode/package.json"), "utf8");
  syncEditorVersion({ root });
  assert.equal(fs.readFileSync(path.join(root, "editors/vscode/package.json"), "utf8"), before);
}));

test("stable VSIX versions are required", () => fixture((root, write) => {
  write("package.json", { version: "1.2.3-beta.1" });
  assert.throws(() => syncEditorVersion({ root }), /stable major.minor.patch/u);
}));
