---
title: Compose example
navTitle: Example
description: A minimal garden compose example. Color comes from the theme tokens in both light and dark.
section: components
order: 36.5
badge: compose
---

A compose diagram is a `garden compose` fence. The fence starts as one sentence. After compile, that sentence stays in `intent` and the body is a YAML tree. Color comes only from the theme tokens.

Every field is in [Component reference · compose](/garden/en/reference/compose).

```garden compose
intent: |
  A minimal example: a tinted title, a down arrow, and a footnote.
tree:
  - card:
      frame: band
      tone: accent
      align: center
      title: Start with the point
      text: The tint wraps only the layer being emphasized
  - arrow: down
  - type: text
    text: "A footnote uses muted. align: start keeps it on the left."
    tone: muted
    align: start
```
