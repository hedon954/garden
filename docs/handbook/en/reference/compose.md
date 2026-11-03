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
| `steps[].tone` | Optional | `plain` | `plain`, `accent`, `muted` | Card fill |
| `notes[].for` | Required | none | an existing `id` | Which card opens this note |
| `notes[].text` | Required | none | string | The note itself |

Nodes allowed under `tree`: `stack`, `row`, `card`, `title`, `text`, `steps`, `compare`, `callout`, `divider`, `badge`, `kpi`, `arrow`, `notes`.

- `arrow` direction is `down` or `right`. On a narrow screen a rightward arrow points down.
- `callout` tone is `note`, `tip`, or `warn`.
- `compare` takes 2 to 4 items, each with `title` and optional `text`.
- Do not write HTML, scripts, color values, or widths. Color comes from theme tokens.
- Nesting stops at 8 levels, and one diagram holds at most 80 nodes. A clickable card cannot contain another clickable card.

## Limits and errors

- Opening a step shows its note directly underneath. Only one note in a diagram is open at a time. It works with JavaScript disabled.
- A body that is not a YAML tree (still one sentence) reports `compose-uncompiled`. Drafts may keep it. Publishing requires a tree.
- A bad shape, an unknown node, a `for` that matches nothing, or a repeated `id` reports `compose-invalid`.
