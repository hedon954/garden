---
title: Relationship Diagram (relations)
navTitle: relations
description: Place 3 to 6 elements on a circle and connect them with explicit solid or dashed, one-way or two-way labeled links; narrow screens list each node's links in one column.
section: components
order: 40
badge: relations
---

`garden relations` places 3 to 6 elements clockwise around a circle (starting with item 1 at the top) and draws only the connections listed in `links`: write a repeating loop as `1 -> 2 -> 3 -> 4 -> 1`, or write a hub-and-spoke or mutual relationship by listing the links between the relevant nodes. Nodes have no emphasis or accent option; every element carries equal visual weight.

Write "use `relations` to draw the four-step loop of picking, reading, talking, and reviewing, plus two dashed cross-links" inside a `garden` idea block, and the Agent generates the loop below via the `garden-ui` skill (hand-written syntax follows).

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

````markdown
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
````

Non-loop relationships use the same `links` list; `direction: both` puts arrowheads on both ends, and `label` places a short caption on the line:

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
caption: The organiser links to the other three; members and the list shape each other.
```

````markdown
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
caption: The organiser links to the other three; members and the list shape each other.
```
````

On narrow screens (container width `560px` or below), the component does not draw the SVG ring or arrows; instead, it stacks the nodes in a single vertical column and lists each node's outgoing links as text underneath (`→` for solid one-way, `⇢` for dashed one-way, `↔` for solid two-way, and `⇠⇢` for dashed two-way, followed by the target node's title and `label`; `direction: both` links appear under both endpoint nodes).

- **Use when**: Three to six key elements where the reader needs to see what influences what and which links run both ways; loops also use `relations` by writing each step as a `link`.
- **Skip when**: There are more elements, branches, or strict sequential steps; use a ```` ```mermaid ```` flowchart for larger or branching diagrams, or `garden list` for one-pass steps. Having fewer than 3 or more than 6 items, or invalid `links` entries, triggers a `garden-relations` error in `npx garden check`.

| Field | Required | Type | Description |
| :--- | :--- | :--- | :--- |
| `title` | No | string | Heading above the diagram |
| `items` | Yes | array (3 to 6 items) | Nodes placed clockwise around the circle starting at the top |
| `items[].title` | Recommended | string | Node heading (provide at least one of `title` or `text`) |
| `items[].text` | Recommended | string | Short note under the node heading |
| `links` | No | array | Directed or bidirectional links between nodes |
| `links[].from` | Yes | 1-based number (`1..N`) or item `title` | Source node (1-indexed; cannot equal `to`) |
| `links[].to` | Yes | 1-based number (`1..N`) or item `title` | Target node (1-indexed; cannot equal `from`) |
| `links[].style` | No | `"solid"` \| `"dashed"` | Solid line (default) or dashed line |
| `links[].direction` | No | `"one"` \| `"both"` | One-way arrow (default) or arrowheads on both ends |
| `links[].label` | No | string | Short label drawn along the link |
| `caption` | No | string | Caption below the diagram |
