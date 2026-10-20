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

You can tell the AI:

````markdown
```garden
Draw how picking, reading, talking, and reviewing feed into each other as a loop, and show that talking also shapes the next pick.
```
````

## Center Node & Outer Ring

When one element sits in the middle and holds the others together, the AI sets `center: <number|title>` between `items` and `links` (there is no auto-detection; that element is placed in the center while the remaining elements are spaced evenly on the outer ring starting at the top, clockwise):

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

On narrow screens, the cards stack in a single column instead of a ring; link labels are not dropped—they move off the lines into each card's relation line (for example, `→ Venue limits` or `⇠⇢ Reading list nominate`).

- **When to use**: Three to six key elements where the reader needs to see what influences what, which links run both ways, how steps form a repeating loop, or how one central element connects to the rest.
- **When to skip**: There are more elements, branches, or one-pass steps; use a `mermaid` flowchart for larger or branching diagrams, or [`list`](/garden/en/components/list) for one-pass steps.
