---
title: Component reference · figure
navTitle: figure
description: Pair an SVG diagram with step buttons that highlight each region and show its explanation.
section: reference
order: 6
badge: figure
---

[← Component reference](/garden/en/reference) · [Usage: figure](/garden/en/components/figure)

## Examples

```garden figure
caption: Click the buttons above to highlight each stage
svg: |
  <svg viewBox="0 0 680 110" xmlns="http://www.w3.org/2000/svg" font-family="var(--sans)">
    <rect data-p="sync" x="12" y="18" width="196" height="74" rx="10" fill="var(--card)" stroke="var(--rule-strong)" stroke-width="1.5"/>
    <text data-p="sync" x="110" y="50" text-anchor="middle" font-size="14" font-weight="600" fill="var(--ink)">1. garden sync</text>
    <text data-p="sync" x="110" y="72" text-anchor="middle" font-size="12" fill="var(--muted)">Parse Markdown &amp; image sizes</text>
    <path d="M214 55 H236" stroke="var(--muted)" stroke-width="1.5"/>
    <rect data-p="build" x="242" y="18" width="196" height="74" rx="10" fill="var(--card)" stroke="var(--rule-strong)" stroke-width="1.5"/>
    <text data-p="build" x="340" y="50" text-anchor="middle" font-size="14" font-weight="600" fill="var(--ink)">2. garden build</text>
    <text data-p="build" x="340" y="72" text-anchor="middle" font-size="12" fill="var(--muted)">Build static pages &amp; index</text>
    <path d="M444 55 H466" stroke="var(--muted)" stroke-width="1.5"/>
    <rect data-p="validate" x="472" y="18" width="196" height="74" rx="10" fill="var(--card)" stroke="var(--rule-strong)" stroke-width="1.5"/>
    <text data-p="validate" x="570" y="50" text-anchor="middle" font-size="14" font-weight="600" fill="var(--ink)">3. pages:validate</text>
    <text data-p="validate" x="570" y="72" text-anchor="middle" font-size="12" fill="var(--muted)">Check index.html &amp; files</text>
  </svg>
parts:
  - id: sync
    label: 1. Sync Content
    text: Scans `content/` and `docs/handbook/`, copies sidecar assets, and generates `.garden/generated-content.ts`.
  - id: build
    label: 2. Build Pages
    text: Prerenders all routes with `STATIC_EXPORT=1` and outputs RSS, sitemap, and full-text search indexes.
  - id: validate
    label: 3. Validate Export
    text: Runs pages:validate to confirm `index.html` exists and no `.env`, source directories, `.map` or `.md` files, or symlinks are present.
```

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
| `parts[].id` | Recommended | `parts[].name` or `parts[].label` | string | Matches `data-p` on SVG elements (an id of `"all"`, or its Chinese alias `"全部"`, highlights every region) |
| `parts[].label` | Required (or `name`) | `"Part N"` (1-based) | string | Button label |
| `parts[].text` | Required | `""` | string | Explanation shown below the diagram when the button is active |
| `caption` | Optional | none | string | Caption below the frame |

## Limits & errors

- Apart from the shared `garden-yaml`, this component has no error codes of its own; values marked "not checked" in the table never report an error.
