import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  COMPONENT_BADGE,
  handbookNavLabel,
  referenceBadgeSuffix,
} from "../app/lib/garden-docs-meta.ts";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

test("referenceBadgeSuffix keeps code pill and appends separator+remainder", () => {
  assert.equal(referenceBadgeSuffix("compose", "compose"), null);
  assert.equal(referenceBadgeSuffix("compose", "compose 图标"), " 图标");
  assert.equal(referenceBadgeSuffix("compose", "compose icons"), " icons");
  assert.equal(referenceBadgeSuffix("compose", "compose · 图标"), " · 图标");
  // No bare prefix match without a separator (avoid "composer").
  assert.equal(referenceBadgeSuffix("compose", "composer"), null);
  assert.equal(referenceBadgeSuffix("card", "组件参考 · card"), null);
  assert.equal(referenceBadgeSuffix("", "compose 图标"), null);
});

test("handbookNavLabel prefers navTitle for ZH and EN", () => {
  assert.equal(
    handbookNavLabel({ path: "reference/compose-icons", title: "组件参考 · compose 图标", navTitle: "compose 图标" }, "zh"),
    "compose 图标",
  );
  assert.equal(
    handbookNavLabel({ path: "reference/compose-icons", title: "Component reference · compose icons", navTitle: "compose icons" }, "en"),
    "compose icons",
  );
  assert.equal(
    handbookNavLabel({ path: "reference/compose", title: "组件参考 · compose", navTitle: "compose" }, "zh"),
    "compose",
  );
});

test("referenceBadgeSuffix and handbookNavLabel helpers work across ZH and EN", () => {
  assert.equal(referenceBadgeSuffix("compose", "compose 图标"), " 图标");
  assert.equal(referenceBadgeSuffix("compose", "compose icons"), " icons");
  assert.equal(referenceBadgeSuffix("compose", "compose"), null);
  assert.equal(handbookNavLabel({ path: "guide/quick-start", title: "快速上手丨七步", navTitle: "快速上手" }, "zh"), "快速上手");
  assert.equal(handbookNavLabel({ path: "guide/quick-start", title: "Quick Start", navTitle: "Quick Start" }, "en"), "Quick Start");
  assert.equal(typeof COMPONENT_BADGE, "object");
});

test("runtime mounts play fences with the ui- DOM id convention", () => {
  const runtime = fs.readFileSync(path.join(root, "ui/react/index.tsx"), "utf8");
  assert.match(runtime, /id=\{`ui-\$\{payload\.id\}`\}/);
});
