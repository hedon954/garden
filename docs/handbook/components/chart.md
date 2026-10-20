---
title: 条形图表（chart）
navTitle: 条形图表
description: 用 YAML 数据直接生成比例条形图，下方自带可展开的数据表格。
section: components
order: 35
badge: chart
---

在 `garden` 想法块里写一句「用 `chart` 画条形图比较正文列、宽图区和宽表区的宽度上限」，Agent 会按 `garden-ui` skill 生成下面的 `garden chart`（手写格式附后）。

```garden chart
title: 三种版面区域的宽度上限
xLabel: 版面区域
yLabel: 最大宽度
unit: px
data:
  - x: 普通正文列
    y: 740
  - x: 宽幅配图区
    y: 1040
  - x: 多列宽表格
    y: 1340
caption: 点击「查看数据表」可展开完整数值表格。
```

````markdown
```garden chart
title: 三种版面区域的宽度上限
xLabel: 版面区域
yLabel: 最大宽度
unit: px
data:
  - x: 普通正文列
    y: 740
  - x: 宽幅配图区
    y: 1040
  - x: 多列宽表格
    y: 1340
caption: 点击「查看数据表」可展开完整数值表格。
```
````

- **用**：对比 2～8 组同量纲数值的长短比例时。
- **别用**：已经在同一个小节里放了同组数字的 Markdown 表格时不要再画一张 `chart`（图表底部已自带可展开的数据表）。

| 字段 | 必填 | 类型 | 说明 |
| :--- | :--- | :--- | :--- |
| `title` | 建议 | 字符串 | 图表标题 |
| `data` | 是 | `{ x, y, label? }[]`（至少 2 项） | 数据行列表，`x` 为名称，`y` 为数值 |
| `unit` | 否 | 字符串 | 数值后缀单位（当数据项未单独指定 `label` 时自动拼接） |
| `xLabel` | 否 | 字符串 | 展开数据表第一列的表头名称（默认 `项目`） |
| `yLabel` | 否 | 字符串 | 展开数据表第二列的表头名称（默认 `数值`） |
| `caption` | 否 | 字符串 | 图表底部的图注说明 |
