---
title: Icon List (list)
navTitle: list
description: Pair line icons with short observations in a compact card, or add headings and multi-paragraph notes for divided steps.
section: components
order: 41
badge: list
---

`garden list` renders in two layouts depending on whether items carry a `title`: when items only have `icon` and `text`, it renders a compact icon list card; when any item includes `title`, it renders a divided step list where `text` can be a single string or an array of paragraph strings.

Write "use `list` to show the four things a newcomer does before signing up, with search, eye, heart, and chat icons" inside a `garden` idea block, and the Agent generates the compact icon list below via the `garden-ui` skill (hand-written syntax follows).

```garden list
items:
  - icon: search
    text: Searches for this month's title
  - icon: eye
    text: Reads 3 reviews
  - icon: heart
    text: Saves the event page
  - icon: chat
    text: Asks in the group chat whether listening only is fine
```

````markdown
```garden list
items:
  - icon: search
    text: Searches for this month's title
  - icon: eye
    text: Reads 3 reviews
  - icon: heart
    text: Saves the event page
  - icon: chat
    text: Asks in the group chat whether listening only is fine
```
````

Adding `title` to items switches the block to a divided step list, where `text` can hold multiple paragraphs:

```garden list
items:
  - icon: flask
    title: "Experiment 1: is one book a month too much?"
    text:
      - Pick a novella and a long novel for the first two meetings, and record how many people finish.
      - If the share drops clearly, read only the first half next time.
  - icon: chat
    title: "Experiment 2: how do we get first-timers talking?"
    text:
      - Open half of the meetings with one sentence from each person, and the other half with free discussion.
      - Compare how often first-timers speak.
  - icon: bell
    title: "Experiment 3: how early should the reminder go out?"
    text:
      - Send the reminder three days before one meeting and one day before another, and compare turnout.
```

````markdown
```garden list
items:
  - icon: flask
    title: "Experiment 1: is one book a month too much?"
    text:
      - Pick a novella and a long novel for the first two meetings, and record how many people finish.
      - If the share drops clearly, read only the first half next time.
  - icon: chat
    title: "Experiment 2: how do we get first-timers talking?"
    text:
      - Open half of the meetings with one sentence from each person, and the other half with free discussion.
      - Compare how often first-timers speak.
  - icon: bell
    title: "Experiment 3: how early should the reminder go out?"
    text:
      - Send the reminder three days before one meeting and one day before another, and compare turnout.
```
````

- **Use when**: Listing parallel actions, signals, or practices paired with a line icon, or grouping titled steps with one or more paragraphs each.
- **Skip when**: Items follow a strict numbered sequence or chronological order; use a standard ordered list or `timeline` instead.

| Field | Required | Type | Description |
| :--- | :--- | :--- | :--- |
| `title` | No | string | Heading above the list |
| `items` | Yes | array | List entries; renders as a compact icon card when no item has `title`, or a divided list when any item has `title` |
| `items[].icon` | No | string | Line icon name (unknown names render nothing; see the 23 supported names below) |
| `items[].title` | No | string | Item heading; switches the block to the divided step layout |
| `items[].text` | Recommended | string or string[] | Item body text; each array element renders as its own paragraph |
| `caption` | No | string | Caption below the list |

**Supported `icon` names (23 total)**: `search`, `eye`, `heart`, `chat`, `shield`, `wallet`, `bell`, `check`, `x`, `star`, `flag`, `clock`, `idea`, `book`, `link`, `user`, `chart`, `gear`, `file`, `pin`, `flask`, `target`, `question`.
