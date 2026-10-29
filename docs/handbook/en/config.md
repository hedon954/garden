---
title: Site & Column Config
navTitle: Site & Column Config
description: Configure site metadata, page headings, and brand icons in site.config.yaml, series in content/columns.yaml, and the bookshelf in content/bookshelf.yaml.
section: getting-started
order: 3
---

Global site copy and appearance settings live in `site.config.yaml` at the repository root, series definitions live in `content/columns.yaml`, and the reading-note shelf lives in `content/bookshelf.yaml`. Run `npx garden sync` (or `make dev`) after editing to apply changes.

## 1. Full `site.config.yaml` Structure

Below are the default `site.config.yaml` fields generated for an English site (`npx hd-garden init --locale en_US`):

```yaml
name: Garden
tagline: Writing · Notes · Staying curious
description: Posts, short notes, and columns.
locale: en_US
# Public address of the site. Full URLs pointing here inside posts render as internal links.
# url: https://blog.example.com
# Site icons; falls back to Garden's built-in icons when omitted.
# brand:
#   logo: brand/logo.svg
#   favicon: /favicon.svg
#   appleTouchIcon: /apple-touch-icon.png

author:
  name: Your Name
  github: your-github-id
  githubBio: A short bio.
  githubPinned: []

pages:
  home:
    title: |-
      Notes on what I am building,
      and questions worth thinking through.
    subtitle: Software, reading notes, and occasional work logs.
  blog:
    title: Posts
    subtitle: Finished long-form essays.
  thoughts:
    title: Thoughts
    subtitle: Short notes, images, and links.
    # How many items to show per screen; the next screen loads automatically as you scroll. Default: 10.
    # pageSize: 10
  columns:
    title: Columns
    subtitle: Series of posts meant to be read in order.
  about:
    title: Hi, I am Your Name.
    subtitle: Essays and notes live here.
    heading: About
    paragraphs:
      - A software engineer writing code and keeping notes on things figured out along the way.
      - This site holds long-form posts, short thoughts, and columns.
    quote: ""
    focus:
      - Software
      - Notes
      - Daily
    cta:
      href: /blog
      label: Browse posts
  garden:
    title: "Write in Markdown.\nPush to update the site."
    subtitle: ""

footer: Keep writing.
```

### Top-level and Author Fields

| Field | Description |
| :--- | :--- |
| `name` | Site name shown in the top-left header, browser title suffix, and RSS feed title |
| `tagline` | Site tagline |
| `description` | Site summary used for the home page SEO description and RSS channel description |
| `locale` | Language and region tag (`zh_CN` by default; setting `en_US` switches all framework-rendered UI strings—navigation, home page, post list, post metadata and permalink label, Giscus prompts, tags, columns, About page, 404 page, pagination, RSS/sitemap, and meta/og—to English at build time) |
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

## 3. Configuring the bookshelf (`content/bookshelf.yaml`)

When a site has `content/bookshelf.yaml`, `/bookshelf` renders those books inside the site header and is indexed with the other pages. Without that file, `/bookshelf` is only the package's built-in demo (Chinese click-test, no header, not indexed). A production site supplies the file.

Each `books` entry is one volume. `post: note/ddia` is the one-note shorthand. Several notes use `posts`. Clicking that spine plays the extract animation and lands on `/bookshelf/<id>`. It does not open the first note. Returning from that page to the shelf plays the close animation. The book page shows a 148px-wide jacket (height follows the image), the title, the author, and only the Douban and PDF chips. The PDF chip is followed by a short sharing note. My notes lists the notes; each card is a normal link to the article and does not play the flyer. A single note still uses the extract and return animation.

`cover` is the jacket for the shelf, the flyer, and the book page. The file lives in `content/covers/` and the build copies it to `/media/covers/`, even when no post front matter names that file. Crop a Douban scan's white margin before committing the file; the build does not change pixels. A note's hero stays that post's front matter `cover`. Omit the jacket and it falls back to the first note's cover. `color` (`#rgb` or `#rrggbb`) is the spine and the single-note open page.

```yaml
title: Reading notes
description: Books I have read, and the notes I kept.
eyebrow: Library
shelves:
  - id: recent
    name: Recent
    books:
      - id: ddia
        title: Designing Data-Intensive Applications
        author: Martin Kleppmann
        cover: ddia.jpg
        color: "#8b3a2f"
        post: note/ddia
      - id: unit-testing
        title: Unit Testing
        cover: unit-testing.jpg
        color: "#1a2744"
        sources:
          - label: Douban
            href: https://book.douban.com/subject/00000000/
          - label: PDF
            href: https://example.com/unit-testing.pdf
        posts:
          - path: note/note-unit-testing
            kind: overview
          - path: note/note-unit-testing-excerpt
            kind: excerpt
```

| Field | Required | Description |
| :--- | :--- | :--- |
| `title` | Yes | Page title |
| `description` | No | Page summary |
| `eyebrow` | No | Small line above the title. Falls back to the site name |
| `shelves` | Yes | Non-empty list. Each shelf needs `id`, `name`, and a non-empty `books` list |
| `books[].id` | Yes | Unique across the shelf |
| `books[].title` | Yes | Title on the left page and the note view |
| `books[].author` | No | Author |
| `books[].spine` | No | Spine label. Defaults to `title` |
| `books[].size` | No | `thin`, `s-short`, `s-mid`, or `s-tall`. Real books default to `s-mid`; filler spines default to `thin` |
| `books[].cover` | No | Jacket. File name or full URL. When set, it is the only jacket |
| `books[].color` | No | Spine and single-note open-page color |
| `books[].filler` | No | `true`, `sand`, or `cream`. A thin spacer that does not open |
| `books[].post` | No | Shorthand for one note |
| `books[].posts` | No | Notes on this volume. `kind` is `overview` or `excerpt`. Two or more open the book page |
| `books[].sources` | No | Sources. The book page shows Douban and PDF only |
| `books[].note` | No | Markdown used only when the book names no posts |
