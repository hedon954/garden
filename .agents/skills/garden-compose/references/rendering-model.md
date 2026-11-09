# Operational rendering model · 渲染机制

先读关系，再建层级，不靠堆图标/标题/文字/线条碰运气。以下事实来自当前解析器、真实 CSS 和完整主题回归；需要细节时按需导出 schema，不能把手抄表当另一份目录。

## 可执行心智模型
- 关系决定共同容器：一个图标对应的标题与所有正文要属于一个重复单元；标题和正文必须同在右侧容器。分隔整条目时 divider 放两条 row 之间，而非右栏内。
- row 默认 wrap/stretch、8px gap；直接 card/stack/title/text 共分可用宽度，icon 固定不缩。窄屏默认会改行流；需要持续图标栏用 wrap="nowrap" 并测试不溢出。
- row > stack 有 **12px 顶部 padding**；不能假定任意嵌套同样表现。group 为 width:100%、min-width:0 的纵向容器，能在固定 icon 旁收缩，支持 gap，避开该上下文顶距。prose 不能凭空赋予未实现的 gap 行为。
- row 的 align 管交叉轴，justify 管主轴；显式 justify 始终优先，不被 align="center" 或徽标的默认居中覆盖。文字仍可能继承 text-align。当前 title/text 的显式 align="start" 会保留并输出 data-align。用一个共享 group 和显式开始对齐，不要把 title 独立成横向等分栏、正文又放回全宽。
- icon 名查 schema/icons 实际目录；不存在报错。SVG width 属性不等于最终像素：当前 CSS sm13、md15、lg18、xl22px，小卡上下文另有覆盖，必须测 computed/rect。
- 多段正文分别放 text，或用 markdown/html 岛保存真实 p。text 内空行是 inline break，不是独立段落。图标签有截断/行钳制时不能塞完整正文去丢字。

## Diagnose the host before rewriting content · 先诊断宿主
Measure viewport → `.article-reading-column` → `.garden-ui-body` → iframe; record each width and computed padding. Do not infer content width from a desktop breakpoint. The reading track takes priority over side rails; a frameless runtime has no body inset; fullscreen controls occupy a top band outside the frame. Post mobile TOC entries are in normal flow before the article. / 依次量视口、正文栏、运行时正文与iframe，不先删字或缩字。侧栏让位正文，frame="none"不再叠运行时内距，全屏按钮占外部顶栏，手机目录入口在正文前正常排版。

For a title and trailing badge, use `<row align="center" justify="between" wrap="nowrap"><title align="start">…</title><badge>…</badge></row>`. Its text/title children are content-sized and may shrink/wrap naturally, not width:100% columns. Explicit fills, scene framing and fullscreen are independent choices. / 标题＋尾部徽标直接组合已有属性；不靠换组件、固定标题宽度或缩字绕开。

## 集中禁令与风险分级
- **必选结构（已选icon-rail）**：icon和一个group同属row，标题与全部正文/列表同属group；分隔线在row之间。不要正文逃出右栏，不用row>stack替代group来碰运气。
- **无效属性**：stack不因direction="row"变横向；用真实row。未知静态属性可能归一化丢失，当前lint不能从归一化树找回它们；对照源属性与schema，缺少未知属性诊断是引擎需求，不谎称已机器覆盖。
- **风险而非全局错误**：row>stack的12px顶距、居中row直接title/text的flex:1、center仍可能向后代继承文字居中（但不覆盖显式justify）、nowrap长链、显式size和叠框。这些在其他语境可能有意，必须结合内部约束卡判断，不能一律禁用。
- **箭头看实际绘制方向**：right是源意图，不必等于当前屏幕方向。真实SVG默认向下；桌面旋转为right，≤800px取消旋转配合默认row转column。先看computed transform/屏幕向量，不把data-dir当几何证据。nowrap让row保持横向却不自动保留箭头旋转，须专项检查。
- **必须浏览器**：icon glyph光学齐平不是节点矩形相等；内容宽居中、完整主题字号/列表间距、溢出与手机回退不能从AST推断。用computed与rect及截图分别取证。

## 默认与显式样式
普通正文默认继承实际文章动态字体/字号；不再使用固定正文像素基线。text/title 的 sm=.875em、lg=1.125em、xl=1.25em，md 保持基线；title 默认 600/1.4。外层 figure 标题18px、caption14px及控件/图标签等是语义角色，不应全局拉成正文。其他语义尺寸及实际上下文见下表与完整主题。显式字体变化必须有信息层级依据，不缩字替代排版。

## 查契约而非猜
`garden ui schema` 从真实 Play 目录、语义字段验证器、图标与安全内容验证器生成；保存 JSON 后只读所需组件。Play 有 props 默认值与直接子项约束，语义场景未知属性报错。静态通用布局部分未知属性会静默丢弃，schema 的 propertyPolicy 明示这一限制；styleReference 从实际 CSS 自动抽取字体/布局声明、选择器、媒体条件和源顺序，是源默认而非用户文章 computed 常量。原生场景的 text 子项降为文字，嵌套 size/align 等不会传递；需要精确文字布局时用通用布局与已实现的 size 控制。首次用法须检查归一化树与真实 DOM/CSS，不能宣称所有接受的属性都生效。未暴露的某个静态默认不应靠标签名推断。

下面是可直接执行且已验证的机制、配方、内容边界和视觉检查：

## One entry, component selection inside it

Use `garden compose`. Select by the reader's task, not by another fence name:

| Need | Compose structure |
| :--- | :--- |
| Reference material and takeaways | `resources/resource`, nested `point`, `reference` |
| Key results | `metric` with label, value, unit, caption, paragraphs and references |
| Time or stages | `timeline/event` |
| Alternatives and verdicts | `compare/item` |
| Icon-led editorial paragraphs | `icon-list/entry` or a small `icon` beside one shared text container |
| Download and preview | `files/file` or one `file src="…"` |
| Connected concepts | `relations/entity/edge`, stable ids; 3–6 entities |
| Rich selectable cards and replies | `choices/choice-option`, optional `none` option |
| Discrete bars and exact values | `plot/datum`; expandable data table |
| Parameter-dependent results | Play declarations, controls, `chart/bar/line`, `pie`, `table` |
| Article text and useful HTML | `markdown` and `html` content islands |
| Independent executable illustration | Play `sandbox` with literal html/css/js; isolated offline iframe |

The authoritative, demand-loaded catalog is `npx garden ui schema`: actual semantic fields, Play props/defaults/child contracts, icon names, safe HTML tags/attributes/CSS properties. `npx garden ui prompt` adds working recipes. `styleReference` also extracts current font/layout declarations, selectors, responsive conditions and source order from the installed stylesheets; it reports source defaults, not universal computed values. These are generated from the validators and actual styles; do not maintain a second exhaustive tag list. Static layout normalization is not a universal HTML/CSS API: inspect the normalized tree and output because some unsupported static layout attributes are ignored. Semantic unknown fields fail validation.

## Relationships → hierarchy → layout → style → actual output

First identify what belongs together. A heading and all its paragraphs must share a container. Next choose columns and proportions, then alignments and typography. Only then add surfaces and decorative details.

A static `row` wraps by default. Its direct text/title/stack/card children share available width (`flex: 1 1 0`), whereas an icon is content-sized. A heading placed directly in that row is a sibling column, not the heading of a paragraph below the row. `align="center"` controls the cross axis and can inherit centered text; an explicit `justify` independently controls the main axis and takes precedence over default badge centering. A centered stack propagates text alignment. For an editorial list use explicit start alignment on children of a shared right-hand group; do not center each title independently.

Direct `row > stack` has 12px top padding in the current theme. A `group` is a width:100%, min-width:0 vertical container that shrinks beside the fixed icon and reads gap without that contextual padding; use it when icon and heading must begin on the same top line. Explicit `align="start"` survives normalization and emits data-align.

Nested paragraphs need separate `text` leaves or an article content island. Two unrelated top-level leaves do not establish a shared right column. Put a full-width divider **between rows**, not inside the right text container, if the rule must span the icon column too. `divider` and `separator` are real primitives, not text lines.

```garden compose
<figure frame="none">
<row wrap="nowrap" align="start" gap="4">
  <icon name="book-open" size="xl"/>
  <group gap="2">
    <title align="start">Test heading — not article content</title>
    <text align="start">Explicit test paragraph: the heading and this body share the same right column. Keep the author's complete text; do not shrink or summarize it to fit.</text>
    <text align="start">A second independent test paragraph stays in that column.</text>
  </group>
</row>
<divider/>
<row wrap="nowrap" align="start" gap="4">
  <icon name="users" size="xl"/>
  <group gap="2">
    <title align="start">Second test heading</title>
    <text align="start">Another test body, aligned with its heading rather than spanning the icon column.</text>
  </group>
</row>
</figure>
```

For a native editorial list the same relationship is expressed with `icon-list` containing `entry icon="…" title="…"`, and multiple `text` children per entry. Native paragraph children are lowered to text strings: their nested text size/alignment/layout properties are not carried into the native scene. Use a generic layout with text size controls for such precision; do not assume identical nested styling contracts. Native scenes preserve the app's keyboard/selection/detail/file-preview behavior when rendered by the Garden article host. A standalone static export is a readable fallback, not an identical interactive host.

## Typography and complete-theme context

Default body text inherits the **actual article's** family, size and line height. There is no universal pixel baseline. This includes ordinary static text, list bodies and native readable prose; changing the article typography configuration must propagate. Semantic headings, graph labels, values, captions and controls intentionally retain their hierarchy.

| Element/context | Actual source rule / intentional variation |
| :--- | :--- |
| Static `text` and `title` | Inherit body size; title weight 600, line height 1.4. `size="sm"` .875em; `lg` 1.125em; `xl` 1.25em. `md` keeps the baseline. |
| Static outer figure title/caption | Source defaults 18px/14px, not ordinary body; actual cascade still matters. |
| Static inline caption | Own semantic style; `sm` 11px, `lg` 16px. Not a body substitute. |
| Native icon-list entry title/body | Title weight 600; body inherits article. Group heading uses `--fs-small`. |
| Native choice value | 22px; narrow rule 20px. Option body inherits article. |
| Native relation ring | Compact/context-dependent labels and line clamps; detail prose inherits article. Do not treat a ring label as a long paragraph. |
| Play components | Query schema defaults and complete theme. Their controls/KPI/graph semantics are not globally changed to body size. |

Use explicit variation only for a meaningful hierarchy. Never shrink body text globally to fit a screenshot or discard facts to avoid wrapping. Inspect actual computed styles with globals → tokens → article theme → shell in the real order, on desktop and narrow widths; base component CSS alone does not prove the final result.

## Markdown, safe HTML, and execution

`text`, `title` and captions are inline contexts: `**bold**`, `_emphasis_`, backticks, `[links](https://example.com)`, `~~strike~~` and safe inline HTML such as `<u>underline</u>`. `<u>` is HTML, not standard Markdown.

Use `markdown` or `html` islands for full paragraphs, lists, headings, blockquotes, code blocks, tables, images, details/summary and other allowlisted article content. The islands share the article Markdown/GFM and safe-HTML renderer; they are not arbitrary component trees. Static text outside islands is a lightweight layout shorthand, **not** the whole article block grammar. Play islands are literal content, not interpolated expressions. Keep state and expressions in Play component nodes outside them.

```garden compose
<figure frame="none">
<markdown>
### Explicit test content

**Bold**, _emphasis_, `code`, [link](https://example.com), ~~strike~~ and <u>underline</u>.

- A full Markdown list
- Another test item

<details><summary>Safe HTML details</summary><p>Useful article HTML can coexist with Markdown.</p></details>
</markdown>
</figure>
```

Safe HTML supports allowlisted local `style` properties, including useful layout and typography; inspect the generated schema for the actual set. Unsupported tags/properties, events, unsafe URLs, executable scripts and network CSS functions report diagnostics. Do not expand the article allowlist into arbitrary execution. An intentional executable demo uses `sandbox` inside the **same Compose entry**, with literal html/css/js and no parent origin access. Sandbox layout is its own document, not inherited article prose.

For measured node connections, load layout-recipes.md and measured-connectors.js: straight, midpoint orthogonal elbow and optional dashed edges follow real DOM bounds. This is a sandbox recipe, not automatic graph layout or obstacle avoidance.

## Verification levels

1. Run `npx garden ui check <file>` (and `npx garden check <file>` for real file paths). Preserve original text/resources and inspect diagnostics.
2. Parse/render the actual scene; confirm accepted properties survive normalization and meaningful content appears.
3. Inspect the complete-theme render: icon rail fixed, heading and **all** paragraphs share the same right edge/left edge, no centered headings or full-width body beneath a detached icon row, dividers outside rows, no unintended cards/arrows, no horizontal overflow.
4. Check desktop and narrow screenshots plus geometry/computed styles; exercise choices, relations, file previews, state updates and sandbox behavior when used.
5. A hand-authored passing scene proves engine capability, not that an independent model reliably produces it from a short prompt. Report those claims separately.
