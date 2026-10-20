---
title: Site & Column Config
navTitle: Site & Column Config
description: Configure site metadata, page headings, and brand icons in site.config.yaml, and organize series in content/columns.yaml.
section: getting-started
order: 3
---

Global site copy and appearance settings live in `site.config.yaml` at the repository root, while series definitions live in `content/columns.yaml`. Run `npx garden sync` (or `make dev`) after editing to apply changes.

## 1. Full `site.config.yaml` Structure

Here is the default `site.config.yaml` shipped with the site template:

```yaml
name: Garden
tagline: 写作 · 记录 · 保持好奇
description: 文章、随想和专栏。
locale: zh_CN
# 站点的公开地址。文章里指向这个地址的完整网址会按站内链接显示。
# url: https://blog.example.com
# 站点图标，不写时使用 Garden 自带的图标。
# brand:
#   logo: brand/logo.svg
#   favicon: /favicon.svg
#   appleTouchIcon: /apple-touch-icon.png

author:
  name: Your Name
  github: your-github-id
  githubBio: 一句自我介绍。
  githubPinned: []

pages:
  home:
    title: |-
      记一些正在做的事，
      和想清楚的问题。
    subtitle: 软件、笔记，和偶尔的工作记录。
  blog:
    title: 博文
    subtitle: 写完的长文。
  thoughts:
    title: 随想
    subtitle: 短笔记、图片和链接。
  columns:
    title: 专栏
    subtitle: 按顺序读的一组文章。
  about:
    title: 你好，我是 Your Name。
    subtitle: 文章和笔记都在这里。
    heading: 关于
    paragraphs:
      - 一名工程师。平时写代码，也把想清楚的问题记下来。
      - 这里放文章、随想和专栏。
    quote: ""
    focus:
      - 软件
      - 笔记
      - 日常
    cta:
      href: /blog
      label: 浏览博文
  garden:
    title: "用 Markdown 写。\n推送之后，网站自己更新。"
    subtitle: ""

footer: 持续记录。
```

### Top-level and Author Fields

| Field | Description |
| :--- | :--- |
| `name` | Site name shown in the top-left header, browser title suffix, and RSS feed title |
| `tagline` | Site tagline |
| `description` | Site summary used for the home page SEO description and RSS channel description |
| `locale` | Language and region tag (`zh_CN` by default; setting `en_US` switches the site chrome to English at build time) |
| `url` | Public root URL of the site (such as `https://blog.example.com`). Full URLs pointing to this address inside posts are treated as internal links |
| `author.name` | Author name displayed in article metadata, the About page, and the footer |
| `author.github` | GitHub username (without the full URL), used to link your GitHub profile and fetch public activity for the About page |
| `author.githubBio` | Fallback bio used when the build environment has no `GITHUB_TOKEN` |
| `author.githubPinned` | Fallback list of pinned repositories when `GITHUB_TOKEN` is not set locally |
| `footer` | Short signature text in the footer |

> [!NOTE] Note
> Trailing slashes on internal URLs are not configured in `site.config.yaml`: static exports (`STATIC_EXPORT=1`) always enable trailing slashes, and server builds can enable them with `TRAILING_SLASH=1`.

### `pages` Top-level Page Headings

Each key under `pages` sets the header copy for a top-level route:

- **`pages.home`, `pages.blog`, `pages.thoughts`, `pages.columns`, `pages.garden`**: Each accepts `title` and `subtitle`. On `/garden/`, the Chinese overview page reads `pages.garden.title` (splitting into two lines on ` | `) and `pages.garden.subtitle`.
- **`pages.about`**: Alongside `title` and `subtitle`, supports `heading` (section heading), `paragraphs` (array of paragraphs), `quote` (pull quote), `focus` (array of topic tags), and `cta` (`{ href, label }` button).

### `brand` Custom Icons and Redirects

- **`brand.logo`**: SVG mark placed to the left of the site name in the header. Resolved relative to the site root (for example `brand/logo.svg`), sanitized and inlined at build time so it inherits `currentColor`. Set to `false` to hide the header mark.
- **`brand.favicon` and `brand.appleTouchIcon`**: Paths served from `public/` (such as `/favicon.svg` and `/apple-touch-icon.png`); set `appleTouchIcon` to `false` to omit the tag.
- **`redirects`**: Top-level map in `site.config.yaml` for moved posts (for example `"/2024/01/20/old-post/": "/blog/new-post/"`). The build emits redirect pages at the old paths and rewrites matching internal links inside post bodies to the new destination.

## 2. Configuring Columns (`content/columns.yaml`)

Columns group multiple posts from `content/posts/` into an ordered reading series. Edit `content/columns.yaml`:

```yaml
columns:
  - slug: building-in-public
    title: Building in Public
    status: ongoing
    description: Notes from initial prototype to production release.
    cover: windowsill-herbs.svg
    posts:
      - building-in-public/smallest-closed-loop
      - building-in-public/ship-with-evidence
```

| Field | Required | Description |
| :--- | :--- | :--- |
| `slug` | Yes | Column identifier (lowercase letters, digits, and hyphens only), generating routes at `/columns/<slug>/<post>` |
| `title` | Yes | Column title (also shown beside member posts on `/blog`) |
| `description` | Yes | Column summary shown on `/columns` cards |
| `status` | No | Status value: `default` (or omitted, shown as "Active"), `ongoing` ("Ongoing"), or `completed` ("Completed"). Legacy Chinese values are still accepted, and any other text is shown verbatim |
| `cover` | No | Cover image path relative to `content/covers/` |
| `posts` | Yes | Ordered array of post paths relative to `content/posts/`, without the `.md` extension |
