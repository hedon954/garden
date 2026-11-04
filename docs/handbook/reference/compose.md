---
title: 组件参考 · compose
navTitle: compose
description: 用 Markdown 和标签画一张说明图。构建期编成同一棵树，再变成静态 HTML。
section: reference
order: 6
badge: compose
---

[← 组件参考](/garden/reference) · [用法：说明图](/garden/components/compose)

## 示例

围栏写 ` ```garden compose `。正文还是一句白话时报 `compose-uncompiled`。标签不合法，或写成 YAML 槽，报 `compose-invalid`。

```garden compose
<intent>
用三张卡加向下箭头讲清 sync → build → validate；读者点每一步，下面展开对应说明。
</intent>
# 站点发布流水线

三步串起来，点哪步看哪步

<steps>
  <step id="sync">
    <badge>1</badge>
    <title>sync</title>
    <text>同步内容与配置</text>
    <note>先对齐远程与本地材料</note>
  </step>
  <step id="build">
    <badge>2</badge>
    <title>build</title>
    <text>生成静态 HTML</text>
    <note>构建期把 compose 渲进正文</note>
  </step>
  <step id="validate">
    <badge>3</badge>
    <title>validate</title>
    <text>检查后再上线</text>
    <note>钩子拦住未编译的想法块</note>
  </step>
</steps>
```

`#` 标题和下面的段落是 Markdown 叶子，和 `<steps>` 编进同一棵树。

```garden compose
<intent>
两张卡用向右箭头连起来，每张卡上有徽标和指标。点一张卡，看对应说明。
</intent>
<row>
  <box id="sync" tone="accent">
    <badge>1</badge>
    <title>sync</title>
    <kpi value="12" unit="ms" label="对齐"/>
    <text>同步内容与配置</text>
    <note>先对齐远程与本地材料</note>
  </box>
  <arrow dir="right"/>
  <box id="build">
    <title>build</title>
    <text>生成静态 HTML</text>
    <note>构建期把 compose 渲进正文</note>
  </box>
</row>
```

## 标签

作者原话放在 `<intent>` 里，不画出来。其余叶子用 Markdown，结构用下面这些标签。不要写 `{@body}`、`{#if}`、表达式、脚本、色值或宽度。

| 标签 | 作用 |
| :--- | :--- |
| `#` 标题、段落、`**强调**`、列表 | 和标签进同一棵树。标题变成 title，段落变成 text |
| `<box>` | 一张卡。`frame` 是 `card`、`band`、`text`、`pill`。`tone` 是 `plain`、`accent`、`tip`、`muted` |
| `<band>` / `<pill>` | `box` 的两种框。`<pill>` 里的一句会当成标题 |
| `<row>` / `<stack>` / `<grid>` | 横排、竖排、横排格子 |
| `<title>` / `<text>` | 短名字，和名字下面的一句。`text` 可以写 `tone="muted"`、`align="center"` 或 `align="start"` |
| `<badge>` | 徽标。一个圆圈数字会画成序号 |
| `<kpi value unit label/>` | 一个指标 |
| `<arrow dir="down"/>` | 箭头。`dir` 还有 `right`。窄屏上向右的箭头会改成向下 |
| `<fan n="3"/>` | 并排的几根向下箭头。下一行格子数要相同 |
| `<join>` | V 形连接，字写在缺口里 |
| `<lanes>` | 泳道。里面是 `<actor>` 和 `<message from="1" to="2" tone="forward">`。`tone` 是 `forward` 或 `back` |
| `<divider/>` | 分隔线 |
| `<steps>` / `<step id>` / `<note>` | 点一步，只看这一步的说明 |
| `<compare>` / `<item>` | 2 到 4 项对照 |
| `<callout tone="tip">` | 一句提示。`tone` 是 `note`、`tip`、`warn` |

`tone="accent"` 和 `tone="tip"` 是两种强调，和泳道的 `forward` / `back` 同一对颜色。`muted` 是中性的一层，不是一句样式要求。

嵌套最多 8 层，整张图最多 80 个标签。没闭合的标签直接报错，不会在半截上补齐。

## 限制与报错

- 点开一步时，说明出现在这一步下面。同一张图里同时只展开一条。不打开 JavaScript 也能点开。
- 正文还是一句想法时报 `compose-uncompiled`。草稿里可以留着，发布前必须编译。
- 颜色只来自主题变量。外框用页面的纸色，不另铺一张发白的卡片。
