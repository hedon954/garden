# Compose 组件目录

属性里的 token 见 [compose-tokens](./compose-tokens.md)。图标名见 [compose-icons](./compose-icons.md)。

## 布局原子

| 标签 | 子节点 | 常用属性 |
| --- | --- | --- |
| `box` | 任意 | `padding` `gap` `radius` `border` `background` `size` `align` `tone` `frame` `id` `mark` |
| `stack` | 任意 | `gap` `align` `justify` |
| `row` | 任意 | `gap` `align` `justify` `wrap` |
| `grid` | 任意 / `grid-item` | `cols`（1–6）`gap` `align` |
| `grid-item` | 任意 | `span`（1–6）+ box 类 token |
| `divider` | 无（自闭合） | — |

`box` 的 `frame`：`card`（默认）/`band`/`pill`/`text`。`band`/`pill` 也可写作糖标签 `<band>` / `<pill>`。

## 文字与强调

| 标签 | 说明 |
| --- | --- |
| `title` | 短标题；`align` `size` |
| `text` | 正文；`align` `tone` `size` |
| `caption` | 次要说明（默认 muted） |
| `badge` | 胶囊标签；`tone` `size` |
| `kpi` | 自闭合；`value` `unit` `label` |
| `icon` | 自闭合；`name`（必填）`size` `inline` |
| `callout` | 提示条；`tone`：note/tip/warn |

## 连接糖（可选；新图优先用原子拼）

| 标签 | 说明 |
| --- | --- |
| `arrow` | `dir`：down/up/left/right |
| `fan` | `n`：2–4，向下分叉箭头 |
| `join` | 子文本为汇合标签 |
| `lanes` | 泳道：`actor` + `message from to tone` |
| `steps` / `step` | 分步；`step` 可嵌 `note` 做展开说明 |
| `compare` / `item` | 并排对照卡 |

## 子节点规则

- 未知标签 → 编译失败（`compose-invalid`）。
- 布局标签可自由嵌套（上限约 10 层 / 120 节点）。
- Markdown 写在标签之间或标签内均可；`##` → title，段落 → text。
- `box` 内第一个 `title`/`badge` 会提成卡面属性（兼容旧图）；其余子节点原样渲染，故可在卡内放 `icon` + `row` + `caption`。
