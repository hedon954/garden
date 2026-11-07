/**
 * Markdown section injected into `garden ui prompt` for compose DIL.
 * Generated from CATALOG_TAGS + tokens + icon count so it cannot drift.
 */

import { COMPONENTS } from "../core/catalog.mjs";
import { AUTHOR_PLAY_TAGS } from "./dil.mjs";
import { FEATURE_FIELDS } from "./features.mjs";
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
      "group", "field", "header", "footer", "figure", "code", "pre", "markdown", "html",
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
    "同一入口组合静态布局、文章内容岛、原生语义场景和参数交互。小写标签按所在上下文的真实契约解析。",
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
    "- color / backgroundColor：布局与文字基础标签可写命名色、transparent、hex（含 alpha）、rgb/rgba/hsl/hsla 字面量。文字继承，背景不继承；不写则保留主题。Play 支持 stack/columns/card/caption/badge/stat/table；chart palette API 不变。该颜色属性不接受 CSS 声明；内容岛的安全 HTML 可用校验通过的局部 style。",
    "",
    '- 静态场景外框默认保留；需要无框时使用唯一最外层 `<figure frame="none">…</figure>`（显式默认 `frame="card"`）。只移除场景边框、圆角、背景与内边距，不影响内部卡片。',
    "- 行内内容支持文章 Markdown（强调、代码、链接、删除线）及安全 HTML（如 `<u>`）。完整段落、标题、列表、表格、代码和 HTML 块放在 `<markdown>…</markdown>` 或 `<html>…</html>` 中；两者可嵌入布局，采用共享文章语法。HTML/CSS 受明确白名单校验，不执行脚本、事件、iframe、外部样式或脚本 URL。内容岛为静态内容，状态插值放相邻 Compose 控件/文字。",
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

  lines.push("", "### 原生语义场景属性（由实际验证器生成）");
  for(const [tag,props] of Object.entries(FEATURE_FIELDS))lines.push(`- <${tag}>: ${props.filter(p=>p!=="resolved").join(", ")||"无属性"}；未知属性报错。`);
  lines.push("", "### Play 标签属性（由实际组件目录生成）");
  for(const [tag,name] of Object.entries(AUTHOR_PLAY_TAGS)){
    const spec=COMPONENTS[name];if(!spec)continue;
    lines.push(`- <${tag}>: ${spec.summary}；${Object.entries(spec.props??{}).map(([key,p])=>`${key}${p.required?"!":""}:${p.type}${p.default!==undefined?"="+JSON.stringify(p.default):""}`).join(", ")}；直接子项=${Array.isArray(spec.children)?spec.children.map(n=>Object.entries(AUTHOR_PLAY_TAGS).find(([,target])=>target===n)?.[0]??n).join("/"):spec.children}`);
  }
  return lines.join("\n");
}
