---
title: "Interface Patterns Sampler: Running a Small Book Club"
description: One made-up neighbourhood book club, used to show the relationship diagram, icon list, good/bad contrast, choice cards, resource cards and icon steps on one page.
date: 2026-10-20
draft: true
tags:
  - Garden
  - Intelligent UI
---

This is a component sampler. The story is made up: a few neighbours want to start a monthly book club. Each section uses one component.

## A book club is a loop

Picking, reading, talking and looking back are not a one-way process. What you learn at the end changes the next pick.

```garden compose
<figure frame="none"><relations caption="The four steps feed each other instead of running once in a fixed order."><entity title="Pick"><text>Choose this month's book</text></entity><entity title="Read"><text>Finish the agreed chapters each week</text></entity><entity title="Talk"><text>Meet and share views</text></entity><entity title="Review"><text>Note what to change next time</text></entity><edge from={1} to={2}/><edge from={2} to={3}/><edge from={3} to={4}/><edge from={4} to={1}/><edge from={3} to={1} style="dashed" label="shapes the pick"/><edge from={2} to={4} style="dashed"/></relations></figure>
```

Some relations in a book club are not a loop. One organiser holds members, venue and reading list together:

```garden compose
<figure frame="none"><relations caption="The organiser links to the other three; members and the list shape each other." center="Organiser"><entity title="Organiser"><text>Sends one notice a month</text></entity><entity title="Members"><text>Eight to ten neighbours</text></entity><entity title="Venue"><text>Café or library</text></entity><entity title="Reading list"><text>Members take turns to nominate</text></entity><edge from={1} to={2} label="invites"/><edge from={1} to={3} label="books"/><edge from={1} to={4} label="collects"/><edge from={2} to={4} style="dashed" direction="both" label="nominate"/></relations></figure>
```

## What a newcomer does first

Before signing up, a new member usually:

```garden compose
<figure frame="none"><icon-list><entry icon="search"><text>Searches for this month's title</text></entry><entry icon="eye"><text>Reads 3 reviews</text></entry><entry icon="heart"><text>Saves the event page</text></entry><entry icon="chat"><text>Asks in the group chat whether listening only is fine</text></entry></icon-list></figure>
```

So they are interested, but unsure about speaking up.

## Ask a different question

The Wikipedia article on [book discussion clubs](https://en.wikipedia.org/wiki/Book_discussion_club) notes that clubs vary widely in format and size. [wikipedia.org](https://en.wikipedia.org/wiki/Book_discussion_club){source}

The question you ask a newcomer also decides whether they dare to come:

```garden compose
<figure frame="none"><compare><item verdict="bad"><title>A poor question</title><text>“Have you read this author's other books? Could you share a review?”</text></item><item verdict="good"><title>A better question</title><text>“When do you usually read? Would you like to sit in once first?”</text></item></compare></figure>
```

## Let people pick the venue

Instead of asking how far people are willing to travel, show two real options:

```garden compose
<figure frame="none"><choices title="Where should we meet next month?" caption="Illustrative only. Venues and prices are made up."><choice-option icon="idea" value="$6 each" label="Prefer the atmosphere" reply="Café it is. We will book the long table by the window."><text>Corner café, one drink included</text></choice-option><choice-option icon="book" value="Free" label="Prefer the quiet" reply="Library it is. We will book the room at the start of the month."><text>Library meeting room, booking needed</text></choice-option><choice-option none label="Neither / not sure" reply="No problem. We will share a few more venues in the group chat."/></choices></figure>
```

## Public tools worth a look

```garden compose
<figure frame="none"><resources><resource title="Open Library: one page per book" image="/images/compose-resources/resource-015b41eb0f32.svg" alt="A closed book" takeaway="**Worth borrowing:** link the book's page when you pick, so everyone reads the same edition." href="https://openlibrary.org/"><text>An open catalogue run by the Internet Archive, with editions and e-book loans.</text><reference href="https://openlibrary.org/"/></resource><resource title="Project Gutenberg: public-domain e-books" image="/images/compose-resources/resource-fd51121b5e8c.svg" alt="A desk lamp" takeaway="**Worth borrowing:** pick a public-domain book now and then, so people without a copy can join at once." href="https://www.gutenberg.org/"><text>E-books that have entered the public domain, free to download.</text><reference href="https://www.gutenberg.org/"/><reference href="https://en.wikipedia.org/wiki/Project_Gutenberg"/></resource><resource title="Wikipedia: book discussion club" image="/images/compose-resources/resource-ecee6b47f015.svg" alt="Three books on a shelf" takeaway="**Worth borrowing:** online and in-person can run side by side." href="https://en.wikipedia.org/wiki/Book_discussion_club"><text>Common formats of book clubs, from meetups to online discussion.</text><reference href="https://en.wikipedia.org/wiki/Book_discussion_club"/></resource></resources></figure>
```

## Three small experiments first

```garden compose
<figure frame="none"><icon-list><entry icon="flask" title="Experiment 1: is one book a month too much?"><text>Pick a novella and a long novel for the first two meetings, and record how many people finish.</text><text>If the share drops clearly, read only the first half next time.</text></entry><entry icon="chat" title="Experiment 2: how do we get first-timers talking?"><text>Open half of the meetings with one sentence from each person, and the other half with free discussion.</text><text>Compare how often first-timers speak.</text></entry><entry icon="bell" title="Experiment 3: how early should the reminder go out?"><text>Send the reminder three days before one meeting and one day before another, and compare turnout.</text></entry></icon-list></figure>
```

The experiments build on each other: first the pace, then the mood, then the reminders.
