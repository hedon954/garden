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
  <svg viewBox="0 0 560 194" xmlns="http://www.w3.org/2000/svg" font-family="var(--sans)" style="max-width: 380px; margin-inline: auto">
    <rect data-p="sync" x="2" y="4" width="180" height="186" rx="16" fill="var(--card)" stroke="var(--rule-strong)" stroke-width="2.5"/>
    <text data-p="sync" x="92" y="42" text-anchor="middle" font-size="24" font-weight="600" fill="var(--ink)">1. garden</text>
    <text data-p="sync" x="92" y="72" text-anchor="middle" font-size="24" font-weight="600" fill="var(--ink)">sync</text>
    <text data-p="sync" x="92" y="108" text-anchor="middle" font-size="24" fill="var(--muted)">Parse</text>
    <text data-p="sync" x="92" y="137" text-anchor="middle" font-size="24" fill="var(--muted)">Markdown &amp;</text>
    <text data-p="sync" x="92" y="166" text-anchor="middle" font-size="24" fill="var(--muted)">image sizes</text>
    <path d="M183.5 97 H188.5" stroke="var(--muted)" stroke-width="2.5"/>
    <rect data-p="build" x="190" y="4" width="180" height="186" rx="16" fill="var(--card)" stroke="var(--rule-strong)" stroke-width="2.5"/>
    <text data-p="build" x="280" y="42" text-anchor="middle" font-size="24" font-weight="600" fill="var(--ink)">2. garden</text>
    <text data-p="build" x="280" y="72" text-anchor="middle" font-size="24" font-weight="600" fill="var(--ink)">build</text>
    <text data-p="build" x="280" y="108" text-anchor="middle" font-size="24" fill="var(--muted)">Build static</text>
    <text data-p="build" x="280" y="137" text-anchor="middle" font-size="24" fill="var(--muted)">pages &amp; index</text>
    <path d="M371.5 97 H376.5" stroke="var(--muted)" stroke-width="2.5"/>
    <rect data-p="validate" x="378" y="4" width="180" height="186" rx="16" fill="var(--card)" stroke="var(--rule-strong)" stroke-width="2.5"/>
    <text data-p="validate" x="468" y="42" text-anchor="middle" font-size="24" font-weight="600" fill="var(--ink)">3. pages:</text>
    <text data-p="validate" x="468" y="72" text-anchor="middle" font-size="24" font-weight="600" fill="var(--ink)">validate</text>
    <text data-p="validate" x="468" y="108" text-anchor="middle" font-size="24" fill="var(--muted)">Check</text>
    <text data-p="validate" x="468" y="137" text-anchor="middle" font-size="24" fill="var(--muted)">index.html &amp;</text>
    <text data-p="validate" x="468" y="166" text-anchor="middle" font-size="24" fill="var(--muted)">files</text>
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
