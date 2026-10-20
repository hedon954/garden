---
title: Reference Card (card)
navTitle: card
description: Summarize a paper, repository, or module in a card with metadata and numbered takeaways.
section: components
order: 31
badge: card
---

Write "add a `card` summarizing the SQLite WAL documentation with a title, link, and three takeaways" inside a `garden` idea block, and the Agent generates the `garden card` block below via the `garden-ui` skill (hand-written syntax follows).

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

````markdown
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
````

- **Use when**: Introducing a paper, open-source project, or subsystem where a source link and 2 to 4 numbered points belong together.
- **Skip when**: A sentence or two of prose or a `[Title](url "{card}")` link card is enough.

| Field | Required | Type | Description |
| :--- | :--- | :--- | :--- |
| `title` | Recommended | string | Card heading |
| `url` | No | full URL | External link shown next to the heading |
| `meta` | No | string | Subtitle or metadata line below the heading |
| `description` | Either this or `points` | string | Main summary paragraph (supports inline bold and code) |
| `points` | Either this or `description` | string[] | Numbered list of takeaways below the summary |
| `source` | No | string or `{ title, url }` | Source attribution in the bottom-right corner |
