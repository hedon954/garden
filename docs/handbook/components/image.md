---
title: 本地图片
navTitle: 本地图片
description: 把配图放在文章同名目录里，并用 alt 生成图注。
section: components
order: 45
---

图片单独成段时会包进图框，并在下方显示图注。

- **什么时候用**：这张图属于文章，读者需要看到图下说明。
- **什么时候不用**：只是装饰时，把 `alt` 写成以 `image`、`截图` 或 `img` 开头的占位词，这样不会出现图注。要按部分高亮说明时用[分区结构图](/garden/components/figure)；要提供下载时用[文件下载与预览](/garden/components/file)。

长文 `content/posts/my-post.md` 的配图放在同名目录 `content/posts/my-post/`。正文用 Markdown 图片语法引用，地址写成 `./my-post/diagram.svg`，方括号里的 `alt` 写成图注。

构建时会复制图片，并读出像素宽高，避免图片加载前把后面的文字顶下去。宽图如何向外扩，见[阅读排版是怎么工作的](/garden/design)。

图注优先用写在地址后面引号里的 Markdown 标题，没有标题时用 `alt`。`alt` 以 `image`、`截图` 或 `img` 开头时不当作图注。

下面这张图的图注就是它的 `alt`：

![正文列、宽图区与宽表区](../assets/reading-layout.svg)

随想里的图片写在 Front Matter 的 `media` 中，多张拼成宫格，不使用这套图注。见[写文章与随想](/garden/writing)。

这不是 `garden` 围栏，没有字段表。
