/** Author-facing /garden picker. Labels follow the handbook and named recipes, not internal layout-route ids. */
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
      "请根据我提供的材料和表达目标，在统一的 garden compose 里自由组合任意 Markdown / HTML 以及已有的基础块，做成合适的说明图。",
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

export function copySuccessNotice(label) {
  return `已复制「${label}」推荐提示词。把材料与目标填进去后发给 AI 即可。`;
}

export function copyFailureNotice(label) {
  return `没能复制「${label}」推荐提示词，已保留你刚输入的内容，请再试一次或手动复制。`;
}

/**
 * Copy the recommended prompt first. Callers must not clear or replace the
 * author's /garden input until this resolves successfully.
 */
export async function copyPickerPrompt(item, {writeText, notifySuccess, notifyFailure, afterSuccess} = {}) {
  if (typeof writeText !== "function") throw new Error("copyPickerPrompt requires writeText");
  try {
    await writeText(item.prompt);
    notifySuccess?.(copySuccessNotice(item.label));
    await afterSuccess?.();
    return {ok: true};
  } catch {
    notifyFailure?.(copyFailureNotice(item.label));
    return {ok: false};
  }
}

/** Typora's sync apply must keep the typed trigger until copy succeeds. */
export function typoraKeepTypedText(typedText) {
  return typedText;
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
    label: "三列并排",
    hint: "几列并排，中间把两边接起来",
    when: "三列并排，中间接起来",
    whenNot: "没有中间连接关系时，不必强行加连接",
    searchText: "三列并排 中间接起来 列 连接 关系图 columns-join",
    routeHint: "按手册「三列并排，中间接起来」：先写清每列名称和中间如何把两边接上，哪一列是重点",
    sources: [
      {file: "docs/handbook/components/compose.md", phrase: "三列并排，中间接起来"},
    ],
  },
  {
    name: "fan-out",
    label: "先到再散开",
    hint: "先到一处，再同时连到几处",
    when: "先到一处，再散开",
    whenNot: "没有真正的先汇合再分支时，不要画成扇出",
    searchText: "先到一处 再散开 扇出 fan 一分多 汇合",
    routeHint: "按手册「先到一处，再散开」：先写清谁先到谁，再同时连到哪几处，哪一处是重点",
    sources: [
      {file: "docs/handbook/components/compose.md", phrase: "先到一处，再散开"},
      {file: ".agents/skills/garden-compose/references/visual-selection.md", phrase: "一分多"},
    ],
  },
  {
    name: "layers",
    label: "分层结构",
    hint: "自上而下的层次，不一定是流程",
    when: "自上而下分层",
    whenNot: "层次不是自动变成必须按顺序走完的流程",
    searchText: "自上而下分层 分层 层次 架构 layers",
    routeHint: "按手册「自上而下分层」：写出各层名称，哪些是重点，并说明是不是每次都按这个顺序走完",
    sources: [
      {file: "docs/handbook/components/compose.md", phrase: "自上而下分层"},
      {file: ".agents/skills/garden-compose/references/visual-selection.md", phrase: "包含或分层"},
    ],
  },
  {
    name: "facets",
    label: "多个切面",
    hint: "一件事的几个并列方面，没有强制顺序",
    when: "一件事的多个切面",
    whenNot: "没有先后就不要画成流程或对照表",
    searchText: "多个切面 并列 方面 等宽 卡片 facets 并列类别",
    routeHint: "按手册「一件事的多个切面」：列出各切面短名和说明，并写明这几块有没有严格先后",
    sources: [
      {file: "docs/handbook/components/compose.md", phrase: "一件事的多个切面"},
      {file: ".agents/skills/garden-compose/references/visual-selection.md", phrase: "并列类别"},
    ],
  },
  {
    name: "two-row",
    label: "上下两行对比",
    hint: "上面一行作背景，下面一行才是重点",
    when: "上下两行对比",
    whenNot: "不是同一组输入下的方案对照时，不要改成对照卡",
    searchText: "上下两行对比 两行 上下 对比 two-row",
    routeHint: "按手册「上下两行对比」：写清上下两行各自的顺序或阶段，哪一行是重点",
    sources: [
      {file: "docs/handbook/components/compose.md", phrase: "上下两行对比"},
    ],
  },
  {
    name: "icon-rail",
    label: "图标窄栏",
    hint: "左边图标，标题和正文共用右栏",
    when: "图标窄栏、标题正文共左缘",
    whenNot: "不把正文放在图标行外面，也不要画成流程",
    searchText: "图标窄栏 独立条目 标题正文 icon-rail",
    routeHint: "图标在左，标题和全部正文共用右侧左边界；这是独立说明条目，不是流程，不要加顺序箭头",
    sources: [
      {file: ".agents/skills/garden-compose/references/visual-selection.md", phrase: "图标窄栏、标题正文共左缘"},
      {file: ".agents/skills/garden-compose/references/layout-recipes.md", phrase: "图标窄栏 + 共用右栏的纵向条目"},
    ],
  },
  {
    name: "sequence",
    label: "顺序流程",
    hint: "有明确先后：短的可横排，长的改纵排",
    when: "短阶段从左到右，或长阶段纵向顺序",
    whenNot: "没有顺序的条目不要加箭头，也不要靠缩字硬撑手机横排",
    searchText: "顺序流程 短阶段 长阶段 从左到右 纵向 flow-row flow-stack 顺序链",
    routeHint: "只有原文明确顺序才用箭头。阶段短可用从左到右，阶段长或窄屏改为从上到下，不要靠缩字硬撑横排",
    sources: [
      {file: ".agents/skills/garden-compose/references/visual-selection.md", phrase: "短阶段从左到右"},
      {file: ".agents/skills/garden-compose/references/visual-selection.md", phrase: "长阶段或纵向顺序"},
    ],
  },
  {
    name: "steps",
    label: "分步说明",
    hint: "一步步解释，步骤里可以展开细节",
    when: "分步解释",
    whenNot: "不是按比例表示时间，也不是让读者逐步操作的清单",
    searchText: "分步说明 分步解释 步骤 steps step",
    routeHint: "用分步说明把顺序讲清楚，需要时在步骤里展开细节；不要把它写成计划清单或会动的步进器，除非材料确实如此",
    sources: [
      {file: ".agents/skills/garden-compose/references/visual-selection.md", phrase: "分步解释"},
      {file: "docs/compose-catalog.md", phrase: "分步"},
    ],
  },
  {
    name: "compare",
    label: "对照",
    hint: "两三种方案在同一组输入下对照",
    when: "两种做法只能上下翻着看，需要同时看见左边这样、右边那样",
    whenNot: "只是罗列各自特点、没有共同输入时，用普通表格或并列切面即可",
    searchText: "对照 比较 compare 方案 左右",
    routeHint: "只在有真实共同维度时做对照，保留各方事实，不要发明输赢或排序",
    sources: [
      {file: "ui/prompt/recipes/compare.md", phrase: "配方：对照"},
      {file: ".agents/skills/garden-compose/references/visual-selection.md", phrase: "对照"},
    ],
  },
  {
    name: "timeline",
    label: "时间节点",
    hint: "按日期或时间点排列事件",
    when: "Dated events / 时间节点",
    whenNot: "没有按时间比例展开的时间轴，不要画成带时长的甘特图",
    searchText: "时间节点 日期 事件 时间线 timeline",
    routeHint: "按原文日期或时间点排列事件，保留顺序和日期；不要做成按时长比例的时间轴",
    sources: [
      {file: ".agents/skills/garden-compose/references/visual-selection.md", phrase: "时间节点"},
    ],
  },
  {
    name: "lanes",
    label: "交互时序",
    hint: "谁在什么时候向谁发了什么",
    when: "Who sends what to whom / 交互时序",
    whenNot: "不是通用 UML，也不支持任意分支、循环或自动布线",
    searchText: "交互时序 时序 泳道 lanes actor message 谁发给谁",
    routeHint: "按原文写出参与者和他们之间的消息方向与顺序，不要补出原文没有的分支或循环",
    sources: [
      {file: ".agents/skills/garden-compose/references/visual-selection.md", phrase: "交互时序"},
    ],
  },
  {
    name: "tabs",
    label: "分组切换",
    hint: "几组互相独立的说明，一次看一组",
    when: "Alternate independent explanations / 分组切换",
    whenNot: "必须同时对照的事实不要藏进其他面板，也不是应用导航",
    searchText: "分组切换 选项卡 tabs 面板",
    routeHint: "只有各组说明可以分开看时才用分组切换；必须同时比较的内容不要藏起来",
    sources: [
      {file: ".agents/skills/garden-compose/references/visual-selection.md", phrase: "分组切换"},
    ],
  },
  {
    name: "chart",
    label: "数据图",
    hint: "用实测或给定数据画柱状、折线或占比",
    when: "测出来的数字被贴成一张截图，读者看不清具体值",
    whenNot: "不要编造数据；可由公式算出的变化优先用可调参数",
    searchText: "数据图 图表 chart 柱状 折线 饼图 实测",
    routeHint: "只用材料里的真实数据做图，标明轴和单位；不要编造数值，也不要把静态关系图当成图表 API",
    sources: [
      {file: "docs/handbook/components/compose.md", phrase: "图表示例（play）"},
      {file: "ui/prompt/recipes/data-chart.md", phrase: "配方：数据图"},
      {file: ".agents/skills/garden-compose/references/visual-selection.md", phrase: "数据图"},
    ],
  },
  {
    name: "tunable",
    label: "可调参数",
    hint: "让读者拧一两个输入，看结论怎么变",
    when: "结果由一两个输入决定，读者会好奇换成别的值会怎样",
    whenNot: "只有一个固定例子要讲，或输入过多时先拆开；一个输入驱动多个输出时用换算器",
    searchText: "可调参数 参数台 参数实验 play slider param-bench 拧参数",
    routeHint: "用统一的 garden compose 写出可调输入和随之变化的结论，默认状态就要能看懂；不要让作者去写任意 JavaScript",
    sources: [
      {file: "docs/handbook/components/compose.md", phrase: "可调参数（play）"},
      {file: "ui/prompt/recipes/param-bench.md", phrase: "配方：参数台"},
      {file: ".agents/skills/garden-compose/references/visual-selection.md", phrase: "参数实验"},
    ],
  },
  {
    name: "converter",
    label: "换算器",
    hint: "一个输入带动好几项输出一起变",
    when: "一个输入驱动好几个输出",
    whenNot: "只有一个输出时用可调参数；输出要分别调时先拆块",
    searchText: "换算器 换算 converter 用料 成本 单位",
    routeHint: "一个输入同时换算出多项输出，保留公式和单位，不要发明材料里没有的换算关系",
    sources: [
      {file: "ui/prompt/recipes/converter.md", phrase: "配方：换算器"},
    ],
  },
  {
    name: "code-walkthrough",
    label: "代码走查",
    hint: "一行行看代码执行到哪、变量是多少",
    when: "一段不长的代码值得一行行讲",
    whenNot: "只需要展示代码时用普通代码块；代码太长时先截关键段",
    searchText: "代码走查 代码 逐行 walkthrough",
    routeHint: "对着不长的关键代码，讲清每一步执行到哪一行、变量此刻是多少，不要改写原文代码的事实",
    sources: [
      {file: "ui/prompt/recipes/code-walkthrough.md", phrase: "配方：代码走查"},
    ],
  },
  {
    name: "stepper",
    label: "步进器",
    hint: "过程会随步骤改变状态，读者可以停在某一步",
    when: "状态随时间变化，读者想停在某一步看哪里变了",
    whenNot: "只有两三个静态阶段时，用分步说明或顺序流程即可",
    searchText: "步进器 步进 stepper 状态变化 再走一步",
    routeHint: "让读者按步查看状态如何变化；若只是静态阶段，改用分步说明，不要做成会动的步进器",
    sources: [
      {file: "ui/prompt/recipes/stepper.md", phrase: "配方：步进器"},
    ],
  },
  {
    name: "trace",
    label: "轨迹",
    hint: "在已有状态图或流程上标出此刻走到哪",
    when: "有一张明确的状态图或流程图，并且过程沿着它一步步走",
    whenNot: "只需要展示拓扑，或节点边数过多时先拆开",
    searchText: "轨迹 状态图 走到哪 trace",
    routeHint: "在已有状态图或流程上标出当前走到哪一步，不要发明原文没有的节点或转移",
    sources: [
      {file: "ui/prompt/recipes/trace.md", phrase: "配方：轨迹"},
    ],
  },
  {
    name: "plan",
    label: "计划与清单",
    hint: "读者会照着一项项做的步骤或排查清单",
    when: "步骤多、要跟着做，读者一边操作一边回来找做到哪了",
    whenNot: "只是概念上的几个阶段时写列表或分步说明；步骤之间要观察状态变化时用步进器",
    searchText: "计划与清单 清单 部署 排查 步骤 plan checklist",
    routeHint: "按读者会照着做的顺序列出清单，保留原文步骤，不要把概念阶段硬写成待办",
    sources: [
      {file: "ui/prompt/recipes/plan.md", phrase: "配方：计划与清单"},
    ],
  },
  {
    name: "inspect-grid",
    label: "检视格",
    hint: "二维格子里要盯住某几格，并说明为什么特别",
    when: "读者需要盯着某几格看，并且知道这一格为什么特别",
    whenNot: "只是普通数据表、没有哪一格要特别解释时，用 Markdown 表格即可",
    searchText: "检视格 格子 矩阵 bitmap inspect-grid Attention",
    routeHint: "用格子呈现二维结构，并指出需要特别解释的格子及其原因；不要把普通表格硬做成检视格",
    sources: [
      {file: "ui/prompt/recipes/inspect-grid.md", phrase: "配方：检视格"},
    ],
  },
];

const OTHER = {
  name: "other",
  label: "其他",
  hint: "自由组合 Markdown / HTML 基础块",
  when: "没有现成图示时，在统一 Compose 里自由组合任意 Markdown / HTML 与基础块",
  whenNot: "不要把内置图示当成合法白名单，也不要为此学习新语法",
  searchText: "其他 other 任意 灵活 开放 组合 自由组合 无现成 markdown html 基础块",
  open: true,
  sources: [
    {file: ".agents/skills/garden-compose/references/composition-patterns.md", phrase: "无现成表示方式时"},
    {file: ".agents/skills/garden-compose/references/composition-patterns.md", phrase: "没有配方不是失败条件"},
  ],
};

function decorate(spec) {
  const open = Boolean(spec.open);
  const prompt = authorPrompt({label: spec.label, routeHint: spec.routeHint, open});
  const intent = open
    ? "按材料和表达目标，在 Compose 内自由组合 Markdown / HTML 与基础块。材料与目标：（在此填写，或把已复制的推荐提示词发给 AI）"
    : `用「${spec.label}」呈现以下材料。材料与目标：（在此填写，或把已复制的推荐提示词发给 AI）`;
  return {
    name: spec.name,
    label: spec.label,
    hint: spec.hint,
    when: spec.when,
    whenNot: spec.whenNot,
    searchText: spec.searchText,
    preview: PREVIEW[spec.name],
    prompt,
    body: intentFence(intent),
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

export function pickerSelectionResult(item, typedText="") {
  return {
    insertText: typoraKeepTypedText(typedText),
    prompt: item.prompt,
    notice: copySuccessNotice(item.label),
    failureNotice: copyFailureNotice(item.label),
  };
}

export function recommendAuthorPrompt(item) {
  return item.prompt;
}
