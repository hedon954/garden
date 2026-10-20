---
title: 知识卡片（card）
navTitle: 知识卡片
description: 把论文、项目或模块说明整理成带元数据与编号要点的卡片。
section: components
order: 31
badge: card
---

在 `garden` 想法块里写一句「放一张 `card` 介绍 SQLite 的 WAL 文档，带标题、链接和三条要点」，Agent 会按 `garden-ui` skill 生成下面的 `garden card`（手写格式附后）。

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

- **用**：介绍一篇论文、一个开源项目或某个子系统，需要带出来源链接和 2～4 条关键要点时；或者用 `cards` 并列展示几项公开工具或参考资源，并附上一句「可借鉴」结论。
- **别用**：只有一两句普通说明时直接写正文段落或链接卡片（`{card}`），不要套一层 `card`。

## 多张资源行卡片（`cards`）

需要连续列出几个项目、工具或参考来源时，可以在 `garden card` 里写 `cards` 数组。每张卡片横排展示左侧缩略图（`image`）、标题链接（`url` + `title`）、说明与来源胶囊（`description` + `source`），以及底部的结论行（`takeaway`，常写为 `"**可借鉴：** ……"`）：

```garden card
cards:
  - url: https://openlibrary.org/
    title: Open Library：每本书一个页面
    description: Internet Archive 维护的开放图书目录，可以查版本、借阅电子书。
    image: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 132 132'%3E%3Crect width='132' height='132' fill='%23F0EEE6'/%3E%3Crect x='34' y='26' width='64' height='84' rx='6' fill='%23C9B79C'/%3E%3Crect x='34' y='26' width='10' height='84' fill='%238B6A45'/%3E%3Crect x='52' y='44' width='34' height='5' rx='2' fill='%23FAF9F5'/%3E%3Crect x='52' y='54' width='24' height='5' rx='2' fill='%23FAF9F5'/%3E%3C/svg%3E"
    alt: 一本合上的书
    source:
      - https://openlibrary.org/
    takeaway: "**可借鉴：** 选书时直接贴书的页面链接，大家看到的是同一个版本。"
  - url: https://www.gutenberg.org/
    title: Project Gutenberg：公版电子书
    description: 收录已进入公有领域的电子书，可以免费下载。
    image: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 132 132'%3E%3Crect width='132' height='132' fill='%23E8EEF0'/%3E%3Ccircle cx='66' cy='60' r='30' fill='%239DB7A8'/%3E%3Crect x='30' y='98' width='72' height='8' rx='4' fill='%233F6B55'/%3E%3Crect x='44' y='112' width='44' height='6' rx='3' fill='%239DB7A8'/%3E%3C/svg%3E"
    alt: 一盏台灯
    source:
      - https://www.gutenberg.org/
      - https://en.wikipedia.org/wiki/Project_Gutenberg
    takeaway: "**可借鉴：** 偶尔选一本公版书，没买书的人也能马上加入。"
```

````markdown
```garden card
cards:
  - url: https://openlibrary.org/
    title: Open Library：每本书一个页面
    description: Internet Archive 维护的开放图书目录，可以查版本、借阅电子书。
    image: ./my-post/openlibrary.svg
    alt: 一本合上的书
    source:
      - https://openlibrary.org/
    takeaway: "**可借鉴：** 选书时直接贴书的页面链接，大家看到的是同一个版本。"
  - url: https://www.gutenberg.org/
    title: Project Gutenberg：公版电子书
    description: 收录已进入公有领域的电子书，可以免费下载。
    image: ./my-post/gutenberg.svg
    alt: 一盏台灯
    source:
      - https://www.gutenberg.org/
      - https://en.wikipedia.org/wiki/Project_Gutenberg
    takeaway: "**可借鉴：** 偶尔选一本公版书，没买书的人也能马上加入。"
```
````

### 来源胶囊与图标规则

- **多来源自动折叠**：`source` 可以写单个链接或链接数组。只有一个来源时显示完整域名（去掉 `www.`，如 `openlibrary.org`）；多个来源时折叠显示为第一个域名加 `+N`（例如两个来源显示 `gutenberg.org +1`）。
- **图标优先级与首字母回退**：构建期从目标站点下载到的 Favicon 优先于手写的 `icon`；若两者都没有，则取可注册域名主体的首字母大写作为圆标（例如 `en.wikipedia.org` 取 `wikipedia` 的 `W`，`bbc.co.uk` 取 `B`）。

| 字段 | 必填 | 类型 | 说明 |
| :--- | :--- | :--- | :--- |
| `title` | 建议 | 字符串 | 卡片标题 |
| `url` | 否 | 完整链接 | 标题跳转的外部链接 |
| `meta` | 否 | 字符串 | 标题下方的副标题或元信息说明 |
| `description` | 与 `points` / `cards` 择一 | 字符串 | 卡片主说明段落（支持行内加粗与代码） |
| `points` | 与 `description` / `cards` 择一 | 字符串数组 | 下方带编号的要点列表 |
| `image` / `alt` | 否 | 字符串 | 缩略图地址与替代文本 |
| `source` | 否 | 链接、`{ url, site?, icon? }` 或数组 | 紧跟在 `description` 后的来源胶囊；多项折叠为 `domain +N` |
| `takeaway` | 否 | 字符串 | 卡片底部带顶边分隔线的一句启发（如 `"**可借鉴：** ……"`） |
| `cards` | 多卡模式 | 数组 | 一次垂直排列多张行卡片，每项支持 `url`、`title`、`description`、`image`、`alt`、`meta`、`source`、`takeaway` |
