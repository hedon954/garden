---
title: Choice Cards (choice)
navTitle: choice
description: Present two or three option cards with an icon, headline value, and preference label, plus an optional fallback button and selection reply.
section: components
order: 42
badge: choice
---

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

- **When to use**: Offering two or three concrete options where each choice has an icon, a prominent number or price, and a short note.
- **When to skip**: Choosing an option recalculates a formula or updates a chart; use [`interactive`](/garden/en/components/interactive) instead.

You can tell the AI:

````markdown
```garden
Give readers two venue cards (corner cafe vs. library meeting room) with cost, preference label, selection reply, and a "neither" button underneath.
```
````

## Fields

Fence header: ` ```garden choice ` (snippet trigger `;gchoice`). Renders as an accessible `role="radiogroup"` with arrow-key navigation; cards sit side by side on desktop and stack vertically in a single column on narrow screens.

| Field | Required | Default | Allowed Values & Limits | Description |
| :--- | :--- | :--- | :--- | :--- |
| `title` | Optional | `""` | string | Question or heading above the option cards |
| `items` | Required | `[]` | object[] (`2` to `3` items; unknown top-level keys or invalid YAML report `garden-yaml`) | Option cards |
| `items[].icon` | Optional | none (draws no icon) | one of the 23 built-in icon names | Line icon at the top of the card (shares the same 23 icon names as `garden list`) |
| `items[].value` | Recommended | none | string or number | Prominent price, figure, or short headline on the card |
| `items[].text` | Recommended | none | string | One-sentence description of the option |
| `items[].label` | Optional | none | string | Preference tag with a dot indicator at the bottom of the card |
| `items[].reply` | Optional | `""` | string | Response shown below the group when this card is selected |
| `none` | Optional | none | `{ label: string, reply?: string }` | Full-width single-line fallback button underneath the cards (such as `"Neither / not sure"`) and its selection reply |
| `caption` | Optional | none | string | Caption below the component |
