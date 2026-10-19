---
title: 写文章与随想：Markdown 常用写法
description: 文章开头的头部信息怎么填，以及代码修改对比、五种提示框、荧光笔划线、外部链接卡片和数学公式的写法。
section: writing-and-reading
order: 1
---

## 文章、随想和专栏的区别

平时写东西主要放在 `content/` 目录下，按篇幅长短分三种：

1. **文章（`content/posts/**/*.md`）**：长篇技术文章。可以在 `content/posts/` 下面随便建子文件夹分类（比如 `content/posts/db/wal.md` 会生成 `/blog/db/wal/`），自动带右侧章节目录和文末参考资料。
2. **随想（`content/thoughts/*.md`）**：几句话的短笔记、排障记录或书摘，支持配几张图、一段音频或视频，按时间排在「随想」页面。
3. **专栏（`content/columns.yaml`）**：把几篇同主题的文章按顺序编成一组，读的时候左边多一列章节目录，读完一篇可以直接点下一篇。

## 文章开头的信息（Front Matter）

每篇文章文件开头用 `---` 包起一段基本信息：

```yaml
---
title: "LSM-Tree 压缩开销丨写放大与读延迟怎么取舍"
description: "算清楚每一层容量比和布隆过滤器误判率的关系，找到引发磁盘 I/O 尖峰的原因。"
date: 2026-10-16
updated: 2026-10-18
tags:
  - 存储引擎
  - LSM-Tree
pinned: true
draft: false
cover: /media/covers/lsm-compaction.svg
original: https://db-notes.example.com/lsm-compaction
references:
  - title: "Monkey: Optimal Navigable Key-Value Store"
    url: "https://dl.acm.org/doi/10.1145/3035918.3064054"
---
```

| 字段 | 必填 | 作用 |
| :--- | :--- | :--- |
| `title` | 是 | 文章标题。如果标题比较长，可以在想换行的地方加一个全角竖线 `丨`，页面会按这个位置拆成主标题和副标题两行。 |
| `description` | 是 | 一两句话的摘要，显示在文章开头和文章列表里。 |
| `date` | 是 | 发布日期（如 `2026-10-16`）。 |
| `updated` | 否 | 更新日期；填了会在标题下方显示「更新于 …」。 |
| `publishAt` | 否 | 定时发布时间；没到这个时间前，正式打包不会把它发出来。 |
| `draft` | 否 | 写成 `true` 表示还是草稿，只有本地开 `CONTENT_INCLUDE_DRAFTS=1` 时才显示。 |
| `pinned` | 否 | 写成 `true` 会把文章固定在首页和文章列表最前面。 |
| `tags` | 否 | 标签列表，方便读者在「文章」和「标签」页按主题筛选。 |
| `cover` | 否 | 封面图路径，放在 `content/covers/` 或 `public/` 下即可。 |
| `original` | 否 | 如果这篇首发在其他平台，填上链接会在标题下面显示「原文 ↗」。 |
| `references` | 否 | 文末的参考资料列表，每条填 `title` 和 `url`。 |

## 代码块与「对比 / 改后」切换

普通代码框会显示语言名称和右上角的「复制」按钮。

如果你想展示**一段代码改了哪里**，可以先写一段改好后的完整代码框，**紧接着在下面再写一段 `diff` 代码框**。页面会自动把它们合并成一个带「对比」和「改后」切换按钮的代码块，而且点右上角复制时永远只复制干净的完整代码，不会把 `+`、`-` 号带进去：

```go
func (q *WriteQueue) FlushBatch(entries []Entry) error {
    batch := q.wal.NewBatch(len(entries))
    for _, e := range entries {
        batch.Append(e)
    }
    return batch.Sync()
}
```

```diff
 func (q *WriteQueue) FlushBatch(entries []Entry) error {
-    for _, e := range entries {
-        if err := q.wal.WriteAndSync(e); err != nil {
-            return err
-        }
-    }
-    return nil
+    batch := q.wal.NewBatch(len(entries))
+    for _, e := range entries {
+        batch.Append(e)
+    }
+    return batch.Sync()
 }
```

## 五种提示框

在引用块第一行写 `[!NOTE]`、`[!TIP]`、`[!IMPORTANT]`、`[!WARNING]` 或 `[!CAUTION]`，就能画出不同颜色的提示框：

> [!NOTE]
> **补充说明（Note）**：如果你的二级、三级标题没有自己写序号，文章页会自动帮你在标题前标上 `1`、`1.1`、`1.2`。

> [!TIP]
> **小技巧（Tip）**：文章配图可以直接放在跟文章同名的文件夹里（比如写 `raft.md` 时建一个 `raft/` 文件夹放图片），在正文里用相对路径 `./raft/pic.png` 引用即可。

> [!WARNING]
> **注意（Warning）**：写 `diff` 代码框时，前面一定要紧挨着放一段完整代码，否则运行 `make check` 时会提醒你补上。

## 重点句划荧光笔与中文加粗

平时在 Markdown 里写 `**重点（注）**文字` 这种紧挨着中文标点的粗体，很多解析器会认不出来、直接把星号原样印在页面上。Garden 已经修好了这个问题，中英文、括号和引号混着加粗都能正常显示。

另外，想在一段话里标出最核心的一句结论时，可以用 `<u>...</u>` 包起来，会显示成不挡字的暖黄色荧光笔：

当跨机房网络延迟抖动变大时，<u>把租约续期和普通心跳拆开处理，可以把偶发抖动引起的误切换率降一个数量级</u>，不需要盲目调大选举超时时间。

## 外部链接、视频与数学公式

- **行内外部链接**：正文里写的外部链接会自动在前面加上那个网站的小图标，并且小图标和第一个字绑在一起，不会出现图标单独留在上一行末尾的情况。
- **把链接变成卡片**：如果把一条网页链接单独放一行，或者在链接后面写上 `{card}`（比如 `[RFC 9000](https://www.rfc-editor.org/rfc/rfc9000){card}`），打包时会自动抓取网页标题、简介和预览图生成一张链接卡片。
- **嵌入视频**：把 YouTube 或 Bilibili 的视频链接单独放一行，会自动变成视频播放器。
- **数学公式与流程图**：行内公式用单美元符号 `$L = \lambda W$`，整块公式用双美元符号 `$$`（公式里的下划线 `$x_i + y_j$` 不会误触发斜体）：

$$
W_{\text{total}} = \sum_{i=1}^{L} \frac{T_i}{T_{i-1}} \cdot \left(1 + \alpha_{\text{flush}}\right)
$$

需要画流程图或时序图时，直接写 ````mermaid` 代码块即可，右上角自带全屏放大按钮。
