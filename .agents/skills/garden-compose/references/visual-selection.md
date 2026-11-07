# Content → visual selection · 按内容选图

Load when choosing how to explain source content, not for every repair. Use the current lowercase Compose surface. / 需要选图时读取，不是每次修复都读。

## Decision procedure · 选型
Identify the reader question first: “which things?”, “what happens next?”, “what contains what?”, “who sends what?”, “how do options differ?”, “what changes if an input changes?”. Select the relation actually present in the source, not whichever layout looks elaborate. Use one primary relation per scene; split a crowded explanation into adjacent scenes. Honor an explicit requested effect unless unsupported or misleading, in which case explain the concrete conflict.

先确定读者问题，再抽取真实关系。普通清单已足够、只有一句结论、缺少关系/数值、图只会重复文字时保留 Markdown；建议请求只给形式与理由。没有顺序就不画流程，没有因果就不画因果箭头，没有数据就不造图表。不能确定的关系不强行补齐。

The forms below are examples accumulated from practice, not an exhaustive taxonomy or a whitelist. If no row matches, use the primitive inventory, operations and discovery protocol in composition-patterns.md to build a faithful new arrangement. Absence from this map is not evidence of an engine limitation. / 下表是持续积累的典型经验，不穷举表示方式；没有匹配项时查基础组件和组合操作，构造并验证新组合，不能据此判定不支持。

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
