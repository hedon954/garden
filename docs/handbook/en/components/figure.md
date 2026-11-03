---
title: Annotated diagram (figure)
navTitle: figure
description: Deprecated. New explanation diagrams use compose. Old garden figure fences still render.
section: components
order: 47
badge: figure
---

`garden figure` is deprecated. New diagrams use [compose](/garden/en/components/compose). Fences already in a post still render. Do not write new ones.

The old three-step publish diagram is now compose:

```garden compose
title: Static publish
caption: Click a step to read what it does
intent: |
  Show the three static publish steps. Clicking a step opens its note.
steps:
  - id: sync
    title: Sync content
    text: Scan the post and its sidecar files
  - id: build
    title: Build pages
    text: Prerender routes, RSS, and search
  - id: validate
    title: Validate export
    text: Confirm the export has index.html
notes:
  - for: sync
    text: Scans the post and sidecar files and writes the site content data.
  - for: build
    text: Prerenders every route and writes RSS, the sitemap, and the search index.
  - for: validate
    text: Confirms the export directory contains index.html and no source or config files.
```

The old fields remain in [Component reference · figure](/garden/en/reference/figure).
