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

- **When to use**: Attaching config files, datasets, PDFs, archives, or Markdown documents for readers to download or preview inline.
- **When to skip**: Referencing an external web page (use [`card`](/garden/en/components/card)) or showing a regular illustration in the middle of an article (use standard Markdown image syntax `![]()`).

You can tell the AI:

````markdown
```garden
Attach checklist.md here so readers can preview it inline or download it.
```
````

## Fields

Fence header: ` ```garden file ` (snippet trigger `;gfile`). Use top-level `src` for a single file, or `files` for multiple attachments; invalid YAML or unknown top-level keys report `garden-yaml` on the block.

| Field | Required | Default | Allowed Values & Limits | Description |
| :--- | :--- | :--- | :--- | :--- |
| `src` | Required for single file | none | relative path, `/public` path, or `https://` URL; missing `src` or combining `src` with `files` reports `garden-file`, local paths outside `content/` report `file-outside`, missing local files report `missing-asset`, and a local file over `5 MB` reports a `file-large` warning | Attachment path |
| `title` | Optional | decoded filename from `src` (single file) or `""` (multi-file) | string | Display title for a single file, or group heading when using `files` |
| `note` | Optional | `""` | string (combining top-level `note` with `files` reports `garden-file`) | Short note shown below the filename in single-file mode |
| `files` | Required for multi-file | none | `{ src, title?, note? }[]` (at least `1` item; empty array, non-array, combining with top-level `src`/`note`, item missing `src`, unknown item keys, or hand-writing `resolved` reports `garden-file`) | List of attachments, each requiring `src` with optional `title` (defaults to filename) and `note` (defaults to `""`) |
