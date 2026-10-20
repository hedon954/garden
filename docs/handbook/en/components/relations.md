---
title: Relationship Diagram (relations)
navTitle: relations
description: Place 3 to 6 elements on a circle or around a center node and connect them with solid or dashed, one-way or two-way labeled links.
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

On narrow screens (container width `560px` or below), the cards stack in a single column instead of a ring; link labels are not dropped—they move off the lines into each card's relation line (for example, `→ Venue limits` or `⇠⇢ Reading list nominate`, with `direction: both` links listed under both endpoint cards).

## Fields

Fence header: ` ```garden relations `. Nodes have no emphasis or accent option—every element carries equal visual weight. Having fewer than 3 or more than 6 items, an unknown `center`, or invalid `links` fails the build and `npx garden check` with `garden-relations`.

| Field | Required | Allowed Values & Limits | Description |
| :--- | :--- | :--- | :--- |
| `title` | Optional | string | Heading above the diagram |
| `items` | Required | object[] (strictly `3` to `6` items) | Elements in the diagram; when `center` is omitted, all items are spaced evenly on the ring starting at the top (12 o'clock), clockwise |
| `items[].title` | Recommended | string | Node heading (provide at least one of `title` or `text`) |
| `items[].text` | Recommended | string | Short note below the node heading |
| `center` | Optional | `1..N` (1-based number) or item `title` | Placed between `items` and `links`: puts that element in the middle and spaces the remaining elements evenly on the outer ring starting at the top, clockwise; no auto-detection, and an unknown `center` fails the build |
| `links` | Optional | object[] | Directed or bidirectional links between elements; write a repeating loop by listing each step (`1->2`, `2->3`, `3->4`, `4->1`) |
| `links[].from` | Required | `1..N` (1-based number) or item `title` | Source element (cannot equal `to`) |
| `links[].to` | Required | `1..N` (1-based number) or item `title` | Target element (cannot equal `from`) |
| `links[].style` | Optional | `"solid"` (default) \| `"dashed"` | Solid line (`→` / `↔`) or dashed line (`⇢` / `⇠⇢`) |
| `links[].direction` | Optional | `"one"` (default) \| `"both"` | One-way arrow toward `to` or arrowheads on both ends |
| `links[].label` | Optional | string | Short label along the line (dodges line crossings on desktop, and moves off the line into each card's relation line on narrow screens, e.g. `→ Venue limits`) |
| `caption` | Optional | string | Caption below the diagram |
