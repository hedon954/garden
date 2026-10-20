---
title: File Download & Preview (file)
navTitle: file
description: Attach one or more files with automatic format and size badges, download links, and inline preview.
section: components
order: 39
badge: file
---

```garden file
src: ./file/checklist.md
title: Pre-publish Checklist
note: Sample Markdown attachment; click Preview to read inline or Download to save the file
```

You can tell the AI:

````markdown
```garden
Attach checklist.md here so readers can preview it inline or download it.
```
````

- **When to use**: Attaching config files, datasets, PDFs, images, or Markdown documents for readers to download or preview inline.
- **When to skip**: Showing a regular illustration in the middle of an article; use standard Markdown image syntax `![]()` instead.
