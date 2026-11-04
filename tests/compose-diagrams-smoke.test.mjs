import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { parseCompose, renderCompose } from "../ui/compose/index.mjs";
import { ICON_NAMES } from "../ui/compose/icons.mjs";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

test("named icon catalog covers the acceptance set", () => {
  for (const name of [
    "check", "check-circle", "x", "x-circle", "lock", "lock-open",
    "arrow-down", "arrow-right", "arrow-left", "arrow-up", "layers",
    "shield", "user", "key", "link", "alert", "info", "sparkles",
  ]) {
    assert.ok(ICON_NAMES.includes(name), name);
  }
});

test("compare fences parse and emit token/icon markup", () => {
  const md = fs.readFileSync(path.join(root, "content/posts/compose-compare.md"), "utf8");
  const bodies = [...md.matchAll(/```garden compose\n([\s\S]*?)```/gu)].map((m) => m[1]);
  assert.equal(bodies.length, 9);
  const html = bodies.map((body, index) => {
    const result = parseCompose(body);
    assert.equal(result.ok, true, `fence ${index + 1}: ${result.error?.message}`);
    return renderCompose(result.doc, { scope: `s${index}` });
  }).join("\n");
  assert.match(html, /data-name="shield"/);
  assert.match(html, /data-name="lock-open"/);
  assert.match(html, /data-bg="surface-tip"|data-bg="surface-secondary"|data-pad=/);
  assert.match(html, /g-compose-grid/);
  assert.match(html, /g-compose-caption-inline/);
});
