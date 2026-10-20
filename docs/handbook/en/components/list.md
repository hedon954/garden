---
title: Icon List (list)
navTitle: list
description: Pair line icons with short observations in a compact card, or add headings and multi-paragraph notes for divided steps.
section: components
order: 41
badge: list
---

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

You can tell the AI:

````markdown
```garden
List the four things a newcomer usually does before signing up, each paired with a small icon.
```
````

## Divided List with Headings

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

You can tell the AI:

````markdown
```garden
Organize these three small experiments into an icon list with a heading and two short notes per item.
```
````

- **When to use**: Listing parallel actions, signals, or practices paired with an icon, or grouping titled steps with one or more paragraphs each.
- **When to skip**: Items follow a strict numbered sequence or chronological order; use a standard ordered list or [`timeline`](/garden/en/components/timeline) instead.
