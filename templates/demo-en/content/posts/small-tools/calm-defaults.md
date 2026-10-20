---
title: "02 · Calm Defaults Beat Endless Knobs"
date: 2026-03-29
description: "Good developer and writing tools pick sensible typography, spacing, and validation rules out of the box so authors can focus on the draft."
column: small-tools
tags:
  - SmallTools
  - Design
numbering: true
---

Software with fifty configuration flags often shifts design decisions onto the user before they have written a single page. You end up debugging font stacks and margin variables instead of finishing the paragraph you sat down to write.

## Opinionated Where It Counts

A writing tool should have strong defaults for line length, heading rhythm, code highlighting, and dark mode contrast, while keeping site identity (`site.config.yaml`) in one short file.

### Catching Mistakes Early

Instead of letting a broken frontmatter date or a typo in a component prop slip into production, a single `make check` gate reports the exact file and line number before the static build begins.
