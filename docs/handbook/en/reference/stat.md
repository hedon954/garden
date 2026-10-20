---
title: Component reference · stat
navTitle: stat
description: Display 2 to 4 key numbers, units, and short captions side by side.
section: reference
order: 2
badge: stat
---

[← Component reference](/garden/en/reference) · [Usage: stat](/garden/en/components/stat)

## Examples

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

## Syntax

````markdown
```garden stat
items:        # for several, 2–4 suggested
  - label:    # required, label
    value:    # required, number
    unit:     # optional, unit
    caption:  # optional, short note
    text:     # optional, extra text
    source:   # optional, source URL
```
````

## Fields

Fence header: ` ```garden stat ` (snippet trigger `;gstat`). Place multiple figures in `items`, or place fields at the top level for a single figure; invalid YAML or unknown top-level keys report `garden-yaml` on the block.

| Field | Required | Default | Allowed Values & Limits | Description |
| :--- | :--- | :--- | :--- | :--- |
| `items` | Required for multiple figures | `[top-level object]` | object[] (`2` to `4` items recommended, not checked) | List of stat items displayed side by side; when omitted, top-level fields render as a single stat item |
| `label` | Required | `""` | string | Metric name shown above the number |
| `value` | Required | `""` | string or number | Primary figure rendered in large tabular type |
| `unit` | Optional | none | string | Unit shown immediately to the right of `value` |
| `caption` | Optional | none | string | Short note below the figure |
| `text` | Optional | none | string | Additional explanatory text |
| `source` | Optional | none | URL, `{ url, site?, icon? }`, or array | Source attribution chip (`site` defaults to the URL hostname without `www.`) |

## Limits & errors

- Apart from the shared `garden-yaml`, this component has no error codes of its own; values marked "not checked" in the table never report an error.
