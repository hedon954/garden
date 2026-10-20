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
title: SQLite WAL 写入模式
url: https://www.sqlite.org/wal.html
meta: 文档说明 · sqlite.org
description: 把修改先顺序追加到预写日志，读操作继续访问原数据库页，减少读写互斥等待。
points:
  - 写入只追加到 `-wal` 文件末尾，不需要在事务提交时原地覆盖数据页。
  - 读事务记录当前末尾偏移量即可看到一致快照，不会阻塞并发写入。
  - 后台 Checkpoint 按阈值将日志页分批写回主库文件。
```

````markdown
```garden card
title: SQLite WAL 写入模式
url: https://www.sqlite.org/wal.html
meta: 文档说明 · sqlite.org
description: 把修改先顺序追加到预写日志，读操作继续访问原数据库页，减少读写互斥等待。
points:
  - 写入只追加到 `-wal` 文件末尾，不需要在事务提交时原地覆盖数据页。
  - 读事务记录当前末尾偏移量即可看到一致快照，不会阻塞并发写入。
  - 后台 Checkpoint 按阈值将日志页分批写回主库文件。
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
