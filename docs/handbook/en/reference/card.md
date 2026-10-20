---
title: Component reference · card
navTitle: card
description: Summarize a paper, repository, or module in a card with metadata and numbered takeaways.
section: reference
order: 1
badge: card
---

[← Component reference](/garden/en/reference) · [Usage: card](/garden/en/components/card)

## Examples

```garden card
title: SQLite Write-Ahead Logging
url: https://www.sqlite.org/wal.html
meta: Documentation · sqlite.org
description: Appends changes sequentially to a write-ahead log while readers continue reading the original database pages, reducing read-write contention.
points:
  - Writes append to the end of the `-wal` file instead of overwriting database pages in place on commit.
  - Readers record the current end-of-log mark to see a consistent snapshot without blocking concurrent writers.
  - Background checkpoints copy log pages back into the main database file in batches once a threshold is reached.
```

```garden card
cards:
  - url: https://openlibrary.org/
    title: "Open Library: one page per book"
    description: An open catalogue run by the Internet Archive, with editions and e-book loans.
    image: /images/garden/ref-card-book.svg
    alt: A closed book
    source:
      - https://openlibrary.org/
    takeaway: "**Worth borrowing:** link the book's page when you pick, so everyone reads the same edition."
  - url: https://www.gutenberg.org/
    title: "Project Gutenberg: public-domain e-books"
    description: E-books that have entered the public domain, free to download.
    image: /images/garden/ref-card-lamp.svg
    alt: A desk lamp
    source:
      - https://www.gutenberg.org/
      - https://en.wikipedia.org/wiki/Project_Gutenberg
    takeaway: "**Worth borrowing:** pick a public-domain book now and then, so people without a copy can join at once."
```

## Syntax

````markdown
```garden card
title:        # recommended, heading
url:          # optional, heading link
meta:         # optional, subtitle
description:  # summary (or text)
points:       # key points (or items)
image:        # optional, thumbnail
alt:          # optional, alt text
source:       # optional, source URL
site:         # optional, site name
takeaway:     # optional, takeaway
cards:        # multi-card mode, same keys
  - url:      # card link
```
````

## Fields

Fence header: ` ```garden card ` (snippet trigger `;gcard`). Place fields at the top level for a single card, or pass a `cards` array for multiple horizontal row cards; invalid YAML or unknown top-level keys report `garden-yaml` on the block.

| Field | Required | Default | Allowed Values & Limits | Description |
| :--- | :--- | :--- | :--- | :--- |
| `title` | Recommended | `url` | string | Card heading; falls back to `url` if omitted |
| `url` | Optional | `""` | full `https://` or `http://` URL | External link on the heading; renders `title` as plain text if omitted |
| `meta` | Optional | none | string | Subtitle or metadata line below the heading |
| `description` | One of `description`, `points`, or `cards` | `""` | string (alias `text`) | Summary paragraph supporting inline bold and code |
| `points` | One of `points`, `description`, or `cards` | `[]` | string[] or `{ title, text? }[]` (alias `items`; `2` to `4` points recommended, not checked) | Numbered list of takeaways below the summary |
| `image` | Optional | none | image path or Data URL | Card thumbnail |
| `alt` | Optional | `title` | string | Thumbnail alt text |
| `source` | Optional | none | URL, `{ url, site?, icon? }`, or array | Source chip appended to `description`; multiple sources collapse to the first domain plus `+N` (such as `gutenberg.org +1`). `icon` defaults to the build-time downloaded favicon, then the uppercase first letter of the registrable domain's main label (e.g. `en.wikipedia.org` uses `W`, `bbc.co.uk` uses `B`) |
| `site` | Optional | hostname of `url` without `www.` | string | Display name for the source site |
| `takeaway` | Optional | none | string | One-line takeaway separated by a top border at the bottom of the card (e.g. `"**Worth borrowing:** ..."`) |
| `cards` | Required for multi-card mode | none | object[] | Stack of horizontal row cards, each supporting `url`, `title`, `description` (or `text`), `image`, `alt`, `meta`, `source`, and `takeaway` |

## Limits & errors

- Apart from the shared `garden-yaml`, this component has no error codes of its own; values marked "not checked" in the table never report an error.
