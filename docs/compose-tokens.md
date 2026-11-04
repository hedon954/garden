# Compose 设计 token

颜色只引用 Garden 主题变量（Claude 博客纸色），`compose.css` 内禁止硬编码色值。

## 纸面与墨水（主题）

| 语义 | Light | Dark |
| --- | --- | --- |
| `--paper` | `#FAF9F5` | `rgb(31,30,29)` |
| `--ink` | `rgb(27,26,24)` | `rgb(238,236,231)` |
| `--well` / `--paper-deep` | 略深纸面 | 略浅暗面 |
| `--rule` / `--rule-strong` | 浅线 | 暗线 |
| `--muted` | 次要字色 | 次要字色 |
| `--flow` / `--flow-back` | 前向/回向强调（蓝/绿语义槽） | 同 |

## 间距 `padding` / `gap`（0–4）

刻度 **4px × n**（与 ChatGPT DIL 实证一致）：

| 值 | 像素 |
| --- | --- |
| 0 | 0 |
| 1 | 4 |
| 2 | 8 |
| 3 | 12 |
| 4 | 16 |

写法：`padding={3}` 或 `gap="2"`。

## 表面 `background`

| Token | 映射 |
| --- | --- |
| `surface` / `paper` | `var(--paper)` |
| `surface-secondary` / `well` | `var(--well)` |
| `surface-accent` | flow 浅混 |
| `surface-tip` | flow-back 浅混 |
| `surface-muted` | ink 浅混 |
| `transparent` | 透明 |

也可继续用 `tone="accent|tip|muted|plain"`（与 frame 组合）。新图优先 `background`，旧图的 `tone` 仍有效。

## 圆角 `radius`

`none` | `sm` | `md` | `lg` | `xl` | `full`

## 尺寸 `size`

`sm` | `md` | `lg` | `xl` — 影响卡内边距或字号。

## 边框 `border`

`true` / `strong` | `subtle` | `none` / `false`

## 对齐

- `align`：`start` | `center` | `end` | `stretch`
- `justify`（row）：`start` | `center` | `end` | `between` | `around`
- `wrap`：`wrap` | `nowrap`
