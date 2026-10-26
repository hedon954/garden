---
title: 来源胶囊（{source}）
navTitle: 来源胶囊
description: 在句子里标出引用站点，显示为不带外链箭头的圆角胶囊。
section: components
order: 44
---

在外部链接的 `)` 后面紧跟 `{source}`（中间不加空格），会渲染成圆角来源胶囊：左侧是构建期抓到的站点 Favicon，没抓到时用可注册域名主体的首字母（`en.wikipedia.org` 是 `W`，`bbc.co.uk` 是 `B`），右侧是链接文字，不带 `↗`。

- **什么时候用**：一句话里标出处，不需要整张卡片。
- **什么时候不用**：希望看到标题和简介时用[链接卡片](/garden/components/link-card)。`garden` 组件上的来源写在该组件的 `source` 字段里，见[组件参考](/garden/reference)。

```markdown
引自维基百科词条 [wikipedia.org](https://en.wikipedia.org/wiki/Book_discussion_club){source}。
```

引自维基百科词条 [wikipedia.org](https://en.wikipedia.org/wiki/Book_discussion_club){source}。

写在代码里的 `{source}` 会原样显示。标记和 `)` 之间有空格时，仍是普通外链。

这不是 `garden` 围栏，没有字段表。
