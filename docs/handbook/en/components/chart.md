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

- **When to use**: Comparing the relative magnitudes of 2 to 8 values that share the same unit.
- **When to skip**: Numbers change with reader input (use [`interactive`](/garden/en/components/interactive)), or you already have a Markdown table with the same numbers in that section (the chart includes its own expandable table).

You can tell the AI:

````markdown
```garden
Compare the max widths of the prose column, wide figures, and wide tables with a horizontal bar chart.
```
````

## Fields

Fence header: ` ```garden chart ` (snippet trigger `;gchart`). Provide rows via `data: [{ x, y, label? }]` or column arrays via `x` + `series`; invalid YAML or unknown top-level keys report `garden-yaml` on the block.

| Field | Required | Default | Allowed Values & Limits | Description |
| :--- | :--- | :--- | :--- | :--- |
| `title` | Recommended | `"Chart"` for `aria-label` (no visible heading) | string | Heading above the chart |
| `data` | Either `data` or `series` | `[]` | `{ x, y, label? }[]` (at least `2` rows and `2` to `8` rows recommended, not checked) | Row entries where `x` is the row label, `y` is the numeric value, and `label` defaults to `y` + `unit` |
| `series` | Either `series` or `data` | none | `{ name?, data: number[] }[]` (at least `2` data points recommended, not checked) | Numeric series paired with an `x` label array (`series[0].data` is rendered) |
| `x` | Optional | `["1", "2", ...]` (1-based row numbers) | string or string[] | Category labels when using `series`, or first-column header string when `xLabel` is omitted |
| `type` | Optional | `"bar"` | `"bar"` | Chart type (horizontal bar chart) |
| `unit` | Optional | `""` | string | Unit suffix appended to values when `data[].label` is omitted |
| `xLabel` | Optional | string `x` or `"Item"` | string | Header for the first column of the expandable data table |
| `yLabel` | Optional | `"Value"` | string | Header for the second column of the expandable data table |
| `caption` | Optional | none | string | Caption below the chart |
