/**
 * Generate scannable compose handbook catalogs from CATALOG_TAGS / ICON_NAMES.
 * Usage: node scripts/gen-compose-handbook.mjs
 * Writes:
 *   docs/handbook/reference/compose-icons.md (+ en/)
 *   docs/handbook/reference/compose-tags.generated.md (+ en/)  — included into compose.md by authors via review;
 *   actually overwrites the catalog body markers in compose.md if present.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CATALOG_TAGS } from "../ui/compose/parse.mjs";
import { ICON_COUNT, ICON_NAMES, ICONS } from "../ui/compose/icons.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** @type {{ id: string, zh: string, en: string, tags: { name: string, zh: string, en: string }[] }[]} */
const GROUPS = [
  {
    id: "layout",
    zh: "布局",
    en: "Layout",
    tags: [
      { name: "box", zh: "通用容器；可设 padding / gap / background / radius", en: "Generic container; padding / gap / background / radius" },
      { name: "card", zh: "box 的卡面别名", en: "Alias of box as a card face" },
      { name: "stack", zh: "竖排", en: "Vertical stack" },
      { name: "row", zh: "横排", en: "Horizontal row" },
      { name: "columns", zh: "多列横排（默认可换行）", en: "Multi-column row (wrap by default)" },
      { name: "grid", zh: "等分网格；cols 1–6", en: "Equal grid; cols 1–6" },
      { name: "grid-item", zh: "网格格；span 跨列", en: "Grid cell; span columns" },
      { name: "group", zh: "语义分组容器", en: "Semantic group" },
      { name: "field", zh: "表单项分组", en: "Form-field group" },
      { name: "header", zh: "页眉区", en: "Header region" },
      { name: "footer", zh: "页脚区", en: "Footer region" },
      { name: "figure", zh: "图示区", en: "Figure region" },
      { name: "prose", zh: "长文段落区", en: "Prose region" },
      { name: "divider", zh: "分隔线（自闭合）", en: "Divider (self-closing)" },
      { name: "separator", zh: "divider 别名", en: "Alias of divider" },
      { name: "spacer", zh: "空白间距", en: "Empty spacer" },
      { name: "band", zh: "通栏强调条（box frame=band）", en: "Full-width band (box frame=band)" },
      { name: "pill", zh: "胶囊（box frame=pill）", en: "Pill (box frame=pill)" },
    ],
  },
  {
    id: "text",
    zh: "文字",
    en: "Text",
    tags: [
      { name: "title", zh: "短标题", en: "Short title" },
      { name: "text", zh: "正文", en: "Body text" },
      { name: "caption", zh: "次要说明（默认 muted）", en: "Caption (muted by default)" },
      { name: "label", zh: "控件标签", en: "Control label" },
      { name: "badge", zh: "胶囊徽标", en: "Pill badge" },
      { name: "kpi", zh: "指标数字（自闭合）", en: "Metric (self-closing)" },
      { name: "stat", zh: "kpi 别名", en: "Alias of kpi" },
      { name: "icon", zh: "具名描边图标（自闭合）", en: "Named stroke icon (self-closing)" },
      { name: "callout", zh: "提示条", en: "Callout strip" },
      { name: "kbd", zh: "键盘键帽", en: "Keyboard keycap" },
      { name: "link", zh: "行内链接", en: "Inline link" },
      { name: "intent", zh: "作者原话（不绘制）", en: "Author intent (not drawn)" },
    ],
  },
  {
    id: "controls",
    zh: "控件",
    en: "Controls",
    tags: [
      { name: "button", zh: "按钮快照", en: "Button snapshot" },
      { name: "slider", zh: "滑杆快照 / play 可调", en: "Slider snapshot / play" },
      { name: "progress", zh: "进度条", en: "Progress bar" },
      { name: "meter", zh: "计量条", en: "Meter bar" },
      { name: "checkbox", zh: "复选框快照", en: "Checkbox snapshot" },
      { name: "radio", zh: "单选快照", en: "Radio snapshot" },
      { name: "toggle", zh: "开关快照", en: "Toggle snapshot" },
      { name: "switch", zh: "toggle 别名", en: "Alias of toggle" },
      { name: "input", zh: "单行输入快照", en: "Text input snapshot" },
      { name: "textarea", zh: "多行输入快照", en: "Textarea snapshot" },
      { name: "select", zh: "下拉快照", en: "Select snapshot" },
      { name: "tabs", zh: "选项卡容器", en: "Tabs container" },
      { name: "tab", zh: "单个选项卡", en: "One tab" },
      { name: "list", zh: "列表", en: "List" },
      { name: "list-item", zh: "列表项", en: "List item" },
      { name: "table", zh: "表格", en: "Table" },
      { name: "thead", zh: "表头", en: "Table head" },
      { name: "tbody", zh: "表体", en: "Table body" },
      { name: "tr", zh: "表行", en: "Table row" },
      { name: "th", zh: "表头格", en: "Header cell" },
      { name: "td", zh: "表数据格", en: "Data cell" },
      { name: "image", zh: "图片", en: "Image" },
      { name: "avatar", zh: "头像占位", en: "Avatar placeholder" },
      { name: "empty", zh: "空状态", en: "Empty state" },
      { name: "option", zh: "分段选项快照", en: "Segment option snapshot" },
    ],
  },
  {
    id: "connect",
    zh: "连接糖",
    en: "Connectors",
    tags: [
      { name: "arrow", zh: "箭头", en: "Arrow" },
      { name: "fan", zh: "向下分叉箭头", en: "Downward fan arrows" },
      { name: "join", zh: "V 形汇合", en: "V-shaped join" },
      { name: "lanes", zh: "泳道图", en: "Swimlanes" },
      { name: "actor", zh: "泳道角色", en: "Lane actor" },
      { name: "message", zh: "泳道消息", en: "Lane message" },
      { name: "steps", zh: "分步容器", en: "Steps container" },
      { name: "step", zh: "一步", en: "One step" },
      { name: "note", zh: "步骤展开说明", en: "Step note" },
      { name: "compare", zh: "对照卡组", en: "Compare cards" },
      { name: "item", zh: "对照项", en: "Compare item" },
      { name: "code", zh: "代码快照", en: "Code snapshot" },
      { name: "pre", zh: "预格式文本", en: "Preformatted text" },
    ],
  },
];

const listed = GROUPS.flatMap((g) => g.tags.map((t) => t.name)).sort();
const missing = CATALOG_TAGS.filter((t) => !listed.includes(t));
const extra = listed.filter((t) => !CATALOG_TAGS.includes(t));
if (missing.length || extra.length) {
  console.error("TAG meta mismatch", { missing, extra, catalog: CATALOG_TAGS.length, listed: listed.length });
  process.exit(1);
}

function tableRows(group, lang) {
  return group.tags
    .map((t) => `| \`${t.name}\` | ${lang === "en" ? t.en : t.zh} |`)
    .join("\n");
}

function groupSample(id, lang) {
  if (lang === "en") {
    const samples = {
      layout: `<row gap={2}><box padding={2} radius="md" border="subtle"><title size="sm">A</title></box><box padding={2} radius="md" background="surface-accent"><title size="sm">B</title></box></row>`,
      text: `<stack gap={1}><title size="sm">Title</title><text size="sm">Body</text><caption size="sm">Caption</caption><badge>badge</badge></stack>`,
      controls: `<stack gap={2}><row gap={2}><avatar label="A" size="sm"/><badge>ok</badge><kbd>⌘K</kbd></row><list><list-item>One</list-item><list-item>Two</list-item></list><progress value={40} max={100} label="40%"/></stack>`,
      connect: `<stack align="center" gap={1}><pill>Start</pill><arrow dir="down"/><band tone="accent" align="center"><title size="sm">Hub</title></band></stack>`,
    };
    return samples[id];
  }
  const samples = {
    layout: `<row gap={2}><box padding={2} radius="md" border="subtle"><title size="sm">甲</title></box><box padding={2} radius="md" background="surface-accent"><title size="sm">乙</title></box></row>`,
    text: `<stack gap={1}><title size="sm">标题</title><text size="sm">正文</text><caption size="sm">说明</caption><badge>徽标</badge></stack>`,
    controls: `<stack gap={2}><row gap={2}><avatar label="甲" size="sm"/><badge>好</badge><kbd>⌘K</kbd></row><list><list-item>一项</list-item><list-item>二项</list-item></list><progress value={40} max={100} label="40%"/></stack>`,
    connect: `<stack align="center" gap={1}><pill>起点</pill><arrow dir="down"/><band tone="accent" align="center"><title size="sm">枢纽</title></band></stack>`,
  };
  return samples[id];
}

function writeComposeReference(lang) {
  const isEn = lang === "en";
  const file = isEn
    ? path.join(root, "docs/handbook/en/reference/compose.md")
    : path.join(root, "docs/handbook/reference/compose.md");

  const groupsMd = GROUPS.map((g) => {
    const title = isEn ? g.en : g.zh;
    const sample = groupSample(g.id, lang);
    return `### ${title}

\`\`\`garden compose
${sample}
\`\`\`

| ${isEn ? "Tag" : "标签"} | ${isEn ? "Purpose" : "用途"} |
| :--- | :--- |
${tableRows(g, lang)}
`;
  }).join("\n");

  const body = isEn
    ? `---
title: Component reference · compose
navTitle: compose
description: Scannable catalog of every compose tag, shared tokens, and links to the icon grid.
section: reference
order: 6
badge: compose
---

[← Component reference](/garden/en/reference) · [Usage](/garden/en/components/compose) · [Icons](/garden/en/reference/compose-icons)

Fence: \` \`\`\`garden compose \`. Author intent stays in \`<intent>\` (not drawn). Unknown tags fail with \`compose-invalid\`.

**${CATALOG_TAGS.length} tags** in \`CATALOG_TAGS\`. Icons: **${ICON_COUNT}** names — see [compose icons](/garden/en/reference/compose-icons).

## Shared tokens

Write once; most layout tags accept them. Colors come only from Garden theme variables (Claude paper).

| Token | Values |
| :--- | :--- |
| \`padding\` / \`gap\` | \`0\`–\`4\` (4px × n) |
| \`background\` | \`surface\` \`surface-secondary\` \`surface-accent\` \`surface-tip\` \`surface-muted\` \`transparent\` |
| \`radius\` | \`none\` \`sm\` \`md\` \`lg\` \`xl\` \`full\` |
| \`border\` | \`subtle\` \`strong\`/\`true\` \`none\`/\`false\` |
| \`size\` | \`sm\` \`md\` \`lg\` \`xl\` |
| \`tone\` | \`plain\` \`accent\` \`tip\` \`muted\` (and callout \`note\`/\`warn\`) |
| \`align\` | \`start\` \`center\` \`end\` \`stretch\` |
| \`justify\` (row) | \`start\` \`center\` \`end\` \`between\` \`around\` |
| \`wrap\` (row) | \`wrap\` \`nowrap\` |

## High-traffic attributes

### \`box\` / \`card\`

| Attr | Notes |
| :--- | :--- |
| \`frame\` | \`card\` (default) \`band\` \`pill\` \`text\` — or sugar tags \`<band>\` / \`<pill>\` |
| \`padding\` \`gap\` \`radius\` \`border\` \`background\` \`size\` \`align\` \`tone\` \`id\` \`mark\` | shared tokens; \`mark="shield"\` draws a shield glyph |

### \`row\` / \`stack\` / \`grid\`

| Attr | Notes |
| :--- | :--- |
| \`gap\` \`align\` | shared |
| \`justify\` \`wrap\` | \`row\` only |
| \`cols\` | \`grid\` only, 1–6 |
| \`span\` | \`grid-item\` only, 1–6 |

### \`text\` / \`title\` / \`caption\`

| Attr | Notes |
| :--- | :--- |
| \`size\` \`align\` | shared |
| \`tone\` | \`text\`: \`plain\` \`muted\` \`accent\` \`tip\`. \`caption\` forces muted. |

### \`icon\`

| Attr | Notes |
| :--- | :--- |
| \`name\` | required; must be in the [icon catalog](/garden/en/reference/compose-icons) |
| \`size\` | \`sm\` \`md\` \`lg\` \`xl\` |
| \`inline\` | sit with surrounding text |

## Tag catalog

One mini sample per group, then a one-line table for every tag. No per-tag essays.

${groupsMd}
## Limits

- Nesting ~10 levels / ~220 nodes.
- Uncompiled prose-only fences report \`compose-uncompiled\`.
- Play path (\`{@body}\`, \`{#if}\`, …) is documented in the repo \`docs/compose-dil.md\`; static fences render default-state snapshots for control tags.
`
    : `---
title: 组件参考 · compose
navTitle: compose
description: 全部 compose 标签一览、共用 token，以及图标目录入口。
section: reference
order: 6
badge: compose
---

[← 组件参考](/garden/reference) · [用法](/garden/components/compose) · [图标目录](/garden/reference/compose-icons)

围栏写 \` \`\`\`garden compose \`。作者原话放 \`<intent>\`（不绘制）。未知标签报 \`compose-invalid\`。

当前 **${CATALOG_TAGS.length}** 个标签（\`CATALOG_TAGS\`）。图标 **${ICON_COUNT}** 个名字 —— 见 [图标目录](/garden/reference/compose-icons)。

## 共用 token

多数布局标签共用；颜色只走 Garden 主题变量（Claude 纸色）。

| Token | 取值 |
| :--- | :--- |
| \`padding\` / \`gap\` | \`0\`–\`4\`（4px × n） |
| \`background\` | \`surface\` \`surface-secondary\` \`surface-accent\` \`surface-tip\` \`surface-muted\` \`transparent\` |
| \`radius\` | \`none\` \`sm\` \`md\` \`lg\` \`xl\` \`full\` |
| \`border\` | \`subtle\` \`strong\`/\`true\` \`none\`/\`false\` |
| \`size\` | \`sm\` \`md\` \`lg\` \`xl\` |
| \`tone\` | \`plain\` \`accent\` \`tip\` \`muted\`（callout 另有 \`note\`/\`warn\`） |
| \`align\` | \`start\` \`center\` \`end\` \`stretch\` |
| \`justify\`（row） | \`start\` \`center\` \`end\` \`between\` \`around\` |
| \`wrap\`（row） | \`wrap\` \`nowrap\` |

## 高频属性

### \`box\` / \`card\`

| 属性 | 说明 |
| :--- | :--- |
| \`frame\` | \`card\`（默认）\`band\` \`pill\` \`text\`；也可用糖标签 \`<band>\` / \`<pill>\` |
| \`padding\` \`gap\` \`radius\` \`border\` \`background\` \`size\` \`align\` \`tone\` \`id\` \`mark\` | 共用 token；\`mark="shield"\` 画盾牌 |

### \`row\` / \`stack\` / \`grid\`

| 属性 | 说明 |
| :--- | :--- |
| \`gap\` \`align\` | 共用 |
| \`justify\` \`wrap\` | 仅 \`row\` |
| \`cols\` | 仅 \`grid\`，1–6 |
| \`span\` | 仅 \`grid-item\`，1–6 |

### \`text\` / \`title\` / \`caption\`

| 属性 | 说明 |
| :--- | :--- |
| \`size\` \`align\` | 共用 |
| \`tone\` | \`text\`：\`plain\` \`muted\` \`accent\` \`tip\`。\`caption\` 固定 muted。 |

### \`icon\`

| 属性 | 说明 |
| :--- | :--- |
| \`name\` | 必填；须在 [图标目录](/garden/reference/compose-icons) |
| \`size\` | \`sm\` \`md\` \`lg\` \`xl\` |
| \`inline\` | 与文字同行 |

## 标签目录

每组一个迷你样例，下面一张一句话表；不写长文。

${groupsMd}
## 限制

- 嵌套约 10 层 / 约 220 节点。
- 只有白话、没有标签时报 \`compose-uncompiled\`。
- Play（\`{@body}\`、\`{#if}\` …）见仓库 \`docs/compose-dil.md\`；静态围栏里的控件标签画成默认态快照。
`;

  fs.writeFileSync(file, body);
  console.log("wrote", path.relative(root, file));
}

function iconSvgInner(name) {
  const paths = ICONS[name];
  if (!paths) return "";
  return `<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
}

function writeIconsPage(lang) {
  const isEn = lang === "en";
  const file = isEn
    ? path.join(root, "docs/handbook/en/reference/compose-icons.md")
    : path.join(root, "docs/handbook/reference/compose-icons.md");

  const byLetter = new Map();
  for (const name of ICON_NAMES) {
    const letter = name[0].toUpperCase();
    if (!byLetter.has(letter)) byLetter.set(letter, []);
    byLetter.get(letter).push(name);
  }
  const letters = [...byLetter.keys()].sort();

  const az = letters.map((L) => `<a href="#gc-icon-${L.toLowerCase()}">${L}</a>`).join(" · ");

  const sections = letters
    .map((L) => {
      const cells = byLetter
        .get(L)
        .map(
          (name) =>
            `<div class="gc-icon-cell" id="icon-${name}"><span class="gc-icon-glyph">${iconSvgInner(name)}</span><code>${name}</code></div>`,
        )
        .join("\n");
      return `<section class="gc-icon-section" id="gc-icon-${L.toLowerCase()}">\n<h3>${L}</h3>\n<div class="gc-icon-grid">\n${cells}\n</div>\n</section>`;
    })
    .join("\n\n");

  const style = `<style>
.gc-icon-az { display: flex; flex-wrap: wrap; gap: 0.35rem 0.75rem; margin: 0.75rem 0 1.25rem; font: 500 13px/1.4 var(--sans, system-ui, sans-serif); }
.gc-icon-az a { color: var(--ink); text-decoration: none; border-bottom: 1px solid color-mix(in srgb, var(--rule) 80%, transparent); }
.gc-icon-az a:hover { border-bottom-color: var(--ink); }
.gc-icon-section { margin: 1.25rem 0 1.5rem; }
.gc-icon-section > h3 { margin: 0 0 0.6rem; font: 600 14px/1.3 var(--sans, system-ui, sans-serif); color: var(--muted); letter-spacing: 0.04em; }
.gc-icon-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(9.5rem, 1fr)); gap: 0.35rem 0.5rem; }
.gc-icon-cell { display: flex; align-items: center; gap: 0.45rem; min-width: 0; padding: 0.28rem 0.35rem; border-radius: 6px; }
.gc-icon-cell:hover { background: color-mix(in srgb, var(--ink) 4%, var(--paper)); }
.gc-icon-glyph { display: inline-flex; color: var(--ink); flex: 0 0 auto; }
.gc-icon-cell code { font: 400 11px/1.3 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; color: var(--muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
</style>`;

  const body = isEn
    ? `---
title: Component reference · compose icons
navTitle: compose icons
description: All ${ICON_COUNT} named Lucide stroke icons for compose — glyph + name, A–Z.
section: reference
order: 6.5
badge: compose
---

[← compose tags](/garden/en/reference/compose) · [Usage](/garden/en/components/compose)

\`<icon name="check-circle" size="sm"/>\` — Lucide stroke, \`viewBox="0 0 24 24"\`, follows \`currentColor\` (ink). Default stroke ≈ 1.75.

**${ICON_COUNT}** names in \`ICON_NAMES\`. Unknown \`name\` → compile error. Use browser find (⌘/Ctrl+F) on a name, or jump by letter.

${style}

<nav class="gc-icon-az" aria-label="Icon letters">${az}</nav>

${sections}
`
    : `---
title: 组件参考 · compose 图标
navTitle: compose 图标
description: compose 全部 ${ICON_COUNT} 个具名 Lucide 描边图标 —— 字形 + 名字，按 A–Z 可扫。
section: reference
order: 6.5
badge: compose
---

[← compose 标签](/garden/reference/compose) · [用法](/garden/components/compose)

\`<icon name="check-circle" size="sm"/>\` —— Lucide 描边，\`viewBox="0 0 24 24"\`，跟随 \`currentColor\`（墨色）。默认描边约 1.75。

\`ICON_NAMES\` 共 **${ICON_COUNT}** 个。未知 \`name\` → 编译失败。用浏览器查找（⌘/Ctrl+F）搜名字，或按字母跳转。

${style}

<nav class="gc-icon-az" aria-label="图标字母索引">${az}</nav>

${sections}
`;

  fs.writeFileSync(file, body);
  console.log("wrote", path.relative(root, file), "icons", ICON_COUNT);
}

writeComposeReference("zh");
writeComposeReference("en");
writeIconsPage("zh");
writeIconsPage("en");
console.log("ok tags", CATALOG_TAGS.length, "icons", ICON_COUNT);
