---
title: "Interface Patterns Sampler: Running a Small Book Club"
description: One made-up neighbourhood book club, used to show the cycle diagram, icon list, good/bad contrast, choice cards, resource cards and icon steps on one page.
date: 2026-10-20
draft: true
tags:
  - Garden
  - Intelligent UI
---

This is a component sampler. The story is made up: a few neighbours want to start a monthly book club. Each section uses one component.

## A book club is a loop

Picking, reading, talking and looking back are not a one-way process. What you learn at the end changes the next pick.

```garden cycle
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
  - from: 3
    to: 1
  - from: 2
    to: 4
caption: The four steps feed each other instead of running once in a fixed order.
```

## What a newcomer does first

Before signing up, a new member usually:

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

So they are interested, but unsure about speaking up.

## Ask a different question

The Wikipedia article on [book discussion clubs](https://en.wikipedia.org/wiki/Book_discussion_club) notes that clubs vary widely in format and size. [wikipedia.org](https://en.wikipedia.org/wiki/Book_discussion_club){source}

The question you ask a newcomer also decides whether they dare to come:

```garden compare
items:
  - title: A poor question
    verdict: bad
    text: "\u201cHave you read this author's other books? Could you share a review?\u201d"
  - title: A better question
    verdict: good
    text: "\u201cWhen do you usually read? Would you like to sit in once first?\u201d"
```

## Let people pick the venue

Instead of asking how far people are willing to travel, show two real options:

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

## Public tools worth a look

```garden card
cards:
  - url: https://openlibrary.org/
    title: "Open Library: one page per book"
    description: An open catalogue run by the Internet Archive, with editions and e-book loans.
    image: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 132 132'%3E%3Crect width='132' height='132' fill='%23F0EEE6'/%3E%3Crect x='34' y='26' width='64' height='84' rx='6' fill='%23C9B79C'/%3E%3Crect x='34' y='26' width='10' height='84' fill='%238B6A45'/%3E%3Crect x='52' y='44' width='34' height='5' rx='2' fill='%23FAF9F5'/%3E%3Crect x='52' y='54' width='24' height='5' rx='2' fill='%23FAF9F5'/%3E%3C/svg%3E"
    alt: A closed book
    source:
      - https://openlibrary.org/
    takeaway: "**Worth borrowing:** link the book's page when you pick, so everyone reads the same edition."
  - url: https://www.gutenberg.org/
    title: "Project Gutenberg: public-domain e-books"
    description: E-books that have entered the public domain, free to download.
    image: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 132 132'%3E%3Crect width='132' height='132' fill='%23E8EEF0'/%3E%3Ccircle cx='66' cy='60' r='30' fill='%239DB7A8'/%3E%3Crect x='30' y='98' width='72' height='8' rx='4' fill='%233F6B55'/%3E%3Crect x='44' y='112' width='44' height='6' rx='3' fill='%239DB7A8'/%3E%3C/svg%3E"
    alt: A desk lamp
    source:
      - https://www.gutenberg.org/
      - https://en.wikipedia.org/wiki/Project_Gutenberg
    takeaway: "**Worth borrowing:** pick a public-domain book now and then, so people without a copy can join at once."
  - url: https://en.wikipedia.org/wiki/Book_discussion_club
    title: "Wikipedia: book discussion club"
    description: Common formats of book clubs, from meetups to online discussion.
    image: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 132 132'%3E%3Crect width='132' height='132' fill='%23F3ECE4'/%3E%3Crect x='22' y='34' width='26' height='70' rx='4' fill='%23D9A88B'/%3E%3Crect x='53' y='24' width='26' height='80' rx='4' fill='%237A4A33'/%3E%3Crect x='84' y='42' width='26' height='62' rx='4' fill='%23D9A88B'/%3E%3Crect x='16' y='104' width='100' height='6' rx='3' fill='%237A4A33'/%3E%3C/svg%3E"
    alt: Three books on a shelf
    source:
      - https://en.wikipedia.org/wiki/Book_discussion_club
    takeaway: "**Worth borrowing:** online and in-person can run side by side."
```

## Three small experiments first

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

The experiments build on each other: first the pace, then the mood, then the reminders.
