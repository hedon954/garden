---
title: File Download & Preview (file)
navTitle: file
description: Attach one or more files with automatic format and size badges, download links, and inline preview.
section: components
order: 39
badge: file
---

Write "use `file` to attach a pre-publish checklist that readers can preview inline or download" inside a `garden` idea block, and the Agent generates the `garden file` block below via the `garden-ui` skill (hand-written syntax follows).

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

- **Use when**: Attaching config files, datasets, PDFs, images, or Markdown documents for readers to download or preview inline (use `files` for multiple attachments).
- **Skip when**: Showing a regular illustration in the middle of an article; use standard Markdown image syntax `![]()` instead.

| Field | Required | Type | Description |
| :--- | :--- | :--- | :--- |
| `src` | Required for single file | path or URL | Relative path (must stay inside the content root), `/public` path, or `https://` URL |
| `title` | No | string | Display title (defaults to filename; serves as the group heading when using `files`) |
| `note` | No | string | Short note shown below the filename |
| `files` | Required for multi-file | `{ src, title?, note? }[]` | List of multiple attachments (mutually exclusive with top-level `src`) |
