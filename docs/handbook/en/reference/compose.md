---
title: Component reference · compose
navTitle: compose
description: A YAML tree rendered at build time into a static explanation diagram.
section: reference
order: 6
badge: compose
---

[← Component reference](/garden/en/reference) · [Usage: compose](/garden/en/components/compose)

## Example

```garden compose
title: Site publish pipeline
caption: Click a step to read what it does
intent: |
  Three cards and downward arrows for sync, build, then validate. Clicking a step opens its note.
steps:
  - id: sync
    title: sync
    text: Sync content and config
  - id: build
    title: build
    text: Emit static HTML
  - id: validate
    title: validate
    text: Check before shipping
notes:
  - for: sync
    text: Line up remote and local material
  - for: build
    text: The build renders compose into the page
  - for: validate
    text: The hook stops an uncompiled idea
```

For a row with a badge, a metric, and an arrow, put the nodes under `tree`. A narrow screen still uses one column.

```garden compose
title: Sync, then build
caption: Click a card to read its note
intent: |
  Two cards joined by a rightward arrow, each with a badge or a short line.
tree:
  - row:
      - card:
          id: sync
          tone: accent
          title: sync
          badge: "1"
          kpi:
            value: 12
            unit: ms
            label: align
          text: Sync content and config
      - arrow: right
      - card:
          id: build
          title: build
          text: Emit static HTML
  - notes:
      - for: sync
        text: Line up remote and local material
      - for: build
        text: The build renders compose into the page
```

## Fields

Fence header: ` ```garden compose `. A body that is still prose reports `compose-uncompiled`. A YAML tree that breaks the catalog reports `compose-invalid`.

| Field | Required | Default | Allowed values and limits | Description |
| :--- | :--- | :--- | :--- | :--- |
| `title` | Optional | none | string | Title inside the frame. It does not enter the table of contents |
| `caption` | Optional | none | string | One line under the title |
| `intent` | Optional | none | string | The author's sentence. It is not drawn |
| `steps` | One of `steps` or `tree` | none | 1 to 8 items | Step cards, stacked or in a row |
| `notes` | With `steps` | none | 1 to 8 items | `for` names an `id` |
| `tree` | One of `tree` or `steps` | none | node list | Nested tree. `children` is an alias |
| `steps[].id` | Required when notes point at it | none | starts with a letter | Target for a note |
| `steps[].title` | Required | none | string | Card title |
| `steps[].text` | Optional | none | string | One line on the card |
| `steps[].badge` | Optional | none | string or `{ text, tone }` | Badge |
| `steps[].kpi` | Optional | none | `{ value, label?, unit? }` | One metric |
| `steps[].tone` | Optional | `plain` | `plain`, `accent`, `tip`, `muted` | Card fill. `accent` and `tip` are the two emphasis fills |
| `notes[].for` | Required | none | an existing `id` | Which card opens this note |
| `notes[].text` | Required | none | string | The note itself |

Nodes allowed under `tree`: `stack`, `row`, `card`, `title`, `text`, `steps`, `compare`, `callout`, `divider`, `badge`, `kpi`, `arrow`, `fan`, `join`, `lanes`, `notes`.

Assemble a diagram from these atoms. Do not add a style that only one picture uses.

| What you are drawing | Write |
| --- | --- |
| Soft full-width band | `card` + `frame: band`. `tone: accent` and `tone: tip` are the two emphasis fills, the same pair as lane `forward` and `back` |
| Small capsule | `card` + `frame: pill`. `plain` is a white hairline capsule, `tone: muted` is the soft neutral fill, `tone: accent` is the emphasis fill |
| Plain title block | `card` + `frame: text` |
| Bordered card | `card` |
| Circled index | `badge: "①"` |
| Shield | `mark: shield` |
| Downward arrow | `arrow: down` |
| A row of downward arrows | `fan: 3`, then a `row` with the same number of cells |
| V connector with the label in the notch | `join: one sentence`. The arms and the short stem are one polyline, opening upward |
| Swimlane | `lanes`. Header capsules shrink to their text. The label sits above the shaft. `tone: forward` and `back` use two emphasis colors |
| Footer | `text` + `tone: muted` |
| Two-by-two | two `row` nodes, two cells each |

The line under a title on `frame: band` or `frame: text` is the gray subtitle. Inside a centered `stack`, a left footer uses `align: start`.

- `arrow` direction is `down` or `right`. On a narrow screen a rightward arrow points down.
- `callout` tone is `note`, `tip`, or `warn`.
- `compare` takes 2 to 4 items, each with `title` and optional `text`.
- Do not write HTML, scripts, color values, or widths. Color comes from theme tokens.
- Nesting stops at 8 levels, and one diagram holds at most 80 nodes. A clickable card cannot contain another clickable card.

## Limits and errors

- Opening a step shows its note directly underneath. Only one note in a diagram is open at a time. It works with JavaScript disabled.
- A body that is not a YAML tree (still one sentence) reports `compose-uncompiled`. Drafts may keep it. Publishing requires a tree.
- A bad shape, an unknown node, a `for` that matches nothing, or a repeated `id` reports `compose-invalid`.
