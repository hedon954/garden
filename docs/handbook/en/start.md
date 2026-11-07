---
title: Quick Start
navTitle: Quick Start
description: Initialize a site directory with npx hd-garden init, preview locally, create posts, and push updates.
section: getting-started
order: 1
---

Garden is a personal blog tool written in Markdown and managed with Git. An initialized site repository holds only your configuration files, Markdown content, and static assets, while the rendering and build pipeline comes from the `hd-garden` package.

## 1. Requirements and Initialization

Install **Node.js `>= 22.13.0`**, **Git**, and **GNU Make** first. Run the following commands in your terminal to create a site directory:

```bash
npx hd-garden init my-blog --locale en_US
cd my-blog
npm install
make dev
```

`npx hd-garden init` copies the site template into `my-blog` and writes the helper skills under `.agents/skills/`. When `--locale en` or `--locale en_US` is passed, it generates an English `site.config.yaml`, `Makefile`, and `README.md`, and installs `.github/workflows/pages.yml` from `templates/workflows/pages.en.yml` (default `zh_CN` initialization does not create `.github/workflows/pages.yml`; see [Deploy to GitHub Pages](/garden/en/deploy)). It does not run `npm install` automatically.

On the first `make dev` run, if `node_modules` is missing, `make prepare` in the `Makefile` runs `npm install` before invoking `npx garden dev` (which syncs content first) and starting the local dev server at `http://localhost:3000`.

## 2. Directory Structure

An initialized site repository has the following layout:

```text
my-blog/
├── site.config.yaml        # Site name, author info, and titles/subtitles for top-level pages
├── content/
│   ├── columns.yaml        # Column definitions and reading order
│   ├── covers/             # Cover images for posts and columns
│   ├── posts/              # Long-form posts (.md) and matching sidecar folders
│   └── thoughts/           # Short notes (.md) and media attachments
├── public/                 # Static files served at their root paths (such as icons)
├── Makefile                # Daily commands for previewing, creating posts, checking, and pushing
└── package.json            # Depends only on hd-garden
```

## 3. Creating Posts and Thoughts

### Creating a Post (`make new`)

Run `make new` to create a draft in `content/posts/` pre-filled with the date, title, and a commented component cheat sheet:

```bash
make new SLUG=tcp-bbr TITLE="TCP BBR Notes"
```

To place the post inside a subdirectory (such as `content/posts/network/tcp-bbr.md`), pass `DIR`:

```bash
make new DIR=network SLUG=tcp-bbr TITLE="TCP BBR Notes"
```

> [!NOTE] Note
> `SLUG` may only contain lowercase letters, digits, and hyphens (`a-z`, `0-9`, `-`), never `/`; pass subdirectories via `DIR`. `make new` reads only `SLUG`, `TITLE`, and `DIR`.

Newly created files default to `draft: true`. `make dev` previews drafts and future-dated (`publishAt`) posts by default. Use `CONTENT_INCLUDE_DRAFTS=0 make dev` to opt out. Production builds still exclude them by default:

```bash
make dev
```

### Creating a Thought

Thoughts live in `content/thoughts/`. Create a `.md` file directly in `content/thoughts/` (for example `content/thoughts/2026-10-19-note.md`) with `title` and `date` in its Front Matter, or publish from the browser after configuring `/admin`. See [Writing Posts & Thoughts](/garden/en/writing) for the supported fields.

## 4. Daily Commands and Upgrading

The site `Makefile` and `garden` CLI provide these commands:

| Command | What It Runs |
| :--- | :--- |
| `make dev` | Runs `make prepare` to check dependencies, then runs `npx garden dev` (which syncs content and starts the dev server) |
| `CONTENT_INCLUDE_DRAFTS=0 make dev` | Optional: preview published posts only, excluding drafts and future posts |
| `make new SLUG=xxx TITLE="Title" DIR=subdir` | Calls `npx garden new` to create a draft post under `content/posts/` (`DIR` is optional) |
| `make check` | Runs `npx garden sync && npx garden build` in the site repo to verify content sync and the production build |
| `npx garden check content/posts/xxx.md` | Checks a single Markdown post's title, component fields, code diffs, and local asset paths |
| `make update MESSAGE="Commit message"` | Runs `make check`, then `git add -A`, `git commit -m "$(MESSAGE)"`, and `git push origin HEAD` |

### Upgrading `hd-garden`

To upgrade the engine, edit `package.json` in your site root, update the `"hd-garden"` version string, and run `npm install`:

```bash
npm install
make check
```

## 5. Editor Plugins

To write an interactive component, insert an idea in VS Code, Cursor, or Typora, preview it, open the catalog, and let the `garden-compose` skill compile it. The plugins ship inside `hd-garden`. You do not compile them yourself.

`npx hd-garden init` copies the files to `.garden/editors/`. An interactive terminal asks whether to install VS Code / Cursor and whether to install Typora. The first `npx garden sync` asks again if that prompt has not happened yet. With no TTY, `CI=1`, or `GARDEN_SKIP_EDITORS=1`, Garden only prints the hint. Install later with:

```bash
npx garden editors install
npx garden editors install --yes
```

Typora needs typora-community-plugin installed first; then enable the plugin under Settings, Installed plugins. If `code` or `cursor` is not available, use Install from VSIX and select the file under `.garden/editors/vscode/`. Insert, preview, catalog, and compile steps are in [Writing with AI](/garden/en/ai-writing) and [Checks & Shortcuts](/garden/en/workflow).
