import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.join(import.meta.dirname, "..", "ui");
const forbidden = /(?:from\s+|import\s*\(\s*)["'](?:(?:\.\.\/)+(?:app|scripts|bin|content|editors)\/|next(?:\/|["'])|vinext)/u;

function files(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return files(full);
    return /\.(mjs|tsx?|css|md)$/u.test(entry.name) ? [full] : [];
  });
}

test("ui module does not import Garden framework code", () => {
  const offenders = files(root).flatMap((file) => {
    const text = fs.readFileSync(file, "utf8");
    return forbidden.test(text) ? [path.relative(root, file)] : [];
  });
  assert.deepEqual(offenders, []);
});
