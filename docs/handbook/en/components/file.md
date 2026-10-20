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

Fence header: ` ```garden file `. Use top-level `src` for a single file, or `files` for multiple attachments (mutually exclusive with top-level `src`).

| Field | Required | Allowed Values & Limits | Description |
| :--- | :--- | :--- | :--- |
| `src` | Required for single file | relative path, `/public` path, or `https://` URL | Attachment path; local paths must stay inside the content root (otherwise `file-outside`), missing files raise `missing-asset`, and files over `5 MB` emit a `file-large` warning |
| `title` | Optional | string | Display title (defaults to filename; serves as the group heading when using `files`) |
| `note` | Optional | string | Short note shown below the filename |
| `files` | Required for multi-file | `{ src, title?, note? }[]` (non-empty array) | List of attachments, each requiring `src` with optional `title` and `note` (do not write the build-generated `resolved` field by hand, which raises `garden-file`) |
