---
title: Component reference · list
navTitle: list
description: Pair line icons with short observations in a compact card, or add headings and multi-paragraph notes for divided steps.
section: reference
order: 11
badge: list
---

[← Component reference](/garden/en/reference) · [Usage: list](/garden/en/components/list)

## Examples

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

## Syntax

````markdown
```garden list
title:      # optional, heading
items:      # required, items
  - icon:   # optional, one of 23 icons
    title:  # optional, switches layout
    text:   # recommended, description
caption:    # optional, caption
```
````

## Fields

Fence header: ` ```garden list ` (snippet trigger `;glist`). Invalid YAML or unknown top-level keys report `garden-yaml` on the block.

| Field | Required | Default | Allowed Values & Limits | Description |
| :--- | :--- | :--- | :--- | :--- |
| `title` | Optional | none | string | Heading above the list |
| `items` | Required | `[]` | object or string array | List entries; renders as a compact icon card when no item has `title`, or a divided step list when any item has `title` |
| `items[].icon` | Optional | none (draws no icon) | one of the 23 built-in icon names: `search`, `eye`, `heart`, `chat`, `shield`, `wallet`, `bell`, `check`, `x`, `star`, `flag`, `clock`, `idea`, `book`, `link`, `user`, `chart`, `gear`, `file`, `pin`, `flask`, `target`, `question` | Line icon name (unknown names render nothing) |
| `items[].title` | Optional | none (compact row layout) | string | Item heading; switches the block to the divided step layout |
| `items[].text` | Recommended | `[]` | string or string[] | Item body text; each array element renders as its own paragraph |
| `caption` | Optional | none | string | Caption below the list |

## Limits & errors

- Apart from the shared `garden-yaml`, this component has no error codes of its own; values marked "not checked" in the table never report an error.
