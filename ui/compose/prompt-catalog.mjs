/**
 * Markdown section injected into `garden ui prompt` for compose DIL.
 * Generated from CATALOG_TAGS + tokens + icon count so it cannot drift.
 */

import { CATALOG_TAGS } from "./markup.mjs";
import { ICON_COUNT } from "./icons.mjs";
import {
  ALIGNS,
  BACKGROUNDS,
  BORDERS,
  JUSTIFIES,
  RADII,
  SIZES,
  SPACING,
  TONES,
  WRAPS,
} from "./tokens.mjs";

const GROUPS = [
  {
    title: "布局",
    tags: [
      "box", "card", "row", "stack", "columns", "grid", "grid-item", "pill", "band",
      "steps", "step", "lanes", "compare", "item", "callout", "tabs", "tab",
      "list", "list-item", "table", "tr", "th", "td", "thead", "tbody",
      "group", "field", "header", "footer", "figure", "code", "pre",
    ],
  },
  {
    title: "文字与标注",
    tags: [
      "title", "text", "caption", "badge", "note", "actor", "intent", "join",
      "label", "kbd", "link", "prose", "message", "option",
    ],
  },
  {
    title: "空标签 / 控件快照",
    tags: [
      "arrow", "fan", "divider", "separator", "kpi", "icon", "spacer", "image",
      "avatar", "progress", "meter", "checkbox", "radio", "toggle", "switch",
      "input", "select", "textarea", "button", "slider", "stat", "empty",
    ],
  },
];

function list(set) {
  return [...set].sort().map((v) => `\`${v}\``).join(" ");
}

/** Compose DIL catalog for `garden ui prompt` (between rules and interactive reference). */
export function composeCatalogReference() {
  const known = new Set(CATALOG_TAGS);
  const grouped = new Set();
  const lines = [
    "## compose 目录（小写标签 + token）",
    "",
    "作者只写白话想法；AI 编译成 **Markdown 叶子 + 小写目录标签 + 设计 token**。围栏类型始终是 `garden compose`。作者原话放进 `<intent>`，不画出来。",
    "",
    "这和下面的 **interactive PascalCase** 目录不是同一套：compose 用小写标签；interactive 仅作旧 play / 兼容。",
    "",
    `当前 **${CATALOG_TAGS.length}** 个标签；图标 **${ICON_COUNT}** 个名字（\`<icon name="check-circle"/>\`）。未知标签或未知图标名 → 编译失败。`,
    "",
    "### 共用 token",
    "",
    `- \`padding\` / \`gap\`：${list(SPACING)}（4px × n）`,
    `- \`background\`：${list(BACKGROUNDS)}`,
    `- \`radius\`：${list(RADII)}`,
    `- \`border\`：${list(BORDERS)}`,
    `- \`size\`：${list(SIZES)}`,
    `- \`tone\`：${list(TONES)}（callout 另有 \`note\`/\`warn\`；lanes message 另有 \`forward\`/\`back\`）`,
    `- \`align\`：${list(ALIGNS)}`,
    `- \`justify\`（row）：${list(JUSTIFIES)}`,
    `- \`wrap\`（row）：${list(WRAPS)}`,
    "",
    "### 写法要点",
    "- color / backgroundColor：布局与文字基础标签可写命名色、transparent、hex（含 alpha）、rgb/rgba/hsl/hsla 字面量。文字继承，背景不继承；不写则保留主题。Play 支持 stack/columns/card/caption/badge/stat/table；chart palette API 不变。禁止 style、url()、var() 或 CSS 声明。",
    "",
    '- 静态场景外框默认保留；需要无框时使用唯一最外层 `<figure frame="none">…</figure>`（显式默认 `frame="card"`）。只移除场景边框、圆角、背景与内边距，不影响内部卡片。',
    "- 叶子是 Markdown（标题、段落、`**强调**`、列表）；结构是目录标签。不要写 YAML 槽、HTML、SVG、脚本或宽度；自定义颜色只写 color / backgroundColor。",
    "- 芯片内部间距用 `gap={0}` / `gap={1}`；章节堆叠用 `gap={2}` / `gap={3}` 及以上。",
    "- 日横幅等宽：`row` 里每个 day 芯片 `flex:1`（`nowrap` + `size=\"sm\"`），不要用 between 把空日挤成内容宽。",
    "- tip 钉在右边：`justify=\"between\"`，tip/`caption` 侧 `flex:0`。",
    "- phrasing 叶子（title/text/caption/badge/…）保留单独的前导 `*`（脚注标记）；不要剥掉。",
    "- **play（可调参数）** 仍用 `garden compose`：可用 `{@body}`、`{expr}`、`{#if}`/`{#each}` 与小写控件（`slider`/`choice`/`button`/`stat`…）。静态 diagram 路径不解析这些构造。",
    "",
  ];

  for (const group of GROUPS) {
    const tags = group.tags.filter((tag) => known.has(tag));
    for (const tag of tags) grouped.add(tag);
    lines.push(`### ${group.title}`, "", tags.map((tag) => `\`${tag}\``).join(" "), "");
  }

  const leftover = CATALOG_TAGS.filter((tag) => !grouped.has(tag));
  if (leftover.length) {
    lines.push("### 其他", "", leftover.map((tag) => `\`${tag}\``).join(" "), "");
  }

  return lines.join("\n");
}
