/**
 * Author-facing Garden blocks. One catalog feeds the parser, checker,
 * snippets, Typora templates and the component list.
 * Names describe what the reader sees. English only.
 */

export const GARDEN_NAMES = ["card", "stat", "compare", "timeline", "chart", "figure", "html", "interactive"];

export const LEGACY_FENCES = {
  embed: { name: "card", suggestion: "`embed` 已改为 `garden card`" },
  widget: { name: "html", suggestion: "`widget` 已改为 `garden html`" },
  intent: { name: "", suggestion: "`intent` 已改为 `garden`（想法，发布前编译）" },
  ui: { name: "interactive", suggestion: "`ui` 已改为 `garden interactive`" },
  "ui-error": { name: "interactive", suggestion: "`ui` 已改为 `garden interactive`" },
};

export const CATALOG = {
  card: {
    label: "资源卡",
    when: "一篇论文、一个仓库或一本书，读者需要标题、链接和一句说明。",
    whenNot: "正文里已经有这句话时，不要再包一张卡。",
    keys: ["url", "title", "description", "image", "alt", "points", "meta", "text", "source", "site", "items"],
    example: `\`\`\`garden card
url: https://arxiv.org/abs/2309.06180
title: PagedAttention
description: vLLM 的分页 KV 管理。
\`\`\``,
    triggers: ["gcard"],
  },
  stat: {
    label: "指标",
    when: "一个短指标：标签、数字、可选的一句说明和来源。",
    whenNot: "数字需要读者自己代入参数时，写成想法，不要做静态指标。",
    keys: ["items", "label", "value", "unit", "caption", "source", "text"],
    example: `\`\`\`garden stat
items:
  - label: Llama-2-13B · 4K 上下文
    value: 3.2
    unit: GiB
    source: https://arxiv.org/abs/2309.06180
\`\`\``,
    triggers: ["gstat"],
  },
  compare: {
    label: "对比",
    when: "两三件东西并排，每格大约 60 字以内。",
    whenNot: "任何一格超过约 60 字时，用原文的列表，不要并排。",
    keys: ["items"],
    itemKeys: ["title", "text"],
    example: `\`\`\`garden compare
items:
  - title: 自旋锁
    text: 临界区极短时忙等，不进入休眠。
  - title: 互斥锁
    text: 争用久就休眠，避免空转占满 CPU。
\`\`\``,
    triggers: ["gcompare"],
  },
  timeline: {
    label: "时间线",
    when: "版本演进或一段历史，每条有日期和一句说明。",
    whenNot: "没有时间顺序时，用普通列表。",
    keys: ["title", "items"],
    itemKeys: ["date", "title", "text", "source"],
    example: `\`\`\`garden timeline
items:
  - date: 2015
    title: 并发标记
    text: 暂停时间降下来。
  - date: 2017
    title: 栈重扫移出 STW
    text: 停顿通常低于 100 微秒。
  - date: 2022
    title: 软内存上限
    text: 运行时可以设 GOMEMLIMIT。
\`\`\``,
    triggers: ["gtimeline"],
  },
  chart: {
    label: "图表",
    when: "一组已经算好的数字，读者不需要拧参数。",
    whenNot: "数字会随读者的选择变化时，写成想法，编译成 interactive。",
    keys: ["type", "title", "x", "series", "data", "unit", "caption", "xLabel", "yLabel"],
    example: `\`\`\`garden chart
type: bar
title: 示例延迟
x: 方案
series:
  - name: 延迟
    data: [120, 85]
unit: ms
\`\`\``,
    triggers: ["gchart"],
  },
  figure: {
    label: "结构图",
    when: "一张结构图，读者点一个部分就看到对应的一句说明。",
    whenNot: "作者已经用 mermaid 画了整张流程时，保留 mermaid，不要拆开重画。",
    keys: ["image", "alt", "mermaid", "svg", "parts", "caption"],
    example: `\`\`\`garden figure
image: ./figure.svg
parts:
  - name: 全部
    text: 整张图。
  - name: 标记
    text: 这一步只做标记。
\`\`\``,
    triggers: ["gfigure"],
  },
  html: {
    label: "自定义 HTML",
    when: "目录里的组件画不出来的示意图或小工具，写在同名目录的 HTML 里。",
    whenNot: "能用 card、chart、figure 或正文说清时，不要写 HTML。",
    keys: ["src", "code", "title", "height"],
    example: `\`\`\`garden html
src: ./demo.html
title: 示意图
\`\`\``,
    triggers: ["ghtml"],
  },
  interactive: {
    label: "交互",
    when: "读者需要拧参数或翻状态才能看懂，由想法编译而来。",
    whenNot: "一次乘法、把散文切成步骤，都不要做成交互。",
    keys: ["id", "caption", "intent", "expect"],
    example: `\`\`\`garden interactive #kv-memory
caption: 显存与 batch、序列长度都成正比。
intent: |
  让读者拧 batch，看 KV 显存。
---
<State batch={1} />
\`\`\``,
    triggers: ["ginteractive"],
  },
};

export const IDEA = {
  label: "想法",
  when: "还不确定用哪个组件时，写一句想让读者看出什么。",
  whenNot: "发布前必须编译掉。草稿里可以留着。",
  example: `\`\`\`garden
让读者……；想让读者看出……
\`\`\``,
  triggers: ["garden想法", "gidea"],
};

export function legacyOf(lang) {
  const key = String(lang || "").toLowerCase();
  if (LEGACY_FENCES[key]) return { lang: key, ...LEGACY_FENCES[key] };
  if (key.startsWith("garden:")) {
    const name = key.slice("garden:".length);
    return { lang: key, name, suggestion: `\`${key}\` 已改为 \`garden ${name}\`` };
  }
  return null;
}

export function knownName(name) {
  return GARDEN_NAMES.includes(name);
}

function distance(left, right) {
  const a = [...left];
  const b = [...right];
  const row = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    let previous = i;
    for (let j = 1; j <= b.length; j += 1) {
      const next = a[i - 1] === b[j - 1] ? row[j - 1] : Math.min(row[j - 1], row[j], previous) + 1;
      row[j - 1] = previous;
      previous = next;
    }
    row[b.length] = previous;
  }
  return row[b.length];
}

export function suggestName(name) {
  let best = null;
  let score = 3;
  for (const known of GARDEN_NAMES) {
    const gap = distance(String(name || ""), known);
    if (gap < score) {
      score = gap;
      best = known;
    }
  }
  return best;
}

export function cheatSheet() {
  const blocks = [
    IDEA.example,
    ...GARDEN_NAMES.map((name) => CATALOG[name].example),
  ];
  return ["<!-- 组件速查。复制需要的一块，删掉这段注释。", ...blocks.flatMap((example) => ["", example]), "-->"].join("\n");
}
