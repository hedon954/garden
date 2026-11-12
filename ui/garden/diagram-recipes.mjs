/** Author-facing /garden picker. Each row is a graphic type plus when an author would use it, not an internal layout or recipe id. */
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

function authorPrompt({label, routeHint, open=false}) {
  if (open) {
    return [
      "请根据我提供的材料和表达目标，在统一的 garden compose 里自由组合图文。现成图形无法表达、或需要把几种内容组合在一起时，用任意 Markdown / HTML 以及已有的基础块做成合适的说明。",
      "",
      "我的材料：",
      "- （粘贴要呈现的内容、关系和原文）",
      "",
      "我的表达目标：",
      "- （读者应该理解什么、重点是什么）",
      "",
      "请你：",
      "- 只根据材料组织内容，不要发明事实或结论",
      "- 自行处理图形语法、布局和手机阅读适配，不要让我学习新语法或写 CSS",
      "- 列表里的常用图示只是起点，不是合法白名单；没有现成配方也可以，先抽取真实关系再组合基础块",
      "- 不要把结果限制为某一个现成模板；需要时可以混合普通 Markdown、安全 HTML，以及卡片、行列、步骤等基础块",
    ].join("\n");
  }
  return [
    `请根据我提供的材料和表达目标，用 garden compose 做一个「${label}」说明图。`,
    "",
    "我的材料：",
    "- （粘贴原文条目和需要保留的措辞）",
    "",
    "我的表达目标：",
    "- （读者要一眼看出什么）",
    "",
    "请你：",
    "- 只根据材料组织内容，不要发明事实或结论",
    "- 自行处理图形语法、布局和手机阅读适配，不要让我学习标签或写 CSS",
    `- 「${label}」是推荐起点：${routeHint}`,
    "- 推荐图示不是唯一合法写法；需要时仍可在同一 compose 里搭配必要的 Markdown / HTML 基础块",
    "- 不要另起一种作者围栏或新语法，只使用 garden compose",
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
    routeHint: "先写清两边各是什么、中间一项如何把两边接上，哪一块是重点",
    sources: [
      {file: "docs/handbook/components/compose.md", phrase: "三列并排，中间接起来"},
    ],
  },
  {
    name: "fan-out",
    label: "发散图",
    hint: "适合说明先到一处，再同时连到好几处",
    when: "先到一处，再同时连到好几处",
    whenNot: "没有真正的先到再分支时，不要画成发散",
    searchText: "发散图 先到再散开 先到一处 再散开 扇出 fan 一分多 汇合 分发",
    routeHint: "先写清谁先到谁，再同时连到哪几处，哪一处是重点",
    sources: [
      {file: "docs/handbook/components/compose.md", phrase: "先到一处，再散开"},
      {file: ".agents/skills/garden-compose/references/visual-selection.md", phrase: "一分多"},
    ],
  },
  {
    name: "layers",
    label: "分层图",
    hint: "适合说明自上而下的层次，不必按顺序走完",
    when: "自上而下的层次",
    whenNot: "层次不是自动变成必须按顺序走完的流程",
    searchText: "分层图 分层结构 自上而下分层 分层 层次 架构 layers",
    routeHint: "写出各层名称和哪些是重点，并说明是不是每次都按这个顺序走完",
    sources: [
      {file: "docs/handbook/components/compose.md", phrase: "自上而下分层"},
      {file: ".agents/skills/garden-compose/references/visual-selection.md", phrase: "包含或分层"},
    ],
  },
  {
    name: "facets",
    label: "并列图",
    hint: "适合说明一件事的几个方面，没有先后顺序",
    when: "一件事的几个方面，没有先后",
    whenNot: "没有先后就不要画成流程；没有同一条件的比较时，也不要画成对比图",
    searchText: "并列图 多个切面 并列 方面 等宽 卡片 facets 并列类别",
    routeHint: "列出各方面的短名和说明，并写明这几块有没有严格先后",
    sources: [
      {file: "docs/handbook/components/compose.md", phrase: "一件事的多个切面"},
      {file: ".agents/skills/garden-compose/references/visual-selection.md", phrase: "并列类别"},
    ],
  },
  {
    name: "two-row",
    label: "上下对照图",
    hint: "适合把背景过程和重点过程分行对照",
    when: "上面是背景过程，下面才是要讲的过程",
    whenNot: "不是在比两套过程、或其实是同一条件下的方案对比时，不要用这种分行对照",
    searchText: "上下对照图 上下两行对比 两行 上下 对比 背景 过程 two-row",
    routeHint: "写清上面的背景过程和下面的重点过程各自有哪些阶段，哪一行是重点",
    sources: [
      {file: "docs/handbook/components/compose.md", phrase: "上下两行对比"},
    ],
  },
  {
    name: "icon-rail",
    label: "图文列表",
    hint: "适合逐条说明互不依赖的内容",
    when: "一条条独立说明，用图标带出标题和正文",
    whenNot: "这些条目没有先后依赖，不要画成流程，也不要写成要照着做的清单",
    searchText: "图文列表 图标窄栏 独立条目 标题正文 图标 icon-rail",
    routeHint: "用图标带出一条条独立说明，标题和正文写在一起；这不是流程，不要加顺序箭头",
    sources: [
      {file: ".agents/skills/garden-compose/references/visual-selection.md", phrase: "图标窄栏、标题正文共左缘"},
      {file: ".agents/skills/garden-compose/references/layout-recipes.md", phrase: "图标窄栏 + 共用右栏的纵向条目"},
    ],
  },
  {
    name: "sequence",
    label: "流程图",
    hint: "适合说明一件事按什么顺序完成",
    when: "有明确先后的阶段",
    whenNot: "没有顺序的条目不要加箭头，也不要靠缩字硬撑手机横排",
    searchText: "流程图 顺序流程 短阶段 长阶段 从左到右 纵向 顺序链 sequence",
    routeHint: "只有原文明确顺序才用箭头。阶段短可以从左到右，阶段长或窄屏改为从上到下，不要靠缩字硬撑横排",
    sources: [
      {file: ".agents/skills/garden-compose/references/visual-selection.md", phrase: "短阶段从左到右"},
      {file: ".agents/skills/garden-compose/references/visual-selection.md", phrase: "长阶段或纵向顺序"},
    ],
  },
  {
    name: "steps",
    label: "分步图",
    hint: "适合一步步解释，步骤里可以展开细节",
    when: "一步步解释，并可展开细节",
    whenNot: "不是按比例表示时间，也不是让读者照着做的清单，更不是让读者逐步查看状态变化",
    searchText: "分步图 分步说明 分步解释 步骤 steps step",
    routeHint: "用分步图把顺序讲清楚，需要时在步骤里展开细节；不要把它写成待办清单或逐步演示，除非材料确实如此",
    sources: [
      {file: ".agents/skills/garden-compose/references/visual-selection.md", phrase: "分步解释"},
      {file: "docs/compose-catalog.md", phrase: "分步"},
    ],
  },
  {
    name: "compare",
    label: "对比图",
    hint: "适合比较两三种方案在同一条件下的差异",
    when: "两三种方案在同一条件下比较",
    whenNot: "只是罗列各自特点、没有共同条件时，用普通表格或并列图即可",
    searchText: "对比图 对照 比较 compare 方案 左右 同一条件",
    routeHint: "只在有真实共同条件时做对比，保留各方事实，不要发明输赢或排序",
    sources: [
      {file: "ui/prompt/recipes/compare.md", phrase: "配方：对照"},
      {file: ".agents/skills/garden-compose/references/visual-selection.md", phrase: "对照"},
    ],
  },
  {
    name: "timeline",
    label: "时间线图",
    hint: "适合按日期或时间点排列事件",
    when: "按日期或时间点排列事件",
    whenNot: "没有按时间比例展开的进度，不要画成带时长的甘特图",
    searchText: "时间线图 时间节点 日期 事件 时间线 timeline",
    routeHint: "按原文日期或时间点排列事件，保留顺序和日期；不要做成按时长比例的进度",
    sources: [
      {file: ".agents/skills/garden-compose/references/visual-selection.md", phrase: "时间节点"},
    ],
  },
  {
    name: "lanes",
    label: "时序图",
    hint: "适合说明谁在什么时候向谁发了什么",
    when: "谁在什么时候向谁发了什么",
    whenNot: "不是通用建模语言，也不支持任意分支、循环或自动布线",
    searchText: "时序图 交互时序 时序 泳道 lanes actor message 谁发给谁",
    routeHint: "按原文写出参与者和他们之间的消息方向与顺序，不要补出原文没有的分支或循环",
    sources: [
      {file: ".agents/skills/garden-compose/references/visual-selection.md", phrase: "交互时序"},
    ],
  },
  {
    name: "tabs",
    label: "选项卡",
    hint: "适合几组说明互相独立、一次只看一组",
    when: "几组说明互相独立，一次看一组",
    whenNot: "必须同时比较的事实不要藏进其他组，这不是应用导航",
    searchText: "选项卡 分组切换 tabs 面板 分组说明",
    routeHint: "只有各组说明可以分开看时才用选项卡；必须同时比较的内容不要藏起来",
    sources: [
      {file: ".agents/skills/garden-compose/references/visual-selection.md", phrase: "分组切换"},
    ],
  },
  {
    name: "chart",
    label: "数据图",
    hint: "适合把已有数字画成柱状、折线或占比",
    when: "已有一组测过或给定的数字，要让读者看清具体值",
    whenNot: "不要编造数据；结果可由公式随输入变化时，优先用参数调节图",
    searchText: "数据图 图表 chart 柱状 折线 饼图 实测 占比",
    routeHint: "只用材料里的真实数据做图，标明轴和单位；不要编造数值",
    sources: [
      {file: "docs/handbook/components/compose.md", phrase: "图表示例（play）"},
      {file: "ui/prompt/recipes/data-chart.md", phrase: "配方：数据图"},
      {file: ".agents/skills/garden-compose/references/visual-selection.md", phrase: "数据图"},
    ],
  },
  {
    name: "tunable",
    label: "参数调节图",
    hint: "适合让读者改一两个输入，看结果怎么变",
    when: "结果由一两个输入决定，读者会想换成别的值会怎样",
    whenNot: "只有一个固定例子要讲，或输入过多时先拆开；一个输入带动多项输出时用换算图",
    searchText: "参数调节图 可调参数 参数台 参数实验 拧参数 调节 slider param-bench tunable",
    routeHint: "写出可调的输入和随之变化的结论，默认状态就要能看懂；不要让作者去写程序",
    sources: [
      {file: "docs/handbook/components/compose.md", phrase: "可调参数（play）"},
      {file: "ui/prompt/recipes/param-bench.md", phrase: "配方：参数台"},
      {file: ".agents/skills/garden-compose/references/visual-selection.md", phrase: "参数实验"},
    ],
  },
  {
    name: "converter",
    label: "换算图",
    hint: "适合一个输入同时算出好几项结果",
    when: "一个输入同时算出好几项结果",
    whenNot: "只有一个结果时用参数调节图；各项要分别调时先拆开",
    searchText: "换算图 换算器 换算 converter 用料 成本 单位 人数",
    routeHint: "一个输入同时换算出多项结果，保留公式和单位，不要发明材料里没有的换算关系",
    sources: [
      {file: "ui/prompt/recipes/converter.md", phrase: "配方：换算器"},
    ],
  },
  {
    name: "code-walkthrough",
    label: "代码走查",
    hint: "适合一行行看代码执行到哪、变量是多少",
    when: "一段不长的代码值得一行行讲",
    whenNot: "只需要展示代码时用普通代码块；代码太长时先截关键段",
    searchText: "代码走查 代码 逐行 walkthrough 变量",
    routeHint: "对着不长的关键代码，讲清每一步执行到哪一行、变量此刻是多少，不要改写原文代码的事实",
    sources: [
      {file: "ui/prompt/recipes/code-walkthrough.md", phrase: "配方：代码走查"},
    ],
  },
  {
    name: "stepper",
    label: "逐步演示",
    hint: "适合让读者停在某一步，看状态怎么变",
    when: "过程中的状态会变，读者想停在某一步看哪里变了",
    whenNot: "只有两三个静态阶段时，用分步图或流程图即可",
    searchText: "逐步演示 步进器 步进 stepper 状态变化 再走一步 停在某一步",
    routeHint: "让读者按步查看状态如何变化；若只是静态阶段，改用分步图，不要做成逐步演示",
    sources: [
      {file: "ui/prompt/recipes/stepper.md", phrase: "配方：步进器"},
    ],
  },
  {
    name: "trace",
    label: "路径标注图",
    hint: "适合在已有流程或状态图上标出走到哪",
    when: "已有一张状态图或流程图，并且过程沿着它一步步走",
    whenNot: "只需要展示结构，或节点、连线过多时先拆开",
    searchText: "路径标注图 轨迹 状态图 走到哪 当前状态 trace",
    routeHint: "在已有状态图或流程上标出当前走到哪一步，不要发明原文没有的节点或转移",
    sources: [
      {file: "ui/prompt/recipes/trace.md", phrase: "配方：轨迹"},
    ],
  },
  {
    name: "plan",
    label: "步骤清单",
    hint: "适合读者照着一项项做，并回来查看进度",
    when: "步骤多、要跟着做，读者一边操作一边回来查看做到哪了",
    whenNot: "只是概念上的几个阶段时写列表或分步图；步骤之间要观察状态变化时用逐步演示",
    searchText: "步骤清单 计划与清单 清单 部署 排查 步骤 plan checklist",
    routeHint: "按读者会照着做的顺序列出清单，保留原文步骤，不要把概念阶段硬写成待办",
    sources: [
      {file: "ui/prompt/recipes/plan.md", phrase: "配方：计划与清单"},
    ],
  },
  {
    name: "inspect-grid",
    label: "格子图",
    hint: "适合标出二维结构里哪几格特别、为什么",
    when: "二维结构里要盯住某几格，并说明为什么特别",
    whenNot: "只是普通数据表、没有哪一格要特别解释时，用普通表格即可",
    searchText: "格子图 检视格 格子 矩阵 bitmap inspect-grid Attention 高亮",
    routeHint: "用格子呈现二维结构，并指出需要特别解释的格子及其原因；不要把普通表格硬做成格子图",
    sources: [
      {file: "ui/prompt/recipes/inspect-grid.md", phrase: "配方：检视格"},
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
  sources: [
    {file: ".agents/skills/garden-compose/references/composition-patterns.md", phrase: "无现成表示方式时"},
    {file: ".agents/skills/garden-compose/references/composition-patterns.md", phrase: "没有配方不是失败条件"},
  ],
};

function decorate(spec) {
  const open = Boolean(spec.open);
  const prompt = authorPrompt({label: spec.label, routeHint: spec.routeHint, open});
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

export function filterPickerItems(query, items=DIAGRAM_RECIPES) {
  const needle = String(query ?? "").trim().toLowerCase();
  if (!needle) return [...items];
  return items.filter((item) => {
    const hay = [item.name, item.label, item.hint, item.when, item.searchText].join("\n").toLowerCase();
    return hay.includes(needle);
  });
}

export function pickerSelectionResult(item, _typedText="") {
  return {
    insertText: item.body,
    prompt: item.prompt,
  };
}

export function recommendAuthorPrompt(item) {
  return item.prompt;
}
