export const CATALOG_VERSION = 1;

export const TONES = ["plain", "accent", "muted", "new", "cached", "waste", "same"];
export const TONE_LABELS = {
  plain: "",
  accent: "重点",
  muted: "次要",
  new: "新算",
  cached: "读缓存",
  waste: "浪费",
  same: "相同",
};

export const GROUPS = ["状态与逻辑", "布局", "输入", "展示", "数据", "媒体与代码"];

const tone = (values = TONES) => ({ type: "enum", values });

const SERIES_PROPS = {
  y: { type: "any", required: true, desc: "纵轴值。函数模式下在每个取样点重算；数据模式下逐行求值" },
  label: { type: "string", desc: "系列名，显示在图例和提示框里" },
  tone: { ...tone(), desc: "颜色" },
  format: { type: "format", desc: "数值格式" },
};

/**
 * Children rules:
 * - "none": no children
 * - "content": Markdown and display/input components
 * - "text": inline text and interpolation only
 * - "transparent": validated against the parent's rule
 * - string[]: only these components
 */
export const COMPONENTS = {
  State: {
    group: "状态与逻辑",
    phase: 1,
    kind: "state",
    summary: "声明会变的量和默认值，不渲染任何东西",
    phrases: ["可调的值", "默认是"],
    props: {},
    children: "none",
    example: "<State batch={1} seq={4096} />",
  },
  Let: {
    group: "状态与逻辑",
    phase: 1,
    kind: "let",
    summary: "声明由别的量算出来的值，也用来写数据数组",
    phrases: ["公式是", "等于"],
    props: {},
    children: "none",
    example: "<Let mem={2 * 32 * 8 * 128 * seq * batch * 2} />",
  },
  If: {
    group: "状态与逻辑",
    phase: 1,
    summary: "条件为真时渲染里面的内容",
    phrases: ["只有……时才显示"],
    props: { test: { type: "any", required: true, desc: "按真值判断" } },
    children: "transparent",
    example: "<If test={batch > 8}>batch 太大时显存会吃满。</If>",
  },
  Each: {
    group: "状态与逻辑",
    phase: 1,
    summary: "对数组里的每一项重复渲染里面的内容",
    phrases: ["每一项一行", "逐个列出"],
    props: {
      of: { type: "array", required: true, desc: "要遍历的数组，最多 200 项" },
      as: { type: "name", literal: true, required: true, desc: "当前项的名字" },
      index: { type: "name", literal: true, desc: "从 0 开始的序号名" },
    },
    children: "transparent",
    example: "<Each of={range(0, 3)} as=\"i\">第 {i + 1} 项。</Each>",
  },
  Stack: {
    group: "布局",
    phase: 1,
    summary: "上下或横排，用来调整间距",
    phrases: ["上下排", "横排放", "一组"],
    props: {
      gap: { type: "gap", default: 3, desc: "间距，0–4" },
      direction: { type: "enum", values: ["col", "row"], literal: true, default: "col", desc: "col 上下排，row 横排并可换行" },
    },
    children: "content",
    example: "<Stack gap={1}>第一行。\n\n第二行。</Stack>",
  },
  Columns: {
    group: "布局",
    phase: 1,
    summary: "自动换行的多列，窄屏自动叠放",
    phrases: ["并排放", "左右对比", "两栏"],
    props: {
      gap: { type: "gap", default: 3, desc: "列间距，0–4" },
      min: { type: "number", min: 160, max: 400, default: 220, desc: "每列最小宽度（px）" },
    },
    children: "content",
    maxChildren: 4,
    example: "<Columns>\n  <Card title=\"A\">左边</Card>\n  <Card title=\"B\">右边</Card>\n</Columns>",
  },
  Card: {
    group: "布局",
    phase: 1,
    summary: "带边框的分组",
    phrases: ["一边一个框", "分组"],
    props: {
      title: { type: "string", desc: "卡片标题" },
      tone: { ...tone(["plain", "accent", "muted"]), default: "plain", desc: "边框和标题颜色" },
    },
    children: "content",
    example: "<Card title=\"RwLock\" tone=\"accent\">读者可以一起读。</Card>",
  },
  Tabs: {
    group: "布局",
    phase: 1,
    summary: "标签切换，几个视角轮流看",
    phrases: ["切换着看", "分几个视角"],
    props: { bind: { type: "stateName", literal: true, stateType: "number", desc: "当前标签序号（从 0 开始）" } },
    children: ["Tab"],
    minChildren: 2,
    maxChildren: 6,
    example: "<Tabs>\n  <Tab title=\"MHA\">每个头一组 K/V。</Tab>\n  <Tab title=\"GQA\">几个头共用一组 K/V。</Tab>\n</Tabs>",
  },
  Tab: {
    group: "布局",
    phase: 1,
    summary: "Tabs 里的一页",
    phrases: [],
    props: { title: { type: "string", required: true, desc: "标签文字" } },
    children: "content",
    parents: ["Tabs"],
    example: "<Tab title=\"MHA\">每个头一组 K/V。</Tab>",
  },
  Steps: {
    group: "布局",
    phase: 1,
    summary: "一步一步看，带上一步、下一步和进度",
    phrases: ["一步步走", "停在某一步", "第几拍"],
    props: {
      bind: { type: "stateName", literal: true, stateType: "number", desc: "当前步序号（从 0 开始）" },
      autoplay: { type: "autoplay", literal: true, default: false, desc: "自动前进的毫秒间隔（≥ 800），默认不自动" },
    },
    children: ["Step"],
    minChildren: 2,
    maxChildren: 24,
    example: "<Steps>\n  <Step title=\"Prefill\">一次写满 K/V。</Step>\n  <Step title=\"Decode\">每步追加一行。</Step>\n</Steps>",
  },
  Step: {
    group: "布局",
    phase: 1,
    summary: "Steps 里的一步",
    phrases: [],
    props: { title: { type: "string", required: true, desc: "这一步的名字" } },
    children: "content",
    parents: ["Steps"],
    example: "<Step title=\"Prefill\">一次写满 K/V。</Step>",
  },
  Slider: {
    group: "输入",
    phase: 1,
    summary: "拖动改一个数",
    phrases: ["拧", "调", "拖一下", "从 1 到 32"],
    props: {
      bind: { type: "stateName", literal: true, required: true, stateType: "number", desc: "绑定的状态" },
      label: { type: "string", required: true, desc: "名字" },
      min: { type: "number", required: true, desc: "最小值" },
      max: { type: "number", required: true, desc: "最大值，必须大于 min" },
      step: { type: "number", desc: "线性刻度的步长" },
      scale: { type: "enum", values: ["linear", "log"], literal: true, default: "linear", desc: "刻度；log 要求 min > 0" },
      snap: { type: "enum", values: ["none", "int", "pow2"], literal: true, desc: "对数刻度的取值方式" },
      format: { type: "format", desc: "当前值的格式" },
      unit: { type: "string", desc: "跟在值后面的单位" },
    },
    children: "none",
    example: "<Slider bind=\"batch\" label=\"batch\" min={1} max={32} />",
  },
  Choice: {
    group: "输入",
    phase: 1,
    summary: "从几个选项里选一个",
    phrases: ["选一种", "在 A 和 B 之间切换"],
    props: {
      bind: { type: "stateName", literal: true, required: true, desc: "绑定的状态" },
      label: { type: "string", required: true, desc: "名字" },
      options: { type: "array", required: true, desc: "2–8 项；数字、字符串或 { value, label }" },
      style: { type: "enum", values: ["segmented", "select"], literal: true, desc: "分段按钮或下拉" },
    },
    children: "none",
    example: "<Choice bind=\"mode\" label=\"模式\" options={[\"ECB\", \"CBC\"]} />",
  },
  Toggle: {
    group: "输入",
    phase: 1,
    summary: "开或关",
    phrases: ["打开 / 关掉", "加上故障", "切换开关"],
    props: {
      bind: { type: "stateName", literal: true, required: true, stateType: "boolean", desc: "绑定的布尔状态" },
      label: { type: "string", required: true, desc: "名字" },
    },
    children: "none",
    example: "<Toggle bind=\"fault\" label=\"注入故障\" />",
  },
  Button: {
    group: "输入",
    phase: 1,
    summary: "点一下改状态或重置",
    phrases: ["重置", "再来一次"],
    props: {
      set: { type: "object", desc: "键是状态名，值是新值" },
      reset: { type: "boolean", desc: "所有状态回到默认值" },
      tone: { ...tone(["plain", "accent"]), default: "plain", desc: "颜色" },
    },
    children: "text",
    example: "<Button reset>重置</Button>",
  },
  Stepper: {
    group: "输入",
    phase: 1,
    summary: "加减人数或数量，数字写在两个圆钮中间",
    phrases: ["人数可加减", "用加减号调数量"],
    props: {
      bind: { type: "stateName", literal: true, stateType: "number", required: true, desc: "要加减的数字状态" },
      min: { type: "number", required: true, desc: "最小值" },
      max: { type: "number", required: true, desc: "最大值" },
      step: { type: "number", min: 0, default: 1, desc: "每次加减多少" },
      label: { type: "string", desc: "上方的小字，如人数" },
      unit: { type: "string", desc: "数字旁边的单位" },
    },
    children: "none",
    example: "<Stepper bind=\"guests\" label=\"人数\" min={1} max={12} unit=\"人\" />",
  },
  Checklist: {
    group: "输入",
    phase: 1,
    summary: "可勾选的清单，勾选状态不能绑定",
    phrases: ["清单", "一步步勾掉", "待办"],
    props: {
      items: { type: "array", required: true, desc: "1–30 项；字符串或 { title, note, time }" },
      title: { type: "string", desc: "清单标题" },
    },
    children: "none",
    example: "<Checklist items={[\"备料\", \"开火\", \"装盘\"]} />",
  },
  Stat: {
    group: "展示",
    phase: 1,
    summary: "一个醒目的数字",
    phrases: ["显示结果", "算出来是多少"],
    props: {
      label: { type: "string", required: true, desc: "名字" },
      value: { type: "any", required: true, desc: "数值或文字" },
      format: { type: "format", desc: "格式" },
      unit: { type: "string", desc: "单位" },
      hint: { type: "any", desc: "数字下面的一行小字" },
      tone: { ...tone(["plain", "accent", "new"]), default: "plain", desc: "数字的颜色" },
      size: { type: "enum", values: ["sm", "md", "lg"], default: "md", desc: "大小" },
    },
    children: "none",
    example: "<Stat label=\"KV 显存\" value={mem} format=\"bytes\" />",
  },
  Meter: {
    group: "展示",
    phase: 1,
    summary: "条形占比，可以分段显示构成",
    phrases: ["占了多少", "和上限比一比", "构成"],
    props: {
      max: { type: "number", required: true, desc: "满格对应的值" },
      value: { type: "number", desc: "当前值；与 parts 二选一" },
      parts: { type: "array", desc: "分段 { label, value, tone }，最多 5 段" },
      label: { type: "string", desc: "名字" },
      format: { type: "format", desc: "格式" },
      tone: { ...tone(), default: "accent", desc: "只有 value 时的填充色" },
    },
    children: "none",
    example: "<Meter label=\"显卡\" value={mem} max={80 * 1073741824} format=\"bytes\" />",
  },
  Caption: {
    group: "展示",
    phase: 1,
    summary: "卡片里的灰色说明，比正文小一号",
    phrases: ["补一句说明", "注明口径"],
    props: {},
    children: "text",
    example: "<Caption>统计期为 2024 年 8 月至 2025 年 8 月。</Caption>",
  },
  Divider: {
    group: "展示",
    phase: 1,
    summary: "一条细分隔线",
    phrases: ["下面隔开"],
    props: {},
    children: "none",
    example: "<Divider />",
  },
  Cite: {
    group: "展示",
    phase: 1,
    inline: true,
    summary: "来源胶囊，带站点图标",
    phrases: ["注明来源", "出处是"],
    props: {
      label: { type: "string", required: true, desc: "来源名" },
      href: { type: "string", desc: "来源链接。写了网址才会显示图标" },
    },
    children: "none",
    example: "<Cite label=\"Alibaba Group\" href=\"https://www.alibabagroup.com\" />",
  },
  Badge: {
    group: "展示",
    phase: 1,
    inline: true,
    summary: "小标签，可以写在句子中间",
    phrases: ["标一下", "打个标记"],
    props: { tone: { ...tone(), default: "muted", desc: "颜色" } },
    children: "text",
    example: "<Badge tone=\"new\">新算</Badge>",
  },
  Table: {
    group: "展示",
    phase: 1,
    summary: "数据表，行来自 Row 或 data",
    phrases: ["列个表", "对照表", "换算表"],
    props: {
      columns: { type: "array", required: true, desc: "表头字符串，或 { label, key, format, align }" },
      data: { type: "array", desc: "数据模式：每个元素是一行对象" },
      rowTone: { type: "any", rowScope: true, desc: "数据模式下逐行求值，返回 tone 或 null" },
    },
    children: ["Row"],
    maxChildren: 50,
    example: "<Table columns={[\"人数\", \"羊腿\"]}>\n  <Row cells={[6, \"2.4 kg\"]} />\n</Table>",
  },
  Grid: {
    group: "展示",
    phase: 1,
    summary: "检视格：点一格读这一格的说明",
    phrases: ["格子", "矩阵", "点一格看", "哪些是重复的"],
    props: {
      cols: { type: "array", required: true, desc: "列头，最多 16 列" },
      legend: { type: "object", desc: "键是 tone，值是说明" },
    },
    children: ["Row"],
    minChildren: 1,
    maxChildren: 16,
    example: "<Grid cols={[\"块1\", \"块2\"]}>\n  <Row label=\"密文\" cells={[\"X\", \"X\"]} tones=\"same\" />\n</Grid>",
  },
  Row: {
    group: "展示",
    phase: 1,
    summary: "Table 或 Grid 里的一行",
    phrases: [],
    props: {
      cells: { type: "array", required: true, desc: "长度等于列数" },
      label: { type: "any", desc: "行头" },
      tones: { type: "any", desc: "一个 tone 作用于整行，或与 cells 对齐的数组" },
      notes: { type: "array", desc: "与 cells 对齐的说明" },
    },
    children: "none",
    parents: ["Table", "Grid"],
    example: "<Row label=\"明文\" cells={[\"A\", \"B\"]} />",
  },
  Chart: {
    group: "展示",
    phase: 1,
    summary: "曲线和柱状图；sweep 画函数，data 画数据",
    phrases: ["画条曲线", "随 x 变化", "柱状图", "把数据画出来"],
    props: {
      sweep: { type: "stateName", literal: true, stateType: "number", desc: "函数模式：横轴扫过的状态" },
      data: { type: "array", desc: "数据模式：每个元素是一行对象" },
      x: { type: "any", rowScope: true, desc: "数据模式的横轴，逐行求值" },
      from: { type: "number", desc: "函数模式的起点" },
      to: { type: "number", desc: "函数模式的终点" },
      scale: { type: "enum", values: ["linear", "log"], literal: true, desc: "横轴刻度" },
      samples: { type: "number", literal: true, min: 2, max: 200, default: 64, desc: "函数模式取样点数" },
      yScale: { type: "enum", values: ["linear", "log"], default: "linear", desc: "纵轴刻度" },
      yMin: { type: "number", desc: "纵轴下限" },
      yMax: { type: "number", desc: "纵轴上限" },
      xLabel: { type: "string", desc: "横轴名" },
      yLabel: { type: "string", desc: "纵轴名" },
      xFormat: { type: "format", desc: "横轴刻度格式" },
      yFormat: { type: "format", desc: "纵轴刻度格式" },
      height: { type: "number", min: 120, max: 480, default: 200, desc: "高度（px）" },
    },
    children: ["Line", "Area", "Bar", "Point"],
    minChildren: 1,
    maxChildren: 4,
    example: "<Chart sweep=\"seq\">\n  <Line y={mem} format=\"bytes\" />\n</Chart>",
  },
  Line: { group: "展示", phase: 1, summary: "折线系列", phrases: [], props: SERIES_PROPS, children: "none", parents: ["Chart"], rowScopeProps: ["y"], example: "<Line y={mem} />" },
  Area: { group: "展示", phase: 1, summary: "面积系列", phrases: [], props: SERIES_PROPS, children: "none", parents: ["Chart"], rowScopeProps: ["y"], example: "<Area y={mem} />" },
  Bar: { group: "展示", phase: 1, summary: "柱状系列，只用于数据模式", phrases: [], props: SERIES_PROPS, children: "none", parents: ["Chart"], rowScopeProps: ["y"], example: "<Bar y={qps} />" },
  Point: { group: "展示", phase: 1, summary: "散点系列，只用于数据模式", phrases: [], props: SERIES_PROPS, children: "none", parents: ["Chart"], rowScopeProps: ["y"], example: "<Point y={latency} />" },
  Pie: {
    group: "展示",
    phase: 1,
    summary: "圆环图，用来看占比",
    phrases: ["画个圆环", "看各项占比"],
    props: { title: { type: "string", desc: "图题" } },
    children: ["Slice"],
    minChildren: 1,
    maxChildren: 8,
    example: "<Pie title=\"收入结构\">\n  <Slice label=\"商品销售\" value={78} />\n  <Slice label=\"平台服务\" value={22} />\n</Pie>",
  },
  Slice: {
    group: "展示",
    phase: 1,
    summary: "圆环的一块",
    phrases: [],
    props: {
      label: { type: "string", required: true, desc: "这一块的名字" },
      value: { type: "number", required: true, min: 0, desc: "数值，按占比计算" },
    },
    children: "none",
    parents: ["Pie"],
    example: "<Slice label=\"商品销售\" value={78} />",
  },
  Data: {
    group: "数据",
    phase: 2,
    kind: "data",
    summary: "引用同名目录里已有的 CSV / JSON 文件",
    phrases: ["数据在 xxx.csv 里"],
    props: {
      name: { type: "name", literal: true, required: true, desc: "引用时的名字" },
      src: { type: "string", literal: true, required: true, desc: "同名目录里的 .csv 或 .json" },
    },
    children: "none",
    example: "<Data name=\"bench\" src=\"./redis-bench/bench.csv\" />",
  },
  Image: {
    group: "媒体与代码",
    phase: 6,
    summary: "带热点的插图",
    phrases: ["在图上标出各部分", "点图上的部位看说明"],
    props: {
      src: { type: "string", literal: true, required: true, desc: "同名目录里的图片" },
      alt: { type: "string", required: true, desc: "图片说明" },
      ratio: { type: "string", desc: "宽高比，如 4:3" },
    },
    children: ["Hotspot"],
    maxChildren: 12,
    example: "<Image src=\"./bike/bike.png\" alt=\"自行车\">\n  <Hotspot x={0.3} y={0.6} title=\"车架\">两个三角形。</Hotspot>\n</Image>",
  },
  Hotspot: {
    group: "媒体与代码",
    phase: 6,
    summary: "Image 上的一个热点",
    phrases: [],
    props: {
      x: { type: "number", required: true, min: 0, max: 1, desc: "相对宽度的位置" },
      y: { type: "number", required: true, min: 0, max: 1, desc: "相对高度的位置" },
      title: { type: "string", required: true, desc: "名字" },
    },
    children: "content",
    parents: ["Image"],
    example: "<Hotspot x={0.3} y={0.6} title=\"车架\">两个三角形。</Hotspot>",
  },
  Code: {
    group: "媒体与代码",
    phase: 6,
    summary: "代码走查，高亮的行随状态变化",
    phrases: ["一行行讲这段代码", "执行到哪一行"],
    props: {
      lang: { type: "string", required: true, desc: "语言名" },
      code: { type: "string", required: true, desc: "代码原文，不超过 60 行" },
      highlight: { type: "any", desc: "要高亮的行，如 \"3-5,8\"" },
    },
    children: "none",
    example: "<Code lang=\"go\" highlight=\"2\" code={`a := 1\nb := a + 1`} />",
  },
  Diagram: {
    group: "媒体与代码",
    phase: 6,
    summary: "Mermaid 状态图，高亮当前节点和边",
    phrases: ["状态机", "沿着流程图走", "现在在哪个状态"],
    props: {
      mermaid: { type: "string", required: true, desc: "Mermaid 源码（graph / flowchart / stateDiagram）" },
      highlight: { type: "array", desc: "要高亮的节点 id" },
      edges: { type: "array", desc: "要高亮的边，写成 from->to" },
    },
    children: "none",
    example: "<Diagram highlight={[\"a\"]} mermaid={`graph LR\n  a --> b`} />",
  },
};

export const COMPONENT_NAMES = Object.keys(COMPONENTS);

/** JSON description for editor plugins and `garden ui schema`. */
export function catalogSchema() {
  return {
    version: CATALOG_VERSION,
    tones: TONES,
    components: Object.fromEntries(
      Object.entries(COMPONENTS).map(([name, spec]) => [
        name,
        {
          group: spec.group,
          phase: spec.phase,
          summary: spec.summary,
          phrases: spec.phrases,
          props: spec.props,
          children: spec.children,
          parents: spec.parents ?? null,
          example: spec.example,
        },
      ]),
    ),
  };
}

/** Markdown reference that `garden ui prompt` inserts between rules and recipes. */
export function catalogReference() {
  const lines = ["## 组件参考", ""];
  for (const group of GROUPS) {
    lines.push(`### ${group}`, "");
    for (const [name, spec] of Object.entries(COMPONENTS)) {
      if (spec.group !== group) continue;
      const parents = spec.parents ? `（只能放在 ${spec.parents.join(" / ")} 里）` : "";
      lines.push(`#### ${name}${parents}`, "", spec.summary + (spec.phase > 1 ? `。阶段 ${spec.phase} 起可用` : ""), "");
      if (spec.kind === "state") lines.push("- 任意名字={字面量}：状态名和默认值（数字、字符串或布尔）");
      if (spec.kind === "let") lines.push("- 任意名字={表达式}：派生值");
      for (const [prop, propSpec] of Object.entries(spec.props)) {
        const flags = [propSpec.required ? "必填" : null, propSpec.literal ? "字面量" : null]
          .filter(Boolean)
          .join("，");
        const values = propSpec.values ? `：${propSpec.values.join(" / ")}` : "";
        const fallback = propSpec.default !== undefined ? `，默认 ${JSON.stringify(propSpec.default)}` : "";
        lines.push(`- \`${prop}\`${flags ? `（${flags}）` : ""}${values}：${propSpec.desc ?? ""}${fallback}`);
      }
      const children = Array.isArray(spec.children)
        ? `子元素：只能是 ${spec.children.join(" / ")}`
        : { none: "没有子元素", content: "子元素：正文和组件", text: "子元素：一段文字", transparent: "子元素：按所在位置的规则" }[spec.children];
      lines.push(`- ${children}`, "", "```text", spec.example, "```", "");
    }
  }
  return lines.join("\n");
}
