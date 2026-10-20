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

Fence header: ` ```garden stat ` (snippet trigger `;gstat`). Place multiple figures in `items`; for a single figure, fields can be placed at the top level.

| Field | Required | Default | Allowed Values & Limits | Description |
| :--- | :--- | :--- | :--- | :--- |
| `items` | Required for multiple figures | `[top-level object]` | object[] (`2` to `4` items recommended; unknown top-level keys or invalid YAML report `garden-yaml`) | List of stat items displayed side by side; when omitted, top-level fields render as a single stat item |
| `label` | Required | `""` | string | Metric name shown above the number |
| `value` | Required | `""` | string or number | Primary figure rendered in large tabular type |
| `unit` | Optional | none | string | Unit shown immediately to the right of `value` |
| `caption` | Optional | none | string | Short note below the figure |
| `text` | Optional | none | string | Additional explanatory text |
| `source` | Optional | none | URL, `{ url, site?, icon? }`, or array | Source attribution chip (`site` defaults to the URL hostname without `www.`) |
