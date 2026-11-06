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

test("compose and compose-icons share badge but disambiguate via navTitle suffix", () => {
  assert.equal(COMPONENT_BADGE["reference/compose"], "compose");
  assert.equal(COMPONENT_BADGE["reference/compose-icons"], "compose");
  const zhIcons = handbookNavLabel(
    { path: "reference/compose-icons", title: "x", navTitle: "compose 图标" },
    "zh",
  );
  const enIcons = handbookNavLabel(
    { path: "reference/compose-icons", title: "x", navTitle: "compose icons" },
    "en",
  );
  assert.equal(referenceBadgeSuffix(COMPONENT_BADGE["reference/compose-icons"], zhIcons), " 图标");
  assert.equal(referenceBadgeSuffix(COMPONENT_BADGE["reference/compose-icons"], enIcons), " icons");
  assert.equal(
    referenceBadgeSuffix(
      COMPONENT_BADGE["reference/compose"],
      handbookNavLabel({ path: "reference/compose", title: "x", navTitle: "compose" }, "zh"),
    ),
    null,
  );
});

test("no other COMPONENT_BADGE collision leaves two pages with identical bare pills", () => {
  const byBadge = new Map();
  for (const [docPath, badge] of Object.entries(COMPONENT_BADGE)) {
    if (!docPath.startsWith("reference/")) continue;
    const list = byBadge.get(badge) ?? [];
    list.push(docPath);
    byBadge.set(badge, list);
  }
  for (const [badge, paths] of byBadge) {
    if (paths.length < 2) continue;
    // Shared badge is allowed only when every colliding navTitle either equals
    // the badge or starts with badge + separator (so the sidebar can suffix).
    for (const docPath of paths) {
      const file = path.join(root, "docs/handbook", `${docPath}.md`);
      const text = fs.readFileSync(file, "utf8");
      const navTitle = text.match(/^navTitle:\s*(.+)$/mu)?.[1]?.trim();
      assert.ok(navTitle, `${docPath} needs navTitle`);
      assert.ok(
        navTitle === badge || referenceBadgeSuffix(badge, navTitle),
        `${docPath} navTitle ${JSON.stringify(navTitle)} must equal badge or add a separator suffix`,
      );
    }
  }
});

test("reference chart-example links use the ui- DOM id convention", () => {
  for (const rel of ["docs/handbook/reference/compose.md", "docs/handbook/en/reference/compose.md"]) {
    const text = fs.readFileSync(path.join(root, rel), "utf8");
    assert.match(text, /#ui-compose-chart-active-hours/);
    assert.doesNotMatch(text, /components\/compose#compose-chart-active-hours/);
  }
  // Runtime mounts play fences as id={`ui-${payload.id}`}.
  const runtime = fs.readFileSync(path.join(root, "ui/react/index.tsx"), "utf8");
  assert.match(runtime, /id=\{`ui-\$\{payload\.id\}`\}/);
});
