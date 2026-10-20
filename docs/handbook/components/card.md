---
title: 知识卡片（card）
navTitle: 知识卡片
description: 介绍一篇论文、一个项目或一组值得参考的公开工具。
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

- **什么时候用**：介绍一篇论文、一个仓库或一本书，需要标题、链接和几条说明；或者把几项参考资源放在一起，各附一句可借鉴的结论。
- **什么时候不用**：正文里一两句话已经说清，或者只需要普通外链卡片时，直接写正文段落。

可以这样对 AI 说：

````markdown
```garden
整理一张卡片介绍 SQLite 的 WAL 文档，带链接和三条核心要点。
```
````

## 多张资源行卡（`cards`）

需要连续列出几个项目、公开工具或参考资料，并在每张卡片下方附上一句启发时，可以用 `cards` 列表：

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

可以这样对 AI 说：

````markdown
```garden
把 Open Library 和 Project Gutenberg 做成两张资源卡片，附上来源链接和各自可借鉴的地方。
```
````

## 字段说明

围栏写 ` ```garden card `（编辑器代码片段触发词 `;gcard`）。单张卡片直接在顶层写字段，多张横向资源行卡用 `cards` 数组。

| 字段 | 是否必填 | 默认值 | 取值与限制 | 说明 |
| :--- | :--- | :--- | :--- | :--- |
| `title` | 建议填写 | 同 `url` | 字符串 | 卡片标题；未填时回退显示 `url` |
| `url` | 可选 | `""` | 完整 `https://` 或 `http://` 网址 | 标题跳转的外链；未填时标题渲染为纯文本 |
| `meta` | 可选 | 无 | 字符串 | 标题下方的副标题或来源说明 |
| `description` | 与 `points`、`cards` 至少填一项 | `""` | 字符串（别名 `text`） | 摘要段落，支持行内加粗与代码 |
| `points` | 与 `description`、`cards` 至少填一项 | `[]` | 字符串数组或 `{ title, text? }[]`（别名 `items`；建议 `2`～`4` 条要点，顶层写未知键名或 YAML 格式错误时报 `garden-yaml` 错误） | 摘要下方的编号要点列表 |
| `image` | 可选 | 无 | 图片路径或 Data URL | 卡片缩略图 |
| `alt` | 可选 | 同 `title` | 字符串 | 缩略图替代文本 |
| `source` | 可选 | 无 | 单个网址、`{ url, site?, icon? }` 或数组 | 跟在 `description` 后的来源胶囊；多个来源自动折叠为首域名加 `+N`（如 `gutenberg.org +1`）。`icon` 默认优先使用构建期下载到的站点 Favicon，其次取可注册域名主体的首字母大写（如 `en.wikipedia.org` 取 `W`，`bbc.co.uk` 取 `B`） |
| `site` | 可选 | `url` 去掉 `www.` 后的域名 | 字符串 | 来源站点显示名称 |
| `takeaway` | 可选 | 无 | 字符串 | 卡片底部带顶部分隔线的启发或结论（如 `"**可借鉴：** ……"`） |
| `cards` | 多卡模式必填 | 无 | 对象数组（顶层写未知键名或 YAML 格式错误时报 `garden-yaml` 错误） | 多张横向资源行卡，每项支持 `url`、`title`、`description`（或 `text`）、`image`、`alt`、`meta`、`source`、`takeaway` |
