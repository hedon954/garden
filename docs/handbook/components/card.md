---
title: 知识卡片（card）
navTitle: 知识卡片
description: 把论文、项目或模块说明整理成带元数据与编号要点的卡片。
section: components
order: 31
badge: card
---

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

```markdown
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
```

- **用**：介绍一篇论文、一个开源项目或某个子系统，需要带出来源链接和 2～4 条关键要点时。
- **别用**：只有一两句普通说明时直接写正文段落或链接卡片（`{card}`），不要套一层 `card`。

| 字段 | 必填 | 类型 | 说明 |
| :--- | :--- | :--- | :--- |
| `title` | 建议 | 字符串 | 卡片标题 |
| `url` | 否 | 完整链接 | 标题旁显示的外部链接（渲染为 `来源 ↗`） |
| `meta` | 否 | 字符串 | 标题下方的副标题或元信息说明 |
| `description` | 与 `points` 二选一 | 字符串 | 卡片主说明段落（支持行内加粗与代码） |
| `points` | 与 `description` 二选一 | 字符串数组 | 下方带编号的要点列表 |
| `source` | 否 | 字符串或 `{ title, url }` | 右下角出处角标 |
