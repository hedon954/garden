---
title: Bar Chart (chart)
navTitle: chart
description: Render proportional horizontal bars with a built-in expandable data table underneath.
section: components
order: 35
badge: chart
---

```garden chart
title: Max Width by Layout Zone
xLabel: Layout Zone
yLabel: Max Width
unit: px
data:
  - x: Prose Column
    y: 740
  - x: Wide Figure Zone
    y: 1040
  - x: Wide Table Zone
    y: 1340
caption: Click "View data table" below to expand the full numeric table.
```

You can tell the AI:

````markdown
```garden
Compare the max widths of the prose column, wide figures, and wide tables with a horizontal bar chart.
```
````

- **When to use**: Comparing the relative magnitudes of 2 to 8 values that share the same unit.
- **When to skip**: You already have a Markdown table with the same numbers in that section (the chart includes its own expandable table).
