---
title: Annotated Diagram (figure)
navTitle: figure
description: Pair an SVG diagram with step buttons that highlight each region and show its explanation.
section: components
order: 36
badge: figure
---

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

- **When to use**: Walking through module boundaries or data flow where clicking each button highlights the matching part of the diagram and explains its role.
- **When to skip**: A static image or a `mermaid` diagram does not need interactive region highlighting.

You can tell the AI:

````markdown
```garden
Draw a diagram of the three static publishing steps where clicking each step highlights that box and shows what it does.
```
````

## Fields

Fence header: ` ```garden figure `.

| Field | Required | Allowed Values & Limits | Description |
| :--- | :--- | :--- | :--- |
| `svg` | One of `svg`, `image`, or `mermaid` | multiline `<svg>` string | Inline SVG markup; tag elements to highlight with `data-p="<id>"` (use CSS variables such as `var(--card)`, `var(--ink)`, and `var(--muted)` so dark mode works) |
| `image` | One of `image`, `svg`, or `mermaid` | path string | Path to a static diagram image |
| `alt` | Optional | string | Alt text for `image` |
| `mermaid` | One of `mermaid`, `svg`, or `image` | multiline string | Mermaid diagram source |
| `parts` | Optional | object[] | Interactive buttons above the diagram and matching explanations below |
| `parts[].id` | Recommended | string | Matches `data-p` on SVG elements (falls back to `name` or `label`; `"all"` highlights all regions) |
| `parts[].label` | Required (or `name`) | string | Button label |
| `parts[].text` | Required | string | Explanation shown below the diagram when the button is active |
| `caption` | Optional | string | Caption below the frame |
