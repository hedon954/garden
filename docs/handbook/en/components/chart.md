---
title: Bar Chart (chart)
navTitle: chart
description: Render proportional horizontal bars from YAML data, with a built-in expandable table underneath.
section: components
order: 35
badge: chart
---

Write "use `chart` to compare the max widths of the prose column, wide figures, and wide tables" inside a `garden` idea block, and the Agent generates the `garden chart` block below via the `garden-ui` skill (hand-written syntax follows).

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

- **Use when**: Comparing the relative magnitudes of 2 to 8 values that share the same unit.
- **Skip when**: You already have a Markdown table with the same numbers in that section (`chart` includes its own expandable table).

| Field | Required | Type | Description |
| :--- | :--- | :--- | :--- |
| `title` | Recommended | string | Chart heading |
| `data` | Yes | `{ x, y, label? }[]` (at least 2) | Data rows where `x` is the label and `y` is the numeric value |
| `unit` | No | string | Unit suffix appended when a row does not specify its own `label` |
| `xLabel` | No | string | Header for the first column of the expandable table |
| `yLabel` | No | string | Header for the second column of the expandable table |
| `caption` | No | string | Caption shown below the chart |
