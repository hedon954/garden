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

Every field is in [Component reference · compose](/garden/en/reference/compose). Each section below is one small diagram. A narrow screen stacks a row into a column.

## Band, pill, and plain title

```garden compose
intent: |
  Three frames: a tinted band, a white pill, and a title with no frame.
tree:
  - stack:
      align: center
      children:
        - card:
            frame: band
            tone: accent
            align: center
            title: Tinted band
            text: Wraps only the layer you want to emphasize
        - arrow: down
        - card:
            frame: pill
            align: center
            title: White pill
        - arrow: down
        - card:
            frame: text
            align: center
            title: Plain title
            text: A grey line can sit under the title
```

## A row with arrows

```garden compose
intent: |
  Three cards linked by arrows pointing right.
tree:
  - row:
      align: center
      children:
        - card:
            align: center
            title: Collect
            text: Gather the material
        - arrow: right
        - card:
            align: center
            title: Decide
            text: Keep what is useful
        - arrow: right
        - card:
            align: center
            title: Hand off
            text: Pass it on
```

## Badge and metric

```garden compose
intent: |
  One card carries an index badge and a metric.
tree:
  - card:
      tone: accent
      align: center
      title: Align
      badge: "1"
      kpi:
        value: 12
        unit: ms
        label: time
      text: The badge and the number both sit on the card
```

## Divider

```garden compose
intent: |
  Two titles split by a divider, then a footnote.
tree:
  - title:
      text: The step above
      align: center
  - divider:
  - title:
      text: The step below
      align: center
  - type: text
    text: The footnote stays left and uses muted.
    tone: muted
    align: start
```

## A fan of arrows

```garden compose
intent: |
  One title fans out through three arrows to three names.
tree:
  - stack:
      align: center
      children:
        - title:
            text: One point, three ways
            align: center
        - fan: 3
        - row:
            align: center
            children:
              - title:
                  text: One
                  align: center
              - title:
                  text: Two
                  align: center
              - title:
                  text: Three
                  align: center
```

## A V join

```garden compose
intent: |
  Two titles meet on one shared line.
tree:
  - row:
      align: center
      children:
        - title:
            text: Left
            align: center
        - title:
            text: Right
            align: center
  - join: Both meet here
```

## Two emphasis tones

```garden compose
intent: |
  accent and tip are two tints. A muted pill is a neutral grey.
tree:
  - row:
      align: center
      children:
        - card:
            frame: band
            tone: accent
            align: center
            title: accent
            text: First emphasis
        - card:
            frame: band
            tone: tip
            align: center
            title: tip
            text: Second emphasis
        - card:
            frame: pill
            tone: muted
            align: center
            title: muted
```

## Lanes

```garden compose
intent: |
  Two actors, one message each way. The label sits above the arrow.
tree:
  - lanes:
      actors:
        - Caller
        - Service
      messages:
        - from: 1
          to: 2
          text: Send a request
          tone: forward
        - from: 2
          to: 1
          text: Return a result
          tone: back
```

## Compare and a tip

```garden compose
intent: |
  A small comparison, then a tip.
tree:
  - compare:
      items:
        - title: Write it down first
          text: Smaller scope, cheaper to change
        - title: Build the whole thing
          text: See the full shape once
  - callout:
      tone: tip
      text: The comparison only names the difference.
```
