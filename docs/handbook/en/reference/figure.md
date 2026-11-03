---
title: Component reference · figure
navTitle: figure
description: Deprecated. Old garden figure fields stay documented here. New diagrams use compose.
section: reference
order: 13
badge: figure
---

[← Component reference](/garden/en/reference) · [Usage: figure](/garden/en/components/figure)

## Deprecated

New diagrams use [compose](/garden/en/reference/compose). This page only records the old fields. Do not write a new `garden figure`.

## Syntax

````markdown
```garden figure
svg: |      # one of three, inline SVG
image:      # one of three, image path
mermaid: |  # one of three, Mermaid
alt:        # optional, alt text
parts:      # optional, buttons
  - id:     # matches data-p
    label:  # required, button (or name)
    text:   # required, description
caption:    # optional, caption
```
````

## Fields

Fence header: ` ```garden figure ` (snippet trigger `;gfigure`). Invalid YAML or unknown top-level keys report `garden-yaml` on the block.

| Field | Required | Default | Allowed Values & Limits | Description |
| :--- | :--- | :--- | :--- | :--- |
| `svg` | One of `svg`, `image`, or `mermaid` | `<svg>` body below `---` or `""` | multiline `<svg>` string | Inline SVG markup; tag elements to highlight with `data-p="<id>"` (use CSS variables such as `var(--card)`, `var(--ink)`, and `var(--muted)` so dark mode works) |
| `image` | One of `image`, `svg`, or `mermaid` | none | path string | Path to a static diagram image |
| `alt` | Optional | `caption` (then `""`) | string | Alt text for `image` |
| `mermaid` | One of `mermaid`, `svg`, or `image` | none | multiline string | Mermaid diagram source |
| `parts` | Optional | `[]` (initial selection defaults to `parts[0].id` or `"all"`) | object[] | Interactive buttons above the diagram and matching explanations below |
| `parts[].id` | Recommended | `parts[].name` or `parts[].label` | string | Matches `data-p` on SVG elements (an id of `"all"` highlights every region) |
| `parts[].label` | Required (or `name`) | `"Part N"` (1-based) | string | Button label |
| `parts[].text` | Required | `""` | string | Explanation shown below the diagram when the button is active |
| `caption` | Optional | none | string | Caption below the frame |

## Limits & errors

- Apart from the shared `garden-yaml`, this component has no error codes of its own; values marked "not checked" in the table never report an error.
