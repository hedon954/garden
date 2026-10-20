---
title: Component reference · file
navTitle: file
description: Attach one or more files with automatic format and size badges, download links, and inline preview.
section: reference
order: 9
badge: file
---

[← Component reference](/garden/en/reference) · [Usage: file](/garden/en/components/file)

## Examples

```garden file
src: ./file/checklist.md
title: Pre-publish Checklist
note: Sample Markdown attachment; click Preview to read inline or Download to save the file
```

## Syntax

````markdown
```garden file
src:        # required for one file
title:      # optional, title
note:       # optional, short note
files:      # required for a group
  - src:    # required, path
    title:  # optional, file name
    note:   # optional, note
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

## Limits & errors

- `garden-file`: neither `src` nor `files`; `files` empty or not a list; `files` together with a top-level `src` / `note`; an entry without `src` or with unknown keys; a hand-written `resolved`.
- `file-outside`: a local path leaves the `content/` folder.
- `missing-asset`: the local file does not exist.
- `file-large` (warning): a single file is over 5 MB.
