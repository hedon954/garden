---
title: "01 · Start with a Directory of Plain Files"
date: 2026-03-18
description: "Why the first version of any personal knowledge base or blog should be a flat folder of Markdown files rather than a custom database."
column: small-tools
tags:
  - PlainText
  - SmallTools
numbering: true
---

When starting a new writing habit or technical notebook, it is tempting to spend the first week configuring schemas, plugins, and sync pipelines. Nine times out of ten, that setup work becomes a substitute for writing.

## Let the File System Handle Organization

A directory tree already gives you names, folders, timestamps, and atomic moves. Putting regular articles in `content/posts/` and grouped series in `content/posts/<column>/` means you can see the entire shape of the site with a single `ls`.

### What Stays Portable

If you ever switch static site generators — or write your own in a weekend — standard Markdown with YAML frontmatter requires zero conversion. Your URLs, headings, and code blocks remain intact.
