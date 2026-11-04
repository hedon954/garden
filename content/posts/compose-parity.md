---
title: Compose 与 ChatGPT Intelligent UI 能力验收表
description: 逐项对齐 ChatGPT Intelligent UI（DIL）内建组件、连接方式与运行时能力，持续跟踪 Garden Compose 的实现进度。
date: 2026-11-04
tags:
  - Garden
  - compose
---

本页是 Garden Compose 对齐 ChatGPT Intelligent UI（底层 DIL 协议）的**长期验收表**，仅作为 tip 内部点验，不进入公开的 `/garden/` 用户说明书。单张整图并排对照见 [说明图对照](/blog/compose-compare)。

- **第二列（ChatGPT 渲染效果）图片来源**：基于 [OpenUI 对 GPT-6 Intelligent UI 的抓包拆解](https://www.openui.com/blog/how-chatgpt-intelligent-ui-works) 与 [Disdjj/intelligent-ui-demo ANALYSIS.md](https://github.com/Disdjj/intelligent-ui-demo/blob/main/ANALYSIS.md)（协议版本 14）整理的静态 DIL 对照渲染，以及少量在 ChatGPT 图例中出现的连接结构。
- **第四列（我们的效果图）图片来源**：在同一 tip 上由当前 `ui/compose/` 真实编译渲染后截图（Claude 博文纸色底面 `--paper` + 透明线框卡片）。
- **统计总览**：共 **30** 行；**已实现 18 行**（含专用连接与结构原语），**部分实现 3 行**，**未实现 9 行**（交互控件、内建表格/饼图、宿主卡片、动态脚本与流式修复）。
- **最后四行说明**：表末四行（`{@body}`、`{expr}`、`{#if}/{#each}`、`recoveryDiagnostics`）是 ChatGPT 对话运行时的动态特性（状态求值、模板分支、流式截断恢复），第二列用前后双帧静态演示展示它们在界面上的真实渲染变化；Garden 博客 `compose` 目前保持构建期一次性静态渲染（one-shot），暂未引入 Worker 脚本与流式运行时。

## 逐项验收总表

| ChatGPT 支持的组件 / 链接方式 | ChatGPT 的渲染效果截图 | 我们是否已经实现 | 我们的效果图（tip 实测） |
| :--- | :--- | :--- | :--- |
| **`text`（正文叶子）**<br>段落或列表项转成的文本节点，内含 `**bold**`、`*em*`、`` `code` `` 行内结构。 | ![DIL text 静态对照](./compose-parity/gpt-text.png) | **是**<br>Markdown 段落直接编译为 `text` 节点，或显式写 `<text tone="plain\|muted" align="start\|center">`。 | ![Garden Compose text](./compose-parity/our-text.png) |
| **`title`（标题叶子）**<br>块或卡片的主标题，在抓包统计中高频出现（`size="sm\|md\|lg"`）。 | ![DIL title 静态对照](./compose-parity/gpt-title.png) | **是**<br>Markdown `# / ## / ###` 标题或 `<title align="start\|center">`。 | ![Garden Compose title](./compose-parity/our-title.png) |
| **`caption`（底部弱化说明）**<br>图底或卡片内的辅助小字说明。 | ![DIL caption 静态对照](./compose-parity/gpt-caption.png) | **是**<br>用 `<text tone="muted">` 表达同级辅助说明与图底注脚。 | ![Garden Compose muted text](./compose-parity/our-caption.png) |
| **`badge`（徽章标签）**<br>圆角小标签，常用于标记状态、编号或上下文芯片。 | ![DIL badge 静态对照](./compose-parity/gpt-badge.png) | **是**<br>`<badge tone="accent\|tip\|muted\|plain">`，可独立并排或放进 `<box>` 头部。 | ![Garden Compose badge](./compose-parity/our-badge.png) |
| **`icon`（矢量图标）**<br>抓包中出现 26 次的内建图标节点，常配合标题强调语义。 | ![DIL icon 静态对照](./compose-parity/gpt-icon.png) | **部分**<br>目前在 `<box mark="shield">` 内置盾牌校验图标；通用 `<icon name="...">` 词表未实现。 | ![Garden Compose shield mark](./compose-parity/our-icon.png) |
| **`box`（线框容器） / `card`**<br>带边框、圆角与内边距的通用容器（抓包出现 54 次）。 | ![DIL box 静态对照](./compose-parity/gpt-box.png) | **是**<br>`<box>`（默认 `frame="card"`），在 Claude 纸面底上采用透明底与 `--rule-strong` 边框。 | ![Garden Compose box](./compose-parity/our-box.png) |
| **`box` 强调色带变体（`background="surface-secondary"`）**<br>无描边或弱描边的整行浅色底通栏，用来突出关键层。 | ![DIL tinted box 静态对照](./compose-parity/gpt-box-surface.png) | **是**<br>`<band tone="accent\|tip\|muted">` 或 `<box frame="band">`。 | ![Garden Compose band](./compose-parity/our-box-surface.png) |
| **`box` 胶囊变体（紧凑短词框）**<br>按文字宽度收缩的圆角胶囊，用于流程节点或角色头。 | ![DIL pill box 静态对照](./compose-parity/gpt-box-pill.png) | **是**<br>专用标签 `<pill tone="plain\|muted\|accent\|tip">`。 | ![Garden Compose pill](./compose-parity/our-box-pill.png) |
| **`row`（横向并排）**<br>子项沿水平方向等宽或居中排列（抓包出现 35 次）。 | ![DIL row 静态对照](./compose-parity/gpt-row.png) | **是**<br>`<row align="start\|center">`，窄屏自动折成单列。 | ![Garden Compose row](./compose-parity/our-row.png) |
| **`stack` / 纵向 `box`（垂直堆叠）**<br>子项自上而下按固定间距排列。 | ![DIL stack 静态对照](./compose-parity/gpt-stack.png) | **是**<br>`<stack align="start\|center">`。 | ![Garden Compose stack](./compose-parity/our-stack.png) |
| **`grid` + `grid-item`（多列网格）**<br>按列数对齐的二维卡片网格（抓包中 `grid` 2 次、`grid-item` 12 次）。 | ![DIL grid 静态对照](./compose-parity/gpt-grid.png) | **部分**<br>`<grid>` 已支持并编译为同行等宽网格行；跨列 `span` 的独立 `<grid-item>` 属性未实现。 | ![Garden Compose grid](./compose-parity/our-grid.png) |
| **`divider`（水平分隔线）**<br>切分上下两个逻辑区域的细横线。 | ![DIL divider 静态对照](./compose-parity/gpt-divider.png) | **是**<br>自闭合标签 `<divider/>`。 | ![Garden Compose divider](./compose-parity/our-divider.png) |
| **单向连接箭头（`↓` / `→`）**<br>ChatGPT 常靠 `box` + 字符或小图标拼出上下/左右流向。 | ![DIL arrow 静态对照](./compose-parity/gpt-arrow.png) | **是（专用标签）**<br>`<arrow dir="down\|right"/>`，内置统一尺寸 SVG 箭头，窄屏自动把右箭头转为向下。 | ![Garden Compose arrow](./compose-parity/our-arrow.png) |
| **一分多扇出连接（Fan-out）**<br>从一层同时指向下方多列的并列箭头（见 SSO 图例）。 | ![DIL fan 静态对照](./compose-parity/gpt-fan.png) | **是（专用标签）**<br>`<fan n="2\|3\|4"/>`，与下方 `<row>` 的列数对齐。 | ![Garden Compose fan](./compose-parity/our-fan.png) |
| **多合一汇聚连接（V 形 Join）**<br>左右两列斜线汇到中间底部并压一行粗体结论（见 RBAC 图例）。 | ![DIL join 静态对照](./compose-parity/gpt-join.png) | **是（专用标签）**<br>`<join>一句话结论</join>`，单路径 SVG 斜线加居中文字。 | ![Garden Compose join](./compose-parity/our-join.png) |
| **多角色时序泳道（Sequence Lanes）**<br>顶部角色胶囊、纵向虚线生命线、带编号的往返箭头（见 OAuth+PKCE 图例）。 | ![DIL lanes 静态对照](./compose-parity/gpt-lanes.png) | **是（专用标签）**<br>`<lanes>` + `<actor>` + `<message from to tone="forward\|back">`。 | ![Garden Compose lanes](./compose-parity/our-lanes.png) |
| **可展开步骤 / 披露说明（Steps / Disclosure）**<br>点击某一步或卡片展开对应的补充说明。 | ![DIL steps 静态对照](./compose-parity/gpt-steps.png) | **是**<br>`<steps>` + `<step id="...">` + `<note>`（或 `<box id="...">` + `<note>`），纯 HTML `<details>` 展开。 | ![Garden Compose steps](./compose-parity/our-steps.png) |
| **大数字指标块（KPI / Metric）**<br>抓包中用 `title size="lg"` + `text` + `caption` 拼出的核心指标展示。 | ![DIL kpi 静态对照](./compose-parity/gpt-kpi.png) | **是（专用标签）**<br>`<kpi value="..." unit="..." label="..."/>`。 | ![Garden Compose kpi](./compose-parity/our-kpi.png) |
| **提示框（Callout）**<br>带左边框或底色的重点提示行。 | ![DIL callout 静态对照](./compose-parity/gpt-callout.png) | **是**<br>`<callout tone="note\|tip\|warn">`。 | ![Garden Compose callout](./compose-parity/our-callout.png) |
| **并列对比组（Compare Items）**<br>两到四项放在同一排对照优劣或职责边界。 | ![DIL compare 静态对照](./compose-parity/gpt-compare.png) | **是**<br>`<compare>` + `<item tone="plain\|accent\|tip\|muted">`。 | ![Garden Compose compare](./compose-parity/our-compare.png) |
| **`button` / ` segmented-control`（按钮与分段切换）**<br>触发状态切换或档位选择的内建控件。 | ![DIL controls 静态对照](./compose-parity/gpt-controls.png) | **否（未实现）**<br>`compose` 目前只产出静态说明图；需要交互状态时走 `garden interactive` / `garden html`。 | — |
| **`slider`（滑动条）**<br>抓包中用于调节连续数值（如预算、速率）并实时重算视图。 | ![DIL controls 静态对照](./compose-parity/gpt-controls.png) | **否（未实现）**<br>在 `compose` 中未实现（见 `garden interactive`）。 | — |
| **`input` / `select` / `checkbox` / `radio`（表单输入）**<br>文本输入、下拉选择、复选与单选控件。 | ![DIL controls 静态对照](./compose-parity/gpt-controls.png) | **否（未实现）**<br>在 `compose` 中未实现。 | — |
| **`table`（结构化数据表）**<br>抓包 `model_dil_v2` 中出现 1 次的内建表格组件。 | ![DIL table 静态对照](./compose-parity/gpt-table.png) | **否（未实现）**<br>博文正文直接写 GFM Markdown 表格；`compose` 内部未设 `<table/>` 标签。 | — |
| **`pie-chart` / 内建图表**<br>抓包中由编译器追加 `card` 外壳的饼图/图表节点。 | ![DIL chart 静态对照](./compose-parity/gpt-chart.png) | **否（未实现）**<br>`compose` 内部未实现图表标签（独立图表走 `garden chart`）。 | — |
| **宿主解析组件（30 eager + 283 lazy）**<br>如 `Cite`、`AsyncImage`、`ProductCard`、`FlightCard`、`Map` 等由服务端按 ID 注入数据的宿主卡片。 | ![DIL host widgets 静态对照](./compose-parity/gpt-host-widgets.png) | **否（未实现）**<br>当前 tip 优先对齐内建布局与连接目录；宿主业务卡片未实现。 | — |
| **`{@body ...}`（响应式脚本块）**<br>在沙箱 Worker 中运行的状态声明与派生计算。 | ![基于 OpenUI / Disdjj 协议的静态演示](./compose-parity/gpt-runtime-body.png)<br><small>基于 OpenUI / Disdjj 协议的静态演示：左为初始状态 A（`$24/月`），右为切换档位与席位后重算出的状态 B（`$120` + 批量折扣徽章）。</small> | **否（未实现）**<br>博客为构建期一次性静态渲染（one-shot），未引入 Worker 脚本求值。 | — |
| **`{expr}`（属性与文本插值）**<br>把脚本变量绑定到组件属性或文本节点。 | ![基于 OpenUI / Disdjj 协议的静态演示](./compose-parity/gpt-runtime-expr.png)<br><small>基于 OpenUI / Disdjj 协议的静态演示：左为 `usage=42` 时的正常蓝色进度条，右为 `usage=92` 时触发告警表达式变红。</small> | **部分**<br>仅支持 `<fan n={3}/>` 这类整数字面量写法；动态表达式求值未实现。 | — |
| **`{#if}` / `{:else}` / `{#each}`（条件与循环控制流）**<br>根据运行时状态增删或遍历节点树。 | ![基于 OpenUI / Disdjj 协议的静态演示](./compose-parity/gpt-runtime-control.png)<br><small>基于 OpenUI / Disdjj 协议的静态演示：左为数组为空时命中 `{:else}` 渲染空状态卡，右为有 3 条数据时 `{#each}` 展开成 3 行列表。</small> | **否（未实现）**<br>`compose` 围栏直接写出展开后的完整节点树，未实现模板控制流。 | — |
| **流式编译修复（`recoveryDiagnostics`）**<br>流式输出时截断半截标签、自动闭合未完节点（抓包中 338 次恢复补丁）。 | ![基于 OpenUI / Disdjj 协议的静态演示](./compose-parity/gpt-runtime-stream.png)<br><small>基于 OpenUI / Disdjj 协议的静态演示：左为流式半截标签（直接解析会白屏），右为编译器裁掉残缺属性并自动闭合后先画出已完卡片。</small> | **否（未实现）**<br>`ui/compose/markup.mjs` 在完整围栏上一次性解析；未闭合标签直接报错。 | — |
