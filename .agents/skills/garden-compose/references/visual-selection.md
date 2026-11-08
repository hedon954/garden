# Content → visual selection · 按内容选图

Load when choosing how to explain source content, not for every repair. Use the current lowercase Compose surface. / 需要选图时读取，不是每次修复都读。

## Effect compiler · 效果先收敛
作者给原文＋一句效果/参考图即可；以下是AI内部动作，不要求作者懂标签。

1. 确定读者问题、移动阅读任务和原文真实关系；尊重明确效果。没有顺序不画流程，没有因果不加因果箭头，没有数据不造图表。
2. 写一张内部几何约束卡（工作笔记/临时JSON即可，非新作者语法）：读者问题；共享容器；悬挂与正文范围；居中的是文字还是图标标题整体；字号相对正文；场景框/内部边框/底色；窄屏回退；不要什么。参考图也先提取这些约束，不能只识别“图标＋文字”。
3. 全局阅读结构先于局部效果：长清单的任务是连续扫读，不是把每项放大为一个居中展示单元。按mobile-contract检查内容量、长短差异和小屏阅读节奏，再按下表取一条推荐路线，填原文叶子。默认正文基线、开始对齐、自然换行，不新增强调色；只在有意强调时加样式。未知但不影响事实的细节用默认，不把问题推给作者；可能改变事实关系、隐藏内容或阅读顺序时才问。

| 效果/读者问题 | 唯一推荐路线 | whenNot / 不这样用 |
|---|---|---|
| 图标窄栏、标题正文共左缘 | icon-rail：stack重复row(icon＋group)，divider在row间 | 不把正文放row外；不当流程 |
| 短阶段从左到右 | flow-row：row＋真实顺序箭头；窄屏/长内容回退flow-stack | 不靠缩字/nowrap强撑手机 |
| 长阶段或纵向顺序 | flow-stack：stack＋下箭头 | 无顺序的条目不加箭头 |
| 并列等宽卡片 | equal-cards：grid＋直接card | 非真实共同维度不走compare |
| 图标贴标题，两者一起居中 | centered-chip：内容宽标题壳＋内部图标标题行，下方正文独立 | 不只给全宽row设center；候选须浏览器验收 |
| 跟正文一样的列表 | prose-list：普通Markdown；场景内用markdown岛 | 不写假圆点；不为列表手感换到compare |
| 去外框/留内框 | 原路线＋frameless-scene选项：外figure frame=none | 不把透明底色当去边框，不改错层级 |

这些是**唯一推荐默认**，不是组件白名单；先使用最接近的已验局部结构，确有关系需求再按composition-patterns组合新形式，并保留同样约束和验证。frame/tone是正交选项，不衍生新的配方家族。

边界：普通Markdown优先；compare仅真实共同维度对照。当前只有garden compose围栏，旧garden list不再推荐。Compose内部icon-list仅在需要其原生语义/宿主行为且接受其样式契约时用；普通编辑性图标段落默认icon-rail，不能仅为调字号来回迁移。需要语义/交互时再读static-play，不靠标签同名猜兼容。

## Capability map · 典型形式与边界

| Content cue / 读者问题 | Components and arrangement / 组合 | Cautions / 边界 |
|---|---|---|
| Peer categories: which responsibilities/items? / 并列类别 | `grid` + repeated `card` containing source `title`/`text`; 1–6 columns; equal-card reference for tokens | No arrows or implied ranking; card titles from source labels, not invented summaries. |
| Independent explanations with an icon rail / 图标窄栏的独立条目 | `stack` repeats `row → icon + group(title/body paragraphs)`; `divider` between rows; layout-recipes.md | Not a workflow; title and every body paragraph share the right column, never full-width body below an icon/title row. |
| A small independent list / 简单条目 | Markdown list; if a composed scene is useful, `list` + `list-item`, or `stack` of text/cards | A checklist is not automatically a workflow. Prefer plain Markdown when equivalent. |
| Explicit linear sequence / 顺序链 | `stack` of cards with `arrow dir="down"`; `row` with right arrows only for short justified sequences | Arrows mean the stated relation; do not invent causation. Vertical is safer for long text and narrow screens. |
| Ordered stages with optional details / 分步解释 | `steps` with `step` and `title`/`text`; `note` with stable step id for disclosure | 1–8 steps; built-in sequence arrows. Not proportional time, a simulation or a promise of arbitrary nested layouts. |
| Dated events / 时间节点 | `stack` of rows pairing source date (`badge`/`caption`) and event text/card | Preserve dates/order. No native continuous time axis or duration-proportional layout; do not imply scale. |
| Containment or architectural layers / 包含或分层 | Nested `card`/`box` around `stack` or `grid`; plain stacked bands for layers | Containment is not data flow. Do not add arrows solely to connect boxes. Not an automatic arbitrary tree/graph engine. |
| One source explicitly branches into a few peers / 一分多 | Parent card → `fan n="2…4"` → row/grid with matching child count | Fan is a schematic connector, not routed graph edges or condition evaluation. For deeper hierarchy compose bounded groups; no arbitrary graph routing. |
| Several inputs explicitly meet / 多项汇总 | Peer row/grid → `join` with source explanation → result card | A schematic visual join, not arbitrary node-addressed many-to-one edges. Inputs must genuinely converge in the source. |
| Two to four alternatives with comparable facts / 对照 | `compare` + `item` + `title`/`text`; rich repeated fields use equal `grid` cards or a table | 2–4 compare items; shared dimensions and inputs must be real. No winner/rank invented; unrelated concepts use cards instead. |
| Who sends what to whom / 交互时序 | `lanes` with `actor` + `message from="1" to="2"` | 2–4 actors, 1–8 messages, one-based indices; labels and direction follow source. No general UML branches, loops, async runtime or graph auto-layout. |
| Exceptions, caveats, source-backed key numbers / 重点注释 | `callout`; `badge`/`caption`; literal `kpi`; a card/step with `note` | Callout tone note/tip/warn; key numbers must come from source. Details/visual accents do not establish topology. |
| Field-by-field exact facts / 表格 | Prefer Markdown table; static `table`/`thead`/`tbody`/`tr`/`th`/`td` inside a composed scene | Static cells, not spreadsheet, sorting, data binding or Play-table parity. Keep headers, units and source values. |
| Alternate independent explanations / 分组切换 | Static `tabs` + `tab title="…"` with content | Hides other panels; do not hide facts that must be compared simultaneously. Not application navigation. |
| Source formula with meaningful input variation / 参数实验 | Play `DIL.useState`, derived expressions, `slider`/`choice`/`toggle`/`button`, `stat`/`meter` | Restricted interpreter, not arbitrary JS. Check supported bindings. Show valid defaults/ranges from source; do not fabricate a model. |
| Real measured series or distributions / 数据图 | Play `chart` with lowercase `bar`/`line`/`area`; `pie` + `slice` for real parts of a whole | Confirm live catalog/examples for schema, data and axes. Do not invent values; line continuity/part-whole assumptions must be justified. Static graph tags are not Play chart APIs. |

This is a selection map, not a new syntax catalog. For chart attributes use the current handbook/catalog; for state/control syntax see the existing minimal Play example. / 这是选型地图，不复制属性目录；图表参数查当前手册，状态绑定查已有 Play 示例。

## Boundaries · 不承诺的能力
No arbitrary SVG/canvas, custom CSS/JS, general node-id edge routing, automatic graph/tree placement, simulated execution, arbitrary nested rich `compare` items, or full parity between static and Play. A small drawn branch does not imply support for a full flowchart language. `steps` detail toggles and `tabs` are not numerical Play state.

If the requested relation needs unsupported routing/interaction, state the gap and suggest a simpler faithful Compose scene or an existing appropriate article format; do not silently switch engines or invent tags. Validation proves syntax/semantics only; inspect the browser before claiming visual/responsive behavior was verified.

## Mobile is part of compilation · 不是交给作者的QA
断点自动单列只证明重排，不证明好读。centered-chip是局部贴标结构，不是长清单的全局默认；equal-cards也是按信息关系选择，不是见到N项就生成N张大卡。普通短清单优先prose-list；有独立标题/多段解释才用共享右栏。明确要求的卡片/居中仍须保留其意图，但不能以缩字、硬横排、折叠事实来达成。
长内容自然跨屏不算失败；要识别的是重复装饰、冗余表面、过量容器间距、窄列拆词和反复居中造成的阅读负担。移动约束由AI内部收敛与验证，不询问作者要断点、字号或方向细节。当前能力确实无法同时满足硬约束时如实标未完成/引擎缺口，不静默改事实或发明属性。
