---
title: Source Chip ({source})
navTitle: Source chip
description: Cite a site inline as a rounded chip, without the external-link arrow.
section: components
order: 44
---

Write `{source}` immediately after the `)` of an external link, with no space. It renders as a rounded source chip: the site favicon fetched at build time, or the uppercase first letter of the registrable domain's main label (`W` for `en.wikipedia.org`, `B` for `bbc.co.uk`), then the link text, without a `↗`.

- **When to use**: Name a source inside a sentence, without a full card.
- **When to skip**: Use a [link card](/garden/en/components/link-card) when the reader should see a title and summary. On a `garden` component, the source is that component's `source` field, documented in the [component reference](/garden/en/reference).

```markdown
Cited from the Wikipedia article [wikipedia.org](https://en.wikipedia.org/wiki/Book_discussion_club){source}.
```

Cited from the Wikipedia article [wikipedia.org](https://en.wikipedia.org/wiki/Book_discussion_club){source}.

`{source}` inside code stays as written. A space between `)` and the marker leaves an ordinary external link.

This is not a `garden` fence, so it has no field table.
