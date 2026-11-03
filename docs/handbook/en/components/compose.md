---
title: Explanation diagram (compose)
navTitle: compose
description: Explain a short flow with cards, arrows, and notes. Click a step to open its note.
section: components
order: 36
badge: compose
---

```garden compose
title: Site publish pipeline
caption: Click a step to read what it does
intent: |
  Three cards and downward arrows for sync, build, then validate. Clicking a step opens its note.
steps:
  - id: sync
    title: sync
    badge: "1"
    text: Sync content and config
  - id: build
    title: build
    badge: "2"
    text: Emit static HTML
  - id: validate
    title: validate
    badge: "3"
    text: Check before shipping
notes:
  - for: sync
    text: Line up remote and local material.
  - for: build
    text: The build renders compose into the page.
  - for: validate
    text: The hook stops an idea that is still prose.
```

- **When to use**: A flow of two to eight steps, where clicking a step shows only that step's note.
- **When to skip**: Use [interactive](/garden/en/components/interactive) when the reader should drag a parameter. Keep a real image or a Mermaid diagram when that already explains it.

In the editor, type `/garden` and choose the compose item. That inserts a `garden compose` fence whose body is one sentence, not a YAML stub. After compile, the fence type stays `garden compose`: the sentence moves into `intent` and the body becomes a YAML tree.

````markdown
```garden compose
Three cards and downward arrows for sync, build, then validate. Clicking a step opens its note.
```
````

Narrow screens stack the diagram into one column. Color comes from theme tokens, so light and dark both stay readable. With JavaScript off, the cards and notes are still in the page.

Every field is in [Component reference · compose](/garden/en/reference/compose). A minimal example is on [Compose example](/garden/en/components/compose-gallery).

[figure](/garden/en/components/figure) is deprecated. Old `garden figure` fences still render. New diagrams should be compose.
