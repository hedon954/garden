---
title: Component reference · choice
navTitle: choice
description: Present two or three option cards with an icon, headline value, and preference label, plus an optional fallback button and selection reply.
section: reference
order: 12
badge: choice
---

[← Component reference](/garden/en/reference) · [Usage: choice](/garden/en/components/choice)

## Examples

```garden choice
title: Where should we meet next month?
items:
  - icon: idea
    value: $6 each
    text: Corner café, one drink included
    label: Prefer the atmosphere
    reply: Café it is. We will book the long table by the window.
  - icon: book
    value: Free
    text: Library meeting room, booking needed
    label: Prefer the quiet
    reply: Library it is. We will book the room at the start of the month.
none:
  label: Neither / not sure
  reply: No problem. We will share a few more venues in the group chat.
caption: Illustrative only. Venues and prices are made up.
```

## Syntax

````markdown
```garden choice
title:      # optional, question
items:      # required, 2–3 suggested
  - icon:   # optional, one of 23 icons
    value:  # recommended, big value
    text:   # recommended, short note
    label:  # optional, preference tag
    reply:  # optional, reply
none:       # optional, fallback button
  label:    # button text
  reply:    # optional, reply
caption:    # optional, caption
```
````

## Fields

Fence header: ` ```garden choice ` (snippet trigger `;gchoice`). Renders as an accessible `role="radiogroup"` with arrow-key navigation; cards sit side by side on desktop and stack vertically in a single column on narrow screens. Invalid YAML or unknown top-level keys report `garden-yaml` on the block.

| Field | Required | Default | Allowed Values & Limits | Description |
| :--- | :--- | :--- | :--- | :--- |
| `title` | Optional | `""` | string | Question or heading above the option cards |
| `items` | Required | `[]` | object[] (`2` to `3` items recommended, not checked) | Option cards |
| `items[].icon` | Optional | none (draws no icon) | one of the 23 built-in icon names | Line icon at the top of the card (shares the same 23 icon names as `garden list`) |
| `items[].value` | Recommended | none | string or number | Prominent price, figure, or short headline on the card |
| `items[].text` | Recommended | none | string | One-sentence description of the option |
| `items[].label` | Optional | none | string | Preference tag with a dot indicator at the bottom of the card |
| `items[].reply` | Optional | `""` | string | Response shown below the group when this card is selected |
| `none` | Optional | none | `{ label: string, reply?: string }` | Full-width single-line fallback button underneath the cards (such as `"Neither / not sure"`) and its selection reply |
| `caption` | Optional | none | string | Caption below the component |

## Limits & errors

- Apart from the shared `garden-yaml`, this component has no error codes of its own; values marked "not checked" in the table never report an error.
