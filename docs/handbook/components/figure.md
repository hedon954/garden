---
title: figure · 分区结构图
description: 用 garden figure 给 SVG 架构图或流程图加上分区按钮，读者点哪个按钮就高亮对应区域并显示说明。
section: components
order: 7
---

## 什么时候用

当文章里有一张包含三四个模块的架构图或流程图，如果把每个模块的详细说明全塞进图里，字会小得看不清；如果全写在图外面的长段落里，读者又得一边看字一边回头找图。

用 `garden figure` 可以给图配上一排切换按钮（`parts`）：读者点哪个按钮，图上对应的区域（带 `data-p="分区id"` 的部分）就会高亮显示，并在图下方展开那一段的说明文字。右上角还自带全屏查看按钮。

## 效果与写法

可以直接在下方点按「1. 写入预写日志」「2. 更新内存表」「3. 后台合并落盘」切换查看：

```garden figure
caption: 一次写入请求从进入存储引擎到落盘的三个阶段。
parts:
  - id: wal
    label: "1. 写入预写日志 (WAL)"
    text: "请求先顺序追加到磁盘上的预写日志，保证哪怕机器突然断电，重启后也能从日志里恢复出刚才写的数据。"
  - id: memtable
    label: "2. 更新内存跳表 (MemTable)"
    text: "日志落盘后，把键值插入内存里的跳表（SkipList），此时写入请求就可以直接向客户端返回成功。"
  - id: sstable
    label: "3. 后台刷盘与合并 (SSTable)"
    text: "当内存跳表写满 64 MB 后转为只读，由后台线程异步排序写成磁盘上的 SSTable 文件，不阻塞前台新写入。"
---
<svg viewBox="0 0 680 132" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="存储写入三阶段示意图">
  <g data-p="wal">
    <rect x="12" y="22" width="196" height="88" rx="8" fill="#f0eee6" stroke="#1b1a18" stroke-width="1.5" />
    <text x="110" y="58" text-anchor="middle" font-size="14" font-weight="600" fill="#1b1a18">1. 预写日志 (WAL)</text>
    <text x="110" y="82" text-anchor="middle" font-size="12" fill="#6e6b64">顺序追加防断电丢失</text>
  </g>
  <path d="M 214 66 L 236 66" stroke="#6e6b64" stroke-width="1.5" />
  <g data-p="memtable">
    <rect x="242" y="22" width="196" height="88" rx="8" fill="#f0eee6" stroke="#1b1a18" stroke-width="1.5" />
    <text x="340" y="58" text-anchor="middle" font-size="14" font-weight="600" fill="#1b1a18">2. 内存表 (MemTable)</text>
    <text x="340" y="82" text-anchor="middle" font-size="12" fill="#6e6b64">内存有序插入后即返回</text>
  </g>
  <path d="M 444 66 L 466 66" stroke="#6e6b64" stroke-width="1.5" />
  <g data-p="sstable">
    <rect x="472" y="22" width="196" height="88" rx="8" fill="#f0eee6" stroke="#1b1a18" stroke-width="1.5" />
    <text x="570" y="58" text-anchor="middle" font-size="14" font-weight="600" fill="#1b1a18">3. 磁盘表 (SSTable)</text>
    <text x="570" y="82" text-anchor="middle" font-size="12" fill="#6e6b64">后台异步排序归并</text>
  </g>
</svg>
```

对应的 Markdown 写法（上方写 YAML，加一行 `---` 后直接放 `<svg>`）：

```yaml
# 代码块开头写：```garden figure
caption: 一次写入请求从进入存储引擎到落盘的三个阶段。
parts:
  - id: wal
    label: "1. 写入预写日志 (WAL)"
    text: "请求先顺序追加到磁盘上的预写日志，保证哪怕机器突然断电，重启后也能从日志里恢复出刚才写的数据。"
  - id: memtable
    label: "2. 更新内存跳表 (MemTable)"
    text: "日志落盘后，把键值插入内存里的跳表（SkipList），此时写入请求就可以直接向客户端返回成功。"
  - id: sstable
    label: "3. 后台刷盘与合并 (SSTable)"
    text: "当内存跳表写满 64 MB 后转为只读，由后台线程异步排序写成磁盘上的 SSTable 文件，不阻塞前台新写入。"
---
<svg viewBox="0 0 680 132" xmlns="http://www.w3.org/2000/svg">
  <g data-p="wal">...</g>
  <g data-p="memtable">...</g>
  <g data-p="sstable">...</g>
</svg>
```

## 可用字段一览

| 字段名 | 必填 | 说明 |
| :--- | :--- | :--- |
| `caption` | 否 | 图下方的一句话图注说明。 |
| `parts` | 否 | 分区列表，每项写 `id`（对应 SVG 里的 `data-p="id"`）、`label`（按钮文字）和 `text`（点中后显示的说明）。 |
| `svg` | 否 | 可以直接把 SVG 写在 `---` 分隔线下面，也可以写在 `svg: \|` 字段里。 |
| `image` / `alt` | 否 | 如果不用 SVG，也可以用 `image` 指定图片路径。 |
| `mermaid` | 否 | 如果只画简单流程图，也可以写 `mermaid: \|` 放 Mermaid 语法。 |
