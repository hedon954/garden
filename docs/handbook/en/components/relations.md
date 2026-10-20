---
title: Relationship diagram (relations)
navTitle: relations
description: Place 3 to 6 elements on an ellipse or around a center node and connect them with solid or dashed, one-way or two-way labeled links.
section: components
order: 40
badge: relations
---

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

- **When to use**: Three to six key elements where the reader needs to see what influences what, which links run both ways, how steps form a repeating loop, or how one central element connects to the rest.
- **When to skip**: There are more elements, branches, or one-pass steps; use a `mermaid` flowchart for larger or branching diagrams, or [`list`](/garden/en/components/list) for one-pass steps.

You can tell the AI:

````markdown
```garden
Draw how picking, reading, talking, and reviewing feed into each other as a loop, and show that talking also shapes the next pick.
```
````

## Center Node & Outer Ring (`center`)

When one element sits in the middle and holds the others together, set `center: <number|title>` between `items` and `links` (there is no auto-detection; that element goes in the middle while the remaining elements are spaced evenly on the outer ring starting at the top, clockwise):

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

You can tell the AI:

````markdown
```garden
Put the organiser in the center with members, venue, and reading list around them: the organiser invites members, books the venue, and collects the reading list, while members and the reading list nominate each other.
```
````

On wide screens, elements sit evenly on an ellipse starting at the top (12 o'clock) then clockwise (or with `center` in the middle and the remaining elements spaced evenly on the outer ring starting at the top, clockwise); links between neighbouring outer-ring elements bow gently outward, while non-neighbour or center links go straight through the middle. On narrow screens (container width `560px` or below), no arrows are drawn and the cards stack in a single column, listing outgoing links under each card as `→ Venue · ⇢ Headcount` (`→` solid one-way, `⇢` dashed one-way, `↔` solid both ways, `⇠⇢` dashed both ways); link labels are not dropped—they move off the lines into each card's relation line (for example, `→ Venue limits` or `⇠⇢ Reading list nominate`, with `direction: both` links listed under both endpoint cards).

## Fields

Fence header: ` ```garden relations ` (snippet trigger `grel`). Nodes have no emphasis or accent option—every element carries equal visual weight; ` ```mermaid ` fences are supported for any other diagram, and `garden list` covers one-pass steps.

| Field | Required | Default | Allowed Values & Limits | Description |
| :--- | :--- | :--- | :--- | :--- |
| `title` | Optional | `"Relationship diagram"` for `aria-label` (no visible heading) | string (unknown top-level keys or invalid YAML report `garden-yaml`) | Heading above the diagram |
| `items` | Required | none | object[], strictly `3` to `6` items (fewer than `3` or more than `6` items reports `garden-relations`) | Elements in the diagram; when `center` is omitted, all items are spaced evenly on an ellipse starting at the top (12 o'clock), clockwise |
| `items[].title` | Required | `""` | string | Node heading (`links` and `center` reference items by 1-based number or exact `title`) |
| `items[].text` | Optional | `""` | string | Short note below the node heading |
| `center` | Optional | none (all items on the outer ellipse) | `1..N` (1-based number) or exact item `title` (an unknown index or title reports `garden-relations`) | Placed between `items` and `links`: puts that element in the middle and spaces the remaining elements evenly on the outer ring starting at the top, clockwise; no auto-detection |
| `links` | Optional | `[]` | object[] (non-array or entry with unknown keys reports `garden-relations`) | Directed or bidirectional links between elements; neighbour outer-ring links bow outward while others run straight through the middle; write a repeating loop by listing each step (`1->2`, `2->3`, `3->4`, `4->1`) |
| `links[].from` | Required | none | `1..N` (1-based number) or exact item `title`, cannot equal `to` (missing, unknown target, or `from === to` reports `garden-relations`) | Source element |
| `links[].to` | Required | none | `1..N` (1-based number) or exact item `title`, cannot equal `from` (missing, unknown target, or `from === to` reports `garden-relations`) | Target element |
| `links[].style` | Optional | `"solid"` | `"solid"` \| `"dashed"` (any other value reports `garden-relations`) | Solid line (`→` / `↔`) or dashed line (`⇢` / `⇠⇢`) |
| `links[].direction` | Optional | `"one"` | `"one"` \| `"both"` (any other value reports `garden-relations`) | One-way arrow toward `to` or arrowheads on both ends |
| `links[].label` | Optional | `""` | short string (non-string value reports `garden-relations`) | Short label along the line (dodges line crossings on wide screens, and moves off the line into each card's relation line on narrow screens, e.g. `→ Venue limits`) |
| `caption` | Optional | none | string | Caption below the diagram |
