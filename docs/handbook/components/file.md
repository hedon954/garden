---
title: 文件下载与预览（file）
navTitle: 文件下载与预览
description: 提供单个或一组附件下载，自动显示格式与大小，支持在页内展开预览。
section: components
order: 39
badge: file
---

```garden file
src: ./file/checklist.md
title: 发布前检查清单
note: Markdown 附件示例，可点击「预览」在当前页展开阅读，或直接下载原文件
```

````markdown
```garden file
src: ./file/checklist.md
title: 发布前检查清单
note: Markdown 附件示例，可点击「预览」在当前页展开阅读，或直接下载原文件
```
````

- **用**：随文章提供配置文件、数据表、PDF、图片或 Markdown 附件供读者下载与页内预览时（多文件可用 `files` 数组）。
- **别用**：正文里本来就要直接展示的配图用标准 Markdown 图片语法 `![]()`，不要放进 `file` 组件。

| 字段 | 必填 | 类型 | 说明 |
| :--- | :--- | :--- | :--- |
| `src` | 单文件必填 | 路径或完整链接 | 相对当前 Markdown 文件的本地路径（不得越出 `content/`）、`/public` 路径或 `https://` 链接 |
| `title` | 否 | 字符串 | 显示的文件标题（默认取文件名；多文件模式下作为分组标题） |
| `note` | 否 | 字符串 | 文件名下方的简短说明 |
| `files` | 多文件必填 | `{ src, title?, note? }[]` | 一次列出多个文件时使用（与顶层 `src` 二选一） |
