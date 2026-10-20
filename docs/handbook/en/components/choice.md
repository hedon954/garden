---
title: Choice Cards (choice)
navTitle: choice
description: Present two or three option cards with an icon, headline value, and preference label, plus an optional full-width fallback button and selection reply.
section: components
order: 42
badge: choice
---

Write "use `choice` to let readers pick between a corner cafe and a library meeting room, with price, preference label, selection reply, and a neither option" inside a `garden` idea block, and the Agent generates the `garden choice` block below via the `garden-ui` skill (hand-written syntax follows).

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

````markdown
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
````

The option group renders as an accessible `role="radiogroup"`, supporting keyboard focus and arrow keys (`ArrowLeft`, `ArrowRight`, `ArrowUp`, `ArrowDown`) to cycle through the cards and the `none` button. On desktop, cards sit in two or three columns; on narrow screens, the cards stack vertically in a single column instead of squeezing into two columns. When `none: { label, reply }` is provided, it appears below the cards as a single-line text button; selecting any card or `none` reveals its `reply` below.

- **Use when**: Offering two or three concrete options where each choice has an icon, a prominent number or price, and a short note.
- **Skip when**: Choosing an option recalculates a formula or updates a chart; write an idea and compile it into `interactive` instead.

| Field | Required | Type | Description |
| :--- | :--- | :--- | :--- |
| `title` | No | string | Question or heading above the option cards |
| `items` | Yes | array (2 to 3 items) | Option cards |
| `items[].icon` | No | string | Line icon at the top of the card (shares the 23 icon names with `garden list`) |
| `items[].value` | Recommended | string or number | Prominent price, figure, or short headline on the card |
| `items[].text` | Recommended | string | One-sentence description of the option |
| `items[].label` | No | string | Preference tag with a dot indicator at the bottom of the card |
| `items[].reply` | No | string | Response shown below the group when this card is selected |
| `none` | No | `{ label, reply? }` | One-line text button underneath the cards (such as "Neither / not sure") and its selection reply |
| `caption` | No | string | Caption below the component |
