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

- **When to use**: Walking through module boundaries or data flow where clicking each button highlights the matching part of the diagram and explains its role.
- **When to skip**: A static image or a `mermaid` diagram does not need interactive region highlighting.

You can tell the AI:

````markdown
```garden
Draw a diagram of the three static publishing steps where clicking each step highlights that box and shows what it does.
```
````

## Fields

Every field, default, limit and error code is in [Component reference · figure](/garden/en/reference/figure).
