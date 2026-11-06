---
title: 组件参考 · compose
navTitle: compose
description: 全部 compose 标签一览、共用 token，以及图标目录入口。
section: reference
order: 6
badge: compose
---

[← 组件参考](/garden/reference) · [用法](/garden/components/compose) · [图标目录](/garden/reference/compose-icons)

围栏写 ` ```garden compose `。作者原话放 `<intent>`（不绘制）。未知标签报 `compose-invalid`。

当前 **68** 个标签（见下方目录）。图标 **690** 个名字 —— 见 [图标目录](/garden/reference/compose-icons)。

## 共用 token

多数布局标签共用；颜色只走 Garden 主题变量（Claude 纸色）。

| Token | 取值 |
| :--- | :--- |
| `padding` / `gap` | `0`–`4`（4px × n） |
| `background` | `surface` `surface-secondary` `surface-accent` `surface-tip` `surface-muted` `transparent` |
| `radius` | `none` `sm` `md` `lg` `xl` `full` |
| `border` | `subtle` `strong`/`true` `none`/`false` |
| `size` | `sm` `md` `lg` `xl` |
| `tone` | `plain` `accent` `tip` `muted`（callout 另有 `note`/`warn`） |
| `align` | `start` `center` `end` `stretch` |
| `justify`（row） | `start` `center` `end` `between` `around` |
| `wrap`（row） | `wrap` `nowrap` |

## 高频属性

### `box` / `card`

| 属性 | 说明 |
| :--- | :--- |
| `frame` | `card`（默认）`band` `pill` `text`；也可用糖标签 `<band>` / `<pill>` |
| `padding` `gap` `radius` `border` `background` `size` `align` `tone` `id` `mark` | 共用 token；`mark="shield"` 画盾牌 |

### `row` / `stack` / `grid`

| 属性 | 说明 |
| :--- | :--- |
| `gap` `align` | 共用 |
| `justify` `wrap` | 仅 `row` |
| `cols` | 仅 `grid`，1–6 |
| `span` | 仅 `grid-item`，1–6 |

### `text` / `title` / `caption`

| 属性 | 说明 |
| :--- | :--- |
| `size` `align` | 共用 |
| `tone` | `text`：`plain` `muted` `accent` `tip`。`caption` 固定 muted。 |

### `icon`

| 属性 | 说明 |
| :--- | :--- |
| `name` | 必填；须在 [图标目录](/garden/reference/compose-icons) |
| `size` | `sm` `md` `lg` `xl` |
| `inline` | 与文字同行 |

## 标签目录

每组一个迷你样例，下面一张一句话表；不写长文。

### 布局

```garden compose
<row gap={2}><box padding={2} radius="md" border="subtle"><title size="sm">甲</title></box><box padding={2} radius="md" background="surface-accent"><title size="sm">乙</title></box></row>
```

| 标签 | 用途 |
| :--- | :--- |
| `box` | 通用容器；可设 padding / gap / background / radius |
| `card` | box 的卡面别名 |
| `stack` | 竖排 |
| `row` | 横排 |
| `columns` | 多列横排（默认可换行） |
| `grid` | 等分网格；cols 1–6 |
| `grid-item` | 网格格；span 跨列 |
| `group` | 语义分组容器 |
| `field` | 表单项分组 |
| `header` | 页眉区 |
| `footer` | 页脚区 |
| `figure` | 图示区 |
| `prose` | 长文段落区 |
| `divider` | 分隔线（自闭合） |
| `separator` | divider 别名 |
| `spacer` | 空白间距 |
| `band` | 通栏强调条（box frame=band） |
| `pill` | 胶囊（box frame=pill） |

### 文字

```garden compose
<stack gap={1}><title size="sm">标题</title><text size="sm">正文</text><caption size="sm">说明</caption><badge>徽标</badge></stack>
```

| 标签 | 用途 |
| :--- | :--- |
| `title` | 短标题 |
| `text` | 正文 |
| `caption` | 次要说明（默认 muted） |
| `label` | 控件标签 |
| `badge` | 胶囊徽标 |
| `kpi` | 指标数字（自闭合） |
| `stat` | kpi 别名 |
| `icon` | 具名描边图标（自闭合） |
| `callout` | 提示条 |
| `kbd` | 键盘键帽 |
| `link` | 行内链接 |
| `intent` | 作者原话（不绘制） |

### 控件

```garden compose
<stack gap={2}><row gap={2}><avatar label="甲" size="sm"/><badge>好</badge><kbd>⌘K</kbd></row><list><list-item>一项</list-item><list-item>二项</list-item></list><progress value={40} max={100} label="40%"/></stack>
```

| 标签 | 用途 |
| :--- | :--- |
| `button` | 按钮快照 |
| `slider` | 滑杆快照 / play 可调 |
| `progress` | 进度条 |
| `meter` | 计量条 |
| `checkbox` | 复选框快照 |
| `radio` | 单选快照 |
| `toggle` | 开关快照 |
| `switch` | toggle 别名 |
| `input` | 单行输入快照 |
| `textarea` | 多行输入快照 |
| `select` | 下拉快照 |
| `tabs` | 选项卡容器 |
| `tab` | 单个选项卡 |
| `list` | 列表 |
| `list-item` | 列表项 |
| `table` | 表格 |
| `thead` | 表头 |
| `tbody` | 表体 |
| `tr` | 表行 |
| `th` | 表头格 |
| `td` | 表数据格 |
| `image` | 图片 |
| `avatar` | 头像占位 |
| `empty` | 空状态 |
| `option` | 分段选项快照 |

### 连接糖

```garden compose
<stack align="center" gap={1}><pill>起点</pill><arrow dir="down"/><band tone="accent" align="center"><title size="sm">枢纽</title></band></stack>
```

| 标签 | 用途 |
| :--- | :--- |
| `arrow` | 箭头 |
| `fan` | 向下分叉箭头 |
| `join` | V 形汇合 |
| `lanes` | 泳道图 |
| `actor` | 泳道角色 |
| `message` | 泳道消息 |
| `steps` | 分步容器 |
| `step` | 一步 |
| `note` | 步骤展开说明 |
| `compare` | 对照卡组 |
| `item` | 对照项 |
| `code` | 代码快照 |
| `pre` | 预格式文本 |


## 图表示例

玩法级图表示例（静态八柱、融合权重滑杆）见 [说明图 · compose](/garden/components/compose#compose-chart-active-hours)。

## 限制

- 嵌套约 10 层 / 约 220 节点。
- 只有白话、没有标签时报 `compose-uncompiled`。
- Play（`{@body}`、`{#if}` …）见仓库 `docs/compose-dil.md`；静态围栏里的控件标签画成默认态快照。
