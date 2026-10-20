---
title: Key Figures (stat)
navTitle: stat
description: Display 2 to 4 key numbers, units, and short captions side by side.
section: components
order: 32
badge: stat
---

```garden stat
items:
  - label: Reading Column
    value: "740"
    unit: px
    caption: Default prose column width
  - label: Wide Figure Limit
    value: "1040"
    unit: px
    caption: Extends up to 150px on each side
  - label: Wide Table Limit
    value: "1340"
    unit: px
    caption: Extends up to 300px on each side
```

- **When to use**: Pulling 2 to 4 core numbers, thresholds, or specs out of prose so readers can scan them side by side.
- **When to skip**: You only have one number (keep it in prose), the number changes with user input (use [`interactive`](/garden/en/components/interactive)), or you have multiple rows and columns (use a Markdown table).

You can tell the AI:

````markdown
```garden
Put the three width limits for the reading column, wide figures, and wide tables side by side so they are easy to scan.
```
````

## Fields

Fence header: ` ```garden stat `. Place multiple figures in `items` (2 to 4 items recommended); for a single figure, fields can be placed at the top level.

| Field | Required | Allowed Values & Limits | Description |
| :--- | :--- | :--- | :--- |
| `items` | Required for multiple figures | object[] (2 to 4 items recommended) | List of stat items displayed side by side |
| `label` | Required | string | Metric name shown above the number |
| `value` | Required | string or number | Primary figure rendered in large tabular type |
| `unit` | Optional | string | Unit shown immediately to the right of `value` |
| `caption` | Optional | string | Short note below the figure |
| `text` | Optional | string | Additional explanatory text |
| `source` | Optional | URL, `{ url, site?, icon? }`, or array | Source attribution chip |
