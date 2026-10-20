---
title: Component reference · relations
navTitle: relations
description: Place 3 to 6 elements on an ellipse or around a center node and connect them with solid or dashed, one-way or two-way labeled links.
section: reference
order: 10
badge: relations
---

[← Component reference](/garden/en/reference) · [Usage: relations](/garden/en/components/relations)

## Examples

```garden relations
items:
  - title: Pick
    text: Choose this month's book
  - title: Read
    text: Finish the agreed chapters each week
  - title: Talk
    text: Meet and share views
  - title: Review
    text: Note what to change next time
links:
  - from: 1
    to: 2
  - from: 2
    to: 3
  - from: 3
    to: 4
  - from: 4
    to: 1
  - from: 3
    to: 1
    style: dashed
    label: shapes the pick
  - from: 2
    to: 4
    style: dashed
caption: The four steps feed each other instead of running once in a fixed order.
```

```garden relations
items:
  - title: Organiser
    text: Sends one notice a month
  - title: Members
    text: Eight to ten neighbours
  - title: Venue
    text: Café or library
  - title: Reading list
    text: Members take turns to nominate
center: Organiser
links:
  - from: 1
    to: 2
    label: invites
  - from: 1
    to: 3
    label: books
  - from: 1
    to: 4
    label: collects
  - from: 2
    to: 4
    style: dashed
    direction: both
    label: nominate
caption: The organiser sits in the center and links to the other three; members and the list shape each other.
```

## Syntax

````markdown
```garden relations
title:          # optional, aria only
items:          # required, 3–6
  - title:      # required, name
    text:       # optional, short note
center:         # optional, # or title
links:          # optional, list
  - from:       # required, # or title
    to:         # required, not from
    style:      # solid | dashed
    direction:  # one | both
    label:      # optional, short label
caption:        # optional, caption
```
````

## Fields

Fence header: ` ```garden relations ` (snippet trigger `;grel`). Nodes have no emphasis or accent option—every element carries equal visual weight; ` ```mermaid ` fences are supported for any other diagram, and `garden list` covers one-pass steps. Invalid YAML or unknown top-level keys report `garden-yaml` on the block.

| Field | Required | Default | Allowed Values & Limits | Description |
| :--- | :--- | :--- | :--- | :--- |
| `title` | Optional | `"Relationship diagram"` for `aria-label` (no visible heading) | string | Heading above the diagram |
| `items` | Required | none | object[], strictly `3` to `6` items (fewer than `3` or more than `6` items reports `garden-relations`) | Elements in the diagram; when `center` is omitted, all items are spaced evenly on an ellipse starting at the top (12 o'clock), clockwise |
| `items[].title` | Required | `""` | string | Node heading (`links` and `center` reference items by 1-based number or exact `title`) |
| `items[].text` | Optional | `""` | string | Short note below the node heading |
| `center` | Optional | none (all items on the outer ellipse) | `1..N` (1-based number) or exact item `title` (an unknown index or title reports `garden-relations`) | Placed between `items` and `links`: puts that element in the middle and spaces the remaining elements evenly on the outer ring starting at the top, clockwise; no auto-detection |
| `links` | Optional | `[]` | object[] (non-array or entry with unknown keys reports `garden-relations`) | Directed or bidirectional links between elements; neighbour outer-ring links bow outward while others run straight through the middle; write a repeating loop by listing each step (`1->2`, `2->3`, `3->4`, `4->1`) |
| `links[].from` | Required | none | `1..N` (1-based number) or exact item `title`, cannot equal `to` (missing, unknown target, or `from === to` reports `garden-relations`) | Source element |
| `links[].to` | Required | none | `1..N` (1-based number) or exact item `title`, cannot equal `from` (missing, unknown target, or `from === to` reports `garden-relations`) | Target element |
| `links[].style` | Optional | `"solid"` | `"solid"` \| `"dashed"` (any other value reports `garden-relations`) | Solid line (`→` / `↔`) or dashed line (`⇢` / `⇠⇢`) |
| `links[].direction` | Optional | `"one"` | `"one"` \| `"both"` (any other value reports `garden-relations`) | One-way arrow toward `to` or arrowheads on both ends |
| `links[].label` | Optional | `""` | short string (non-string value reports `garden-relations`) | Short label along the line (dodges line crossings; when it does not fit on its line it becomes a circled number listed under the graph, e.g. `① limits: Budget → Venue`) |
| `caption` | Optional | none | string | Caption below the diagram |

## Limits & errors

- `garden-relations`: fewer than 3 or more than 6 `items`; `center` matches no item; `links` is not a list or an entry has unknown keys; `from` / `to` missing, unknown or equal; a wrong `style` or `direction`; a `label` that is not a string.
- For more elements or branches, use a ```` ```mermaid ```` flowchart; for one-pass steps, use `garden list`.
