---
title: "Why Local-First Plain Text Ages Well"
date: 2026-04-02
description: "Databases and proprietary note apps come and go, but a directory of UTF-8 Markdown files with frontmatter still opens in forty years."
tags:
  - PlainText
  - Workflow
  - Archive
---

Every few years a popular note-taking tool changes its pricing, shuts down its sync service, or locks exports behind a lossy HTML dump. When your writing lives inside a proprietary database, migrating ten years of notes becomes a weekend project full of broken image links and mangled code fences.

## Files and Folders Are the API

A folder of `.md` files needs no server to stay readable. `rg` finds any phrase across hundreds of drafts in milliseconds, `git log -p` explains why a paragraph changed three years ago, and any text editor can open a post without waiting for a workspace to sync.

## Frontmatter Just Enough for Structure

Four fields at the top of a file — `title`, `date`, `description`, and `tags` — are enough to build an archive, an RSS feed, and a tag index. Everything else belongs in the prose itself.
