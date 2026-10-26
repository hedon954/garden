---
title: 外部链接卡片
navTitle: 链接卡片
description: 把一条外部链接渲染成带网站名、标题和简介的卡片。
section: components
order: 43
---

单独占一段的网址，或链接末尾紧跟 `{card}`，会渲染成链接卡片。正文里的普通外部链接不会变成卡片，例如 [Typora](https://typora.io/)：只在文字前加站点 Favicon，右上角标 `↗`，图标与第一个字留在同一行。

- **什么时候用**：希望读者点开之前先看到网站名、标题和简介。
- **什么时候不用**：句子里只要标出出处时用[来源胶囊](/garden/components/source)；要自己写几条要点时用[知识卡片](/garden/components/card)。

## 单独一行的网址

前后留空行，整段只有网址：

```markdown
https://spec.commonmark.org/
```

https://spec.commonmark.org/

## 写在句子里的 `{card}`

`)` 后面紧跟 `{card}`，中间不加空格。链接留在句子里，卡片跟在这一段后面：

```markdown
表格、任务列表和脚注都来自 [remark-gfm](https://github.com/remarkjs/remark-gfm){card}，它让 GFM 语法在这里生效。
```

表格、任务列表和脚注都来自 [remark-gfm](https://github.com/remarkjs/remark-gfm){card}，它让 GFM 语法在这里生效。

## 单独一行的 `{card}`

这一段只有带标记的链接时，这一行直接换成卡片：

```markdown
[KaTeX 支持的函数](https://katex.org/docs/supported.html){card}
```

[KaTeX 支持的函数](https://katex.org/docs/supported.html){card}

`{card}` 写在代码里会原样显示，例如 `[文字](https://example.com){card}`。标记和 `)` 之间有空格时也不会变成卡片。指向本站的链接会去掉标记，仍是站内链接。

构建时读取正文里的 `{card}` 链接，把对方页面的标题、简介和封面记入 `link-assets.json`。单独一行的网址同样变成卡片，标题和简介用同一份记录；这个网址没有以 `{card}` 出现过时，卡片上显示网址本身。抓取失败就沿用上次的结果，构建不会因此中断。只刷新这些信息时运行 `npx garden links`。离线构建时把 `GARDEN_OFFLINE` 设为 `1` 会跳过拉取。

随想 Front Matter 里的 `type: link` 用你写的 `title`、`description` 和 `image`，字段见[写文章与随想](/garden/writing)。

这不是 `garden` 围栏，没有字段表。12 个围栏组件的字段见[组件参考](/garden/reference)。
