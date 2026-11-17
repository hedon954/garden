/** Author-facing /garden picker. Each row is a graphic type plus concise, component-specific guidance for the author. */
export const COMPOSE_FENCE_NAME = "compose";

const STROKE = "#3a3428";
const MUTED = "#8a8274";
const CARD = "#fffdf8";

function svgPreview(inner) {
  return "data:image/svg+xml," + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="72" height="48" viewBox="0 0 72 48">${inner}</svg>`,
  );
}

function intentFence(intent) {
  return "```garden compose\n" + intent + "\n```";
}

/**
 * Author-first prompt scaffold: AI constraints (no invented facts, mobile reflow,
 * syntax & open composition) live in `.agents/skills/garden-compose/SKILL.md`,
 * never dumped into the author's editor. Here we only show the 2-4 slots the
 * author needs to jot down for this specific figure.
 */
function authorPrompt({ label, guide, open = false }) {
  if (open) {
    return [
      "自由组合图文说明（可混排任意 Markdown / HTML 与卡片、行列、步骤等基础块）：",
      ...guide,
    ].join("\n");
  }
  return [
    `「${label}」要点：`,
    ...guide,
  ].join("\n");
}

/** Fence language for editor completions: always compose, never a picker id. */
export function composeFenceOpen() {
  return "garden compose";
}

const PREVIEW = {
  "columns-join": svgPreview(`<g fill="none" stroke="${STROKE}" stroke-width="1.25">
    <rect x="4" y="10" width="16" height="28" rx="2" fill="${CARD}"/><path d="M8 16h8M8 21h6"/>
    <rect x="28" y="8" width="16" height="32" rx="2" fill="${CARD}"/><path d="M32 16h8M32 21h6"/>
    <rect x="52" y="10" width="16" height="28" rx="2" fill="${CARD}"/><path d="M56 16h8M56 21h6"/>
    <path d="M20 24h8M44 24h8" stroke="${MUTED}"/>
  </g>`),
  "fan-out": svgPreview(`<g fill="none" stroke="${STROKE}" stroke-width="1.25">
    <rect x="6" y="16" width="16" height="16" rx="2" fill="${CARD}"/>
    <path d="M22 24h8"/>
    <rect x="48" y="4" width="18" height="10" rx="2" fill="${CARD}"/>
    <rect x="48" y="19" width="18" height="10" rx="2" fill="${CARD}"/>
    <rect x="48" y="34" width="18" height="10" rx="2" fill="${CARD}"/>
    <path d="M30 24h10M40 24L48 9M40 24h8M40 24L48 39" stroke="${MUTED}"/>
  </g>`),
  layers: svgPreview(`<g fill="none" stroke="${STROKE}" stroke-width="1.25">
    <rect x="10" y="4" width="52" height="8" rx="2" fill="${CARD}"/>
    <rect x="10" y="14" width="52" height="8" rx="2" fill="${CARD}"/>
    <rect x="10" y="24" width="52" height="8" rx="2" fill="${CARD}"/>
    <rect x="10" y="34" width="52" height="10" rx="2" fill="${CARD}"/>
  </g>`),
  facets: svgPreview(`<g fill="none" stroke="${STROKE}" stroke-width="1.25">
    <rect x="4" y="14" width="15" height="20" rx="2" fill="${CARD}"/>
    <rect x="21" y="14" width="15" height="20" rx="2" fill="${CARD}"/>
    <rect x="38" y="14" width="15" height="20" rx="2" fill="${CARD}"/>
    <rect x="55" y="14" width="13" height="20" rx="2" fill="${CARD}"/>
  </g>`),
  "two-row": svgPreview(`<g fill="none" stroke="${STROKE}" stroke-width="1.25">
    <rect x="6" y="6" width="16" height="12" rx="2" fill="${CARD}"/><path d="M22 12h6"/><rect x="28" y="6" width="16" height="12" rx="2" fill="${CARD}"/><path d="M44 12h6"/><rect x="50" y="6" width="16" height="12" rx="2" fill="${CARD}"/>
    <rect x="6" y="28" width="16" height="14" rx="2" fill="${CARD}"/><path d="M22 35h6"/><rect x="28" y="28" width="16" height="14" rx="2" fill="${CARD}"/><path d="M44 35h6"/><rect x="50" y="28" width="16" height="14" rx="2" fill="${CARD}"/>
  </g>`),
  "icon-rail": svgPreview(`<g fill="none" stroke="${STROKE}" stroke-width="1.25">
    <rect x="8" y="8" width="8" height="8" rx="1.5"/><path d="M20 10h28M20 15h20"/>
    <path d="M10 24h52" stroke="${MUTED}" stroke-width="1"/>
    <rect x="8" y="32" width="8" height="8" rx="1.5"/><path d="M20 34h28M20 39h16"/>
  </g>`),
  sequence: svgPreview(`<g fill="none" stroke="${STROKE}" stroke-width="1.25">
    <rect x="6" y="16" width="14" height="16" rx="2" fill="${CARD}"/>
    <path d="M22 24h6"/><path d="M25 21.5 L28.5 24 L25 26.5" fill="${STROKE}" stroke="none"/>
    <rect x="29" y="16" width="14" height="16" rx="2" fill="${CARD}"/>
    <path d="M45 24h6"/><path d="M48 21.5 L51.5 24 L48 26.5" fill="${STROKE}" stroke="none"/>
    <rect x="52" y="16" width="14" height="16" rx="2" fill="${CARD}"/>
  </g>`),
  steps: svgPreview(`<g fill="none" stroke="${STROKE}" stroke-width="1.25">
    <circle cx="14" cy="12" r="5"/><path d="M22 12h40M22 16h24"/>
    <path d="M14 17v6" stroke="${MUTED}"/>
    <circle cx="14" cy="28" r="5"/><path d="M22 28h40M22 32h20"/>
    <path d="M14 33v6" stroke="${MUTED}"/>
    <circle cx="14" cy="42" r="4"/><path d="M22 42h28"/>
  </g>`),
  compare: svgPreview(`<g fill="none" stroke="${STROKE}" stroke-width="1.25">
    <rect x="6" y="8" width="28" height="32" rx="2" fill="${CARD}"/>
    <rect x="38" y="8" width="28" height="32" rx="2" fill="${CARD}"/>
    <path d="M10 14h20M10 20h14M10 26h18M42 14h20M42 20h14M42 26h18"/>
  </g>`),
  timeline: svgPreview(`<g fill="none" stroke="${STROKE}" stroke-width="1.25">
    <path d="M16 6v36" stroke="${MUTED}"/>
    <circle cx="16" cy="12" r="2.5" fill="${STROKE}" stroke="none"/><path d="M24 10h32M24 15h20"/>
    <circle cx="16" cy="28" r="2.5" fill="${STROKE}" stroke="none"/><path d="M24 26h32M24 31h16"/>
  </g>`),
  lanes: svgPreview(`<g fill="none" stroke="${STROKE}" stroke-width="1.25">
    <path d="M8 16h56M8 30h56" stroke="${MUTED}"/>
    <rect x="14" y="10" width="16" height="8" rx="2" fill="${CARD}"/>
    <path d="M30 18v8"/><rect x="36" y="24" width="16" height="8" rx="2" fill="${CARD}"/>
  </g>`),
  tabs: svgPreview(`<g fill="none" stroke="${STROKE}" stroke-width="1.25">
    <rect x="8" y="8" width="16" height="8" rx="2" fill="${CARD}"/>
    <rect x="26" y="8" width="16" height="8" rx="2"/>
    <rect x="44" y="8" width="16" height="8" rx="2"/>
    <rect x="8" y="16" width="56" height="24" rx="2" fill="${CARD}"/>
  </g>`),
  chart: svgPreview(`<g fill="none" stroke="${STROKE}" stroke-width="1.25">
    <path d="M12 8v32h48" stroke="${MUTED}"/>
    <rect x="18" y="28" width="6" height="12" fill="${CARD}"/>
    <rect x="28" y="20" width="6" height="20" fill="${CARD}"/>
    <rect x="38" y="24" width="6" height="16" fill="${CARD}"/>
    <rect x="48" y="12" width="6" height="28" fill="${CARD}"/>
  </g>`),
  tunable: svgPreview(`<g fill="none" stroke="${STROKE}" stroke-width="1.25">
    <path d="M12 16h48" stroke="${MUTED}"/><circle cx="40" cy="16" r="4" fill="${CARD}"/>
    <rect x="16" y="28" width="40" height="12" rx="2" fill="${CARD}"/><path d="M22 34h20"/>
  </g>`),
  converter: svgPreview(`<g fill="none" stroke="${STROKE}" stroke-width="1.25">
    <rect x="8" y="16" width="16" height="16" rx="2" fill="${CARD}"/>
    <path d="M24 24h10"/><rect x="36" y="6" width="28" height="12" rx="2" fill="${CARD}"/>
    <rect x="36" y="20" width="28" height="12" rx="2" fill="${CARD}"/>
    <rect x="36" y="34" width="28" height="10" rx="2" fill="${CARD}"/>
  </g>`),
  "code-walkthrough": svgPreview(`<g fill="none" stroke="${STROKE}" stroke-width="1.25">
    <rect x="6" y="6" width="36" height="36" rx="2" fill="${CARD}"/>
    <path d="M10 12h28M10 18h20M10 24h24M10 30h16"/>
    <rect x="46" y="14" width="20" height="20" rx="2"/><path d="M50 20h12M50 26h8"/>
  </g>`),
  stepper: svgPreview(`<g fill="none" stroke="${STROKE}" stroke-width="1.25">
    <rect x="8" y="8" width="56" height="22" rx="2" fill="${CARD}"/>
    <path d="M16 32h8M28 32h8M40 32h8" stroke="${MUTED}"/>
    <circle cx="20" cy="40" r="3"/><circle cx="32" cy="40" r="3" fill="${STROKE}"/><circle cx="44" cy="40" r="3"/>
  </g>`),
  trace: svgPreview(`<g fill="none" stroke="${STROKE}" stroke-width="1.25">
    <rect x="8" y="16" width="14" height="14" rx="7" fill="${CARD}"/>
    <rect x="29" y="16" width="14" height="14" rx="7"/>
    <rect x="50" y="16" width="14" height="14" rx="7" fill="${CARD}"/>
    <path d="M22 23h7M43 23h7"/>
    <circle cx="36" cy="23" r="3" fill="${STROKE}" stroke="none"/>
  </g>`),
  plan: svgPreview(`<g fill="none" stroke="${STROKE}" stroke-width="1.25">
    <rect x="10" y="8" width="8" height="8" rx="1"/><path d="M24 12h36"/>
    <rect x="10" y="20" width="8" height="8" rx="1"/><path d="M24 24h28"/>
    <rect x="10" y="32" width="8" height="8" rx="1"/><path d="M24 36h32"/>
  </g>`),
  "inspect-grid": svgPreview(`<g fill="none" stroke="${STROKE}" stroke-width="1.25">
    <rect x="12" y="6" width="48" height="36" rx="2"/>
    <path d="M12 18h48M12 30h48M28 6v36M44 6v36" stroke="${MUTED}"/>
    <rect x="28" y="18" width="16" height="12" fill="${CARD}"/>
  </g>`),
  other: svgPreview(`<g fill="none" stroke="${STROKE}" stroke-width="1.25">
    <path d="M8 10h28M8 15h20" stroke="${MUTED}"/>
    <rect x="40" y="8" width="24" height="16" rx="2" fill="${CARD}"/><path d="M44 13h16M44 18h10"/>
    <rect x="8" y="26" width="22" height="14" rx="2"/><path d="M12 31h14M12 35h9"/>
    <path d="M36 30h28M36 36h20" stroke="${MUTED}"/>
  </g>`),
};

const SPECS = [
  {
    name: "columns-join",
    label: "关联图",
    hint: "适合说明两边如何通过中间一项关联起来",
    when: "两边通过中间一项关联起来",
    whenNot: "没有中间连接关系时，不必强行加连接",
    searchText: "关联图 三列并排 中间接起来 列 连接 关系图 用户 角色 权限 columns-join",
    guide: [
      "- 左边是什么：（名称与包含的条目）",
      "- 中间靠什么关联（重点）：（枢纽名称与连接职责）",
      "- 右边是什么：（名称与包含的条目）",
      "- 底部一句话结论（可选）：",
    ],
    sources: [
      { file: ".agents/skills/garden-compose/references/visual-selection.md", phrase: "多项汇总" },
    ],
  },
  {
    name: "fan-out",
    label: "发散图",
    hint: "适合说明先到一处，再同时连到好几处",
    when: "先到一处，再同时连到好几处",
    whenNot: "没有真正的先到再分支时，不要画成发散",
    searchText: "发散图 先到再散开 先到一处 再散开 扇出 fan 一分多 汇合 分发",
    guide: [
      "- 起点是谁：",
      "- 先集中经过哪一层（重点）：（名称与职责）",
      "- 同时分发到哪几处：（列出 2–4 个下游名称与说明）",
    ],
    sources: [
      { file: ".agents/skills/garden-compose/references/visual-selection.md", phrase: "一分多" },
    ],
  },
  {
    name: "layers",
    label: "分层图",
    hint: "适合说明自上而下的层次，不必按顺序走完",
    when: "自上而下的层次",
    whenNot: "层次不是自动变成必须按顺序走完的流程",
    searchText: "分层图 分层结构 自上而下分层 分层 层次 架构 layers",
    guide: [
      "- 从上到下依次是哪几层：（每层名称 + 一句职责）",
      "- 重点突出哪一两层：",
      "- 补充说明（可选）：（例如是否每次请求都走完所有层）",
    ],
    sources: [
      { file: ".agents/skills/garden-compose/references/visual-selection.md", phrase: "包含或分层" },
    ],
  },
  {
    name: "facets",
    label: "并列图",
    hint: "适合说明一件事的几个方面，没有先后顺序",
    when: "一件事的几个方面，没有先后",
    whenNot: "没有先后就不要画成流程；没有同一条件的比较时，也不要画成对比图",
    searchText: "并列图 多个切面 并列 方面 等宽 卡片 facets 并列类别",
    guide: [
      "- 围绕的核心主题：",
      "- 并列的几个方面（无先后）：（列出 3–6 项「短标题：一句说明」）",
      "- 最关键的一项（可选）：",
    ],
    sources: [
      { file: ".agents/skills/garden-compose/references/visual-selection.md", phrase: "并列类别" },
    ],
  },
  {
    name: "two-row",
    label: "上下对照图",
    hint: "适合把背景过程和重点过程分行对照",
    when: "上面是背景过程，下面才是要讲的过程",
    whenNot: "不是在比两套过程、或其实是同一条件下的方案对比时，不要用这种分行对照",
    searchText: "上下对照图 上下两行对比 两行 上下 对比 背景 过程 two-row",
    guide: [
      "- 上排（常规或背景过程）：阶段 1 → 阶段 2 → 阶段 3",
      "- 下排（要强调的重点过程）：阶段 1 → 阶段 2 → 阶段 3",
      "- 两排对照想说明的结论：",
    ],
    sources: [
      { file: "docs/handbook/components/intelligent-ui.md", phrase: "上下对照图" },
    ],
  },
  {
    name: "icon-rail",
    label: "图文列表",
    hint: "适合逐条说明互不依赖的内容",
    when: "一条条独立说明，用图标带出标题和正文",
    whenNot: "这些条目没有先后依赖，不要画成流程，也不要写成要照着做的清单",
    searchText: "图文列表 图标窄栏 独立条目 标题正文 图标 icon-rail",
    guide: [
      "- 要点 1：（小标题 + 正文说明）",
      "- 要点 2：（小标题 + 正文说明）",
      "- 要点 3：（小标题 + 正文说明）",
    ],
    sources: [
      { file: ".agents/skills/garden-compose/references/visual-selection.md", phrase: "图标窄栏、标题正文共左缘" },
      { file: ".agents/skills/garden-compose/references/layout-recipes.md", phrase: "图标窄栏 + 共用右栏的纵向条目" },
    ],
  },
  {
    name: "sequence",
    label: "流程图",
    hint: "适合说明一件事按什么顺序完成",
    when: "有明确先后的阶段",
    whenNot: "没有顺序的条目不要加箭头，也不要靠缩字硬撑手机横排",
    searchText: "流程图 顺序流程 短阶段 长阶段 从左到右 纵向 顺序链 sequence",
    guide: [
      "- 先后阶段：第 1 步 → 第 2 步 → 第 3 步（写明每步短标题与动作）",
      "- 重点环节（可选）：",
    ],
    sources: [
      { file: ".agents/skills/garden-compose/references/visual-selection.md", phrase: "短阶段从左到右" },
      { file: ".agents/skills/garden-compose/references/visual-selection.md", phrase: "长阶段或纵向顺序" },
    ],
  },
  {
    name: "steps",
    label: "分步图",
    hint: "适合一步步解释，步骤里可以展开细节",
    when: "一步步解释，并可展开细节",
    whenNot: "不是按比例表示时间，也不是让读者照着做的清单，更不是让读者逐步查看状态变化",
    searchText: "分步图 分步说明 分步解释 步骤 steps step",
    guide: [
      "- 第 1 步：（步骤标题 + 一句概括｜点击展开的补充细节）",
      "- 第 2 步：（步骤标题 + 一句概括｜点击展开的补充细节）",
      "- 第 3 步：（步骤标题 + 一句概括｜点击展开的补充细节）",
    ],
    sources: [
      { file: ".agents/skills/garden-compose/references/visual-selection.md", phrase: "分步解释" },
      { file: "docs/compose-catalog.md", phrase: "分步" },
    ],
  },
  {
    name: "compare",
    label: "对比图",
    hint: "适合比较两三种方案在同一条件下的差异",
    when: "两三种方案在同一条件下比较",
    whenNot: "只是罗列各自特点、没有共同条件时，用普通表格或并列图即可",
    searchText: "对比图 对照 比较 compare 方案 左右 同一条件",
    guide: [
      "- 比较的共同前提或场景：",
      "- 方案 A：（名称 + 做法与特点）",
      "- 方案 B：（名称 + 做法与特点）",
    ],
    sources: [
      { file: "ui/prompt/recipes/compare.md", phrase: "配方：对照" },
      { file: ".agents/skills/garden-compose/references/visual-selection.md", phrase: "对照" },
    ],
  },
  {
    name: "timeline",
    label: "时间线图",
    hint: "适合按日期或时间点排列事件",
    when: "按日期或时间点排列事件",
    whenNot: "没有按时间比例展开的进度，不要画成带时长的甘特图",
    searchText: "时间线图 时间节点 日期 事件 时间线 timeline",
    guide: [
      "- 时间点 1：（日期或时刻 + 事件标题 + 一句说明）",
      "- 时间点 2：（日期或时刻 + 事件标题 + 一句说明）",
      "- 时间点 3：（日期或时刻 + 事件标题 + 一句说明）",
    ],
    sources: [
      { file: ".agents/skills/garden-compose/references/visual-selection.md", phrase: "时间节点" },
    ],
  },
  {
    name: "lanes",
    label: "时序图",
    hint: "适合说明谁在什么时候向谁发了什么",
    when: "谁在什么时候向谁发了什么",
    whenNot: "不是通用建模语言，也不支持任意分支、循环或自动布线",
    searchText: "时序图 交互时序 时序 泳道 lanes actor message 谁发给谁",
    guide: [
      "- 参与方：（2–4 个角色名称）",
      "- 消息往返顺序：",
      "  1. 谁 → 谁：发了什么",
      "  2. 谁 → 谁：回了什么",
    ],
    sources: [
      { file: ".agents/skills/garden-compose/references/visual-selection.md", phrase: "交互时序" },
    ],
  },
  {
    name: "tabs",
    label: "选项卡",
    hint: "适合几组说明互相独立、一次只看一组",
    when: "几组说明互相独立，一次看一组",
    whenNot: "必须同时比较的事实不要藏进其他组，这不是应用导航",
    searchText: "选项卡 分组切换 tabs 面板 分组说明",
    guide: [
      "- 选项卡 1：（标签名 + 该组内容）",
      "- 选项卡 2：（标签名 + 该组内容）",
      "- 选项卡 3（可选）：（标签名 + 该组内容）",
    ],
    sources: [
      { file: ".agents/skills/garden-compose/references/visual-selection.md", phrase: "分组切换" },
    ],
  },
  {
    name: "chart",
    label: "数据图",
    hint: "适合把已有数字画成柱状、折线或占比",
    when: "已有一组测过或给定的数字，要让读者看清具体值",
    whenNot: "不要编造数据；结果可由公式随输入变化时，优先用参数调节图",
    searchText: "数据图 图表 chart 柱状 折线 饼图 实测 占比",
    guide: [
      "- 图表形式：（柱状图 / 折线图 / 占比饼图）",
      "- 真实数据与单位：（直接贴出各项名称与数值）",
      "- 想让读者一眼看出的峰值或结论：",
    ],
    sources: [
      { file: "ui/prompt/recipes/data-chart.md", phrase: "配方：数据图" },
      { file: ".agents/skills/garden-compose/references/visual-selection.md", phrase: "数据图" },
    ],
  },
  {
    name: "tunable",
    label: "参数调节图",
    hint: "适合让读者改一两个输入，看结果怎么变",
    when: "结果由一两个输入决定，读者会想换成别的值会怎样",
    whenNot: "只有一个固定例子要讲，或输入过多时先拆开；一个输入带动多项输出时用换算图",
    searchText: "参数调节图 可调参数 参数台 参数实验 拧参数 调节 slider param-bench tunable",
    guide: [
      "- 可调输入参数：（名称、范围、默认值与单位）",
      "- 结果与计算关系：（结果名称、公式或变化规律）",
      "- 默认状态下要体现的结论：",
    ],
    sources: [
      { file: "ui/prompt/recipes/param-bench.md", phrase: "配方：参数台" },
      { file: ".agents/skills/garden-compose/references/visual-selection.md", phrase: "参数实验" },
    ],
  },
  {
    name: "converter",
    label: "换算图",
    hint: "适合一个输入同时算出好几项结果",
    when: "一个输入同时算出好几项结果",
    whenNot: "只有一个结果时用参数调节图；各项要分别调时先拆开",
    searchText: "换算图 换算器 换算 converter 用料 成本 单位 人数",
    guide: [
      "- 单一输入项：（名称、范围、默认值与单位）",
      "- 同步换算出的多项结果：（列出每项名称、换算倍率或公式、单位）",
    ],
    sources: [
      { file: "ui/prompt/recipes/converter.md", phrase: "配方：换算器" },
    ],
  },
  {
    name: "code-walkthrough",
    label: "代码走查",
    hint: "适合一行行看代码执行到哪、变量是多少",
    when: "一段不长的代码值得一行行讲",
    whenNot: "只需要展示代码时用普通代码块；代码太长时先截关键段",
    searchText: "代码走查 代码 逐行 walkthrough 变量",
    guide: [
      "- 要讲解的关键代码：（直接贴在下方，聚焦核心片段）",
      "- 分步走查：（每一步停在哪几行、为什么走这里、此时关键变量值是多少）",
    ],
    sources: [
      { file: "ui/prompt/recipes/code-walkthrough.md", phrase: "配方：代码走查" },
    ],
  },
  {
    name: "stepper",
    label: "逐步演示",
    hint: "适合让读者停在某一步，看状态怎么变",
    when: "过程中的状态会变，读者想停在某一步看哪里变了",
    whenNot: "只有两三个静态阶段时，用分步图或流程图即可",
    searchText: "逐步演示 步进器 步进 stepper 状态变化 再走一步 停在某一步",
    guide: [
      "- 初始状态：",
      "- 第 1 步发生了什么变化：",
      "- 第 2 步发生了什么变化：",
      "- 每一步需要高亮标出的变化点：",
    ],
    sources: [
      { file: "ui/prompt/recipes/stepper.md", phrase: "配方：步进器" },
    ],
  },
  {
    name: "trace",
    label: "路径标注图",
    hint: "适合在已有流程或状态图上标出走到哪",
    when: "已有一张状态图或流程图，并且过程沿着它一步步走",
    whenNot: "只需要展示结构，或节点、连线过多时先拆开",
    searchText: "路径标注图 轨迹 状态图 走到哪 当前状态 trace",
    guide: [
      "- 参与方与状态节点：",
      "- 每步状态迁移：",
      "  - 初始：各方所处状态",
      "  - 第 1 步：触发动作 → 哪一方变为新状态",
      "  - 第 2 步：触发动作 → 哪一方变为新状态",
    ],
    sources: [
      { file: "ui/prompt/recipes/trace.md", phrase: "配方：轨迹" },
    ],
  },
  {
    name: "plan",
    label: "步骤清单",
    hint: "适合读者照着一项项做，并回来查看进度",
    when: "步骤多、要跟着做，读者一边操作一边回来查看做到哪了",
    whenNot: "只是概念上的几个阶段时写列表或分步图；步骤之间要观察状态变化时用逐步演示",
    searchText: "步骤清单 计划与清单 清单 部署 排查 步骤 plan checklist",
    guide: [
      "- 清单标题：",
      "- 第 1 步：（动作开头 + 注意事项）",
      "- 第 2 步：（动作开头 + 注意事项）",
      "- 第 3 步：（动作开头 + 注意事项）",
    ],
    sources: [
      { file: "ui/prompt/recipes/plan.md", phrase: "配方：计划与清单" },
    ],
  },
  {
    name: "inspect-grid",
    label: "格子图",
    hint: "适合标出二维结构里哪几格特别、为什么",
    when: "二维结构里要盯住某几格，并说明为什么特别",
    whenNot: "只是普通数据表、没有哪一格要特别解释时，用普通表格即可",
    searchText: "格子图 检视格 格子 矩阵 bitmap inspect-grid Attention 高亮",
    guide: [
      "- 二维结构的行和列分别代表什么：",
      "- 各格填入的内容：",
      "- 需要高亮标出哪几格，以及原因：",
    ],
    sources: [
      { file: "ui/prompt/recipes/inspect-grid.md", phrase: "配方：检视格" },
    ],
  },
];

const OTHER = {
  name: "other",
  label: "其他",
  hint: "适合现成图形无法表达、需要自由组合图文的内容",
  when: "现成图形无法表达，或需要把图文自由组合在一起",
  whenNot: "不要把列表里的常用图示当成合法白名单，也不要为此学习新语法",
  searchText: "其他 other 任意 灵活 开放 组合 自由组合 图文 无现成 无法表达 markdown html 基础块",
  open: true,
  guide: [
    "- 要呈现的原文内容或数据：",
    "- 希望读者怎么看（结构关系或交互方式）：",
    "- 最核心的视觉重点：",
  ],
  sources: [
    { file: ".agents/skills/garden-compose/references/composition-patterns.md", phrase: "无现成表示方式时" },
    { file: ".agents/skills/garden-compose/references/composition-patterns.md", phrase: "没有配方不是失败条件" },
  ],
};

function decorate(spec) {
  const open = Boolean(spec.open);
  const prompt = authorPrompt({ label: spec.label, guide: spec.guide, open });
  return {
    name: spec.name,
    label: spec.label,
    hint: spec.hint,
    when: spec.when,
    whenNot: spec.whenNot,
    searchText: spec.searchText,
    preview: PREVIEW[spec.name],
    prompt,
    body: intentFence(prompt),
    open,
    sources: spec.sources ?? [],
  };
}

export const DIAGRAM_RECIPES = [...SPECS.map(decorate), decorate(OTHER)];
export const OTHER_RECIPE_NAME = "other";
export const INTERNAL_LAYOUT_TERMS_NOT_FOR_AUTHORS = ["centered-chip", "frameless-scene", "equal-cards", "flow-row", "flow-stack"];

export function filterPickerItems(query, items = DIAGRAM_RECIPES) {
  const needle = String(query ?? "").trim().toLowerCase();
  if (!needle) return [...items];
  return items.filter((item) => {
    const hay = [item.name, item.label, item.hint, item.when, item.searchText].join("\n").toLowerCase();
    return hay.includes(needle);
  });
}

export function pickerSelectionResult(item, _typedText = "") {
  return {
    insertText: item.body,
    prompt: item.prompt,
  };
}

export function recommendAuthorPrompt(item) {
  return item.prompt;
}
