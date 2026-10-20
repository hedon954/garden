---
title: Key Figures (stat)
navTitle: stat
description: Display 2 to 4 key numbers, units, and short captions side by side.
section: components
order: 32
badge: stat
---

Write "use `stat` to list the width limits for the prose column, wide figures, and wide tables" inside a `garden` idea block, and the Agent generates the `garden stat` block below via the `garden-ui` skill (hand-written syntax follows).

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

````markdown
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
````

- **Use when**: Pulling 2 to 4 core numbers, thresholds, or specs out of prose so readers can scan them side by side.
- **Skip when**: You only have one number (keep it in prose) or you have multiple rows and columns (use a Markdown table).

| Field | Required | Type | Description |
| :--- | :--- | :--- | :--- |
| `items` | No | object[] | Array of stat items; for a single stat you can place the fields at the top level |
| `label` | Yes | string | Metric name shown above the number |
| `value` | Yes | string or number | Primary figure rendered in large tabular type |
| `unit` | No | string | Unit shown immediately to the right of `value` |
| `caption` | No | string | Short note below the figure |
| `text` | No | string | Additional explanatory text |
| `source` | No | string or `{ title, url }` | Source attribution badge |
