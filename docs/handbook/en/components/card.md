---
title: Reference Card (card)
navTitle: card
description: Summarize a paper, repository, or module in a card with metadata and numbered takeaways.
section: components
order: 31
badge: card
---

```garden card
title: SQLite Write-Ahead Logging
url: https://www.sqlite.org/wal.html
meta: Documentation · sqlite.org
description: Appends changes sequentially to a write-ahead log while readers continue reading the original database pages, reducing read-write contention.
points:
  - Writes append to the end of the `-wal` file instead of overwriting database pages in place on commit.
  - Readers record the current end-of-log mark to see a consistent snapshot without blocking concurrent writers.
  - Background checkpoints copy log pages back into the main database file in batches once a threshold is reached.
```

- **When to use**: Introducing a paper, open-source project, or subsystem where a link and 2 to 4 numbered points belong together, or listing several tools or references with a takeaway line.
- **When to skip**: A sentence or two of prose or a `[Title](url){card}` link card is enough.

You can tell the AI:

````markdown
```garden
Summarize the SQLite WAL documentation in a card with a link, a one-sentence summary, and three takeaways.
```
````

## Multiple Resource Row Cards (`cards`)

When you want to list several projects, tools, or references in one block and attach a takeaway line to each, use `cards`:

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
```

You can tell the AI:

````markdown
```garden
List Open Library and Project Gutenberg as two cards, each with a source link and a takeaway line on what is worth borrowing.
```
````

## Fields

Every field, default, limit and error code is in [Component reference · card](/garden/en/reference/card).
