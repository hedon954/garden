---
title: 文件下载与预览（file）
navTitle: 文件下载与预览
description: 给读者提供一份或一组可下载的文件，支持在当前页展开预览。
section: components
order: 39
badge: file
---

```garden file
src: ./file/checklist.md
title: 发布前检查清单
note: Markdown 附件示例，可点击「预览」在当前页展开阅读，或直接下载原文件
```

可以这样对 AI 说：

````markdown
```garden
把同目录下的 checklist.md 放成附件，让读者可以在页面里预览或下载。
```
````

- **什么时候用**：随文章提供配置文件、PDF、压缩包或 Markdown 附件供读者下载与页内预览。
- **什么时候不用**：只是引用一个外部网页时用[知识卡片](/garden/components/card)；正文里本来就要直接展示的配图直接贴图片。
