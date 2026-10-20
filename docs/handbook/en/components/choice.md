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

You can tell the AI:

````markdown
```garden
Give readers two venue cards (corner cafe vs. library meeting room) with cost, preference label, selection reply, and a "neither" button underneath.
```
````

- **When to use**: Offering two or three concrete options where each choice has an icon, a prominent number or price, and a short note.
- **When to skip**: Choosing an option recalculates a formula or updates a chart; use [`interactive`](/garden/en/components/interactive) instead.
