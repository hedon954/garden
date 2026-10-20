---
title: "Keeping Anchor Links Stable Across Refreshes"
date: 2026-03-24
description: "Small details that make deep links to section headings reliable: deterministic slugs, scroll-padding for sticky headers, and hash restoration."
tags:
  - Web
  - Engineering
  - UX
---

Sharing a link to a specific section of a technical article (`#keeping-anchor-links-stable`) should land the reader right on that heading, not three paragraphs above it or hidden underneath a fixed navigation bar.

## Deterministic Heading Slugs

When headings are numbered automatically in the UI, the URL slug should still come from the heading words alone so reordering or inserting a section does not break existing bookmarks.

## Scroll Padding and Layout Stability

Two things commonly knock a hash jump off target: late-loading images that shift page height after the browser scrolls, and client hydration replacing a server-rendered list. Recording image dimensions ahead of time and restoring the hash position once after mount keeps deep links dependable.
