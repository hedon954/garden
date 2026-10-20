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

- **什么时候用**：随文章提供配置文件、PDF、压缩包或 Markdown 附件供读者下载与页内预览。
- **什么时候不用**：只是引用一个外部网页时用[知识卡片](/garden/components/card)；正文里本来就要直接展示的配图直接贴图片。

可以这样对 AI 说：

````markdown
```garden
把同目录下的 checklist.md 放成附件，让读者可以在页面里预览或下载。
```
````

## 字段说明

围栏写 ` ```garden file `。单个附件在顶层写 `src`；多个附件用 `files` 数组（不能与顶层 `src` 同时出现）。

| 字段 | 是否必填 | 取值与限制 | 说明 |
| :--- | :--- | :--- | :--- |
| `src` | 单文件必填 | 相对路径、`/public` 路径或 `https://` 网址 | 附件路径；本地路径不能越出内容目录（否则报 `file-outside`），文件不存在报 `missing-asset`，单文件超过 `5 MB` 报 `file-large` 警告 |
| `title` | 可选 | 字符串 | 附件显示标题（默认取文件名；多文件模式下作为整组标题） |
| `note` | 可选 | 字符串 | 文件名下方的简短说明 |
| `files` | 多文件必填 | `{ src, title?, note? }[]`（非空数组） | 多文件列表，每项必填 `src`，可选 `title`、`note`（不要手写构建期生成的 `resolved` 字段，否则报 `garden-file`） |
