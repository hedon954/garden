# Compose 组件目录

用户手册标签目录：[`/garden/reference/compose`](/garden/reference/compose)。本页是仓库侧摘要。


属性里的 token 见 [compose-tokens](./compose-tokens.md)。图标名见 [compose-icons](./compose-icons.md)。

当前 **diagram 静态目录 68** 个小写标签（`CATALOG_TAGS`）。另有 play 路径把 `slider` / `button` / `choice` 等降到 `ui/core` 交互件（见 [compose-dil](./compose-dil.md)）；静态围栏里同名标签会画成可见默认态快照。

## 布局原子

| 标签 | 子节点 | 常用属性 |
| --- | --- | --- |
| `box` / `card` | 任意 | `padding` `gap` `radius` `border` `background` `size` `align` `tone` `frame` `id` `mark` |
| `stack` | 任意 | `gap` `align` `justify` |
| `row` / `columns` | 任意 | `gap` `align` `justify` `wrap` |
| `grid` | 任意 / `grid-item` | `cols`（1–6）`gap` `align` |
| `grid-item` | 任意 | `span`（1–6）+ box 类 token |
| `group` / `field` / `header` / `footer` / `figure` / `prose` | 任意 | `gap` 等 |
| `divider` / `separator` | 无（自闭合） | — |
| `spacer` | 无 | `size` / `gap` |

`box` 的 `frame`：`card`（默认）/`band`/`pill`/`text`。`band`/`pill` 也可写作糖标签 `<band>` / `<pill>`。

## 文字与强调

| 标签 | 说明 |
| --- | --- |
| `title` | 短标题；`align` `size` |
| `text` / `prose` | 正文；`align` `tone` `size` |
| `caption` / `label` | 次要说明 |
| `badge` | 胶囊标签；`tone` `size` |
| `kpi` / `stat` | 自闭合；`value` `unit` `label` |
| `icon` | 自闭合；`name`（必填）`size` `inline` |
| `callout` | 提示条；`tone`：note/tip/warn |
| `kbd` | 键盘键帽 |
| `link` | `href` + 子文本 |

## 控件快照（静态默认态；带 `{@body}` 时走 play）

| 标签 | 说明 |
| --- | --- |
| `button` | `label` / `tone` / `size` |
| `slider` | `min` `max` `value` `label` `unit` |
| `progress` / `meter` | `value` `max` `label` |
| `checkbox` / `radio` | `checked` `label` |
| `toggle` / `switch` | `checked` `label` |
| `input` / `textarea` / `select` | `label` `value` `placeholder` |
| `tabs` / `tab` | `tab` 可写 `title` `active` |
| `list` / `list-item` | `list ordered` 可切有序 |
| `table` / `tr` / `th` / `td` / `thead` / `tbody` | 结构表 |
| `image` | `src` `alt` `size` |
| `avatar` | `label` `size` |
| `empty` | 空状态文案 |
| `option` | 分段选项快照 |

## 连接糖（可选；新图优先用原子拼）

| 标签 | 说明 |
| --- | --- |
| `arrow` | `dir`：down/up/left/right |
| `fan` | `n`：2–4，向下分叉箭头 |
| `join` | 子文本为汇合标签 |
| `lanes` | 泳道：`actor` + `message from to tone` |
| `steps` / `step` | 分步；`step` 可嵌 `note` 做展开说明 |
| `compare` / `item` | 并排对照卡 |
| `code` / `pre` | 代码块快照 |

## 子节点规则

- 未知标签 → 编译失败（`compose-invalid`）。
- 布局标签可自由嵌套（上限约 10 层 / 220 节点）。
- Markdown 写在标签之间或标签内均可；`##` → title，段落 → text。
- `box` 内第一个 `title`/`badge` 会提成卡面属性（兼容旧图）；其余子节点原样渲染，故可在卡内放 `icon` + `row` + `caption`。

## Scene frame

Static Compose keeps its default outer frame. To opt out, wrap the whole scene in a single outer `<figure frame="none">…</figure>`. `frame="card"` explicitly retains the default. This removes only scene border, radius, background and padding, not inner card frames or normal figure margins. Nested or sibling scene-frame declarations and unsupported frame values fail compilation. This is distinct from `box frame="text"` and Play block headers.

## Shared Markdown and HTML content

Inside a Compose scene, `<markdown>…</markdown>` and `<html>…</html>` are static content islands, nestable in the existing layout containers. Both use the article's shared GFM/CJK/line-break syntax, including paragraphs, headings, lists, tables, task lists, code fences and inline formatting. The tags identify content, not a second fence language. Text/title/caption leaves accept inline Markdown, links, deletion and safe formatting such as `<u>`; use a content island for block structures.

HTML is allowlisted article content, not arbitrary HTML execution: links, images, paragraphs, headings, lists, tables, details/summary and inline formatting are supported. Inline CSS supports local layout, spacing, size, typography, colors and borders; unsupported properties/functions fail with `compose-content`. Scripts, event handlers, iframe/style/custom elements, CSS resource functions and script/data URLs are rejected. Use the existing explicit sandbox capability for executable widgets; it has not yet been unified into a Compose node.

In Play, content islands compile to the same shared renderer and coexist with stateful controls. Ordinary inline underline and GFM deletion also work. HTML attributes/content and whole content islands are static: expressions are not executed inside them; place live interpolation beside the island. Existing legacy fences remain compatible and are not automatically migrated.

Body text and readable lists inherit the actual surrounding article family/size. Explicit text/title `size="sm"`, `lg`, `xl` scale to .875em, 1.125em, 1.25em; semantic captions, controls and numeric displays retain their distinct scale. These are relative roles, not a universal article pixel size.
