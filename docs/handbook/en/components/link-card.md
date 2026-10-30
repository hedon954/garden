---
title: Link Card
navTitle: Link card
description: Render a jump URL as a card with the site name, title, and summary.
section: components
order: 43
---

A URL on its own paragraph, or a link followed immediately by `{card}`, renders as a link card (same-site and external share one path). An ordinary titled link in prose stays a link, such as [Typora](https://typora.io/): an external one shows the site favicon before the text and a `↗` at the upper right; a titled same-site link still navigates in place.

- **When to use**: The reader should see the site name, title, and summary before opening the page.
- **When to skip**: Use a [source chip](/garden/en/components/source) to cite a site inside a sentence, or a [reference card](/garden/en/components/card) when you are writing the takeaways yourself.

## A URL on its own line

Leave blank lines around a paragraph that contains only the URL:

```markdown
https://spec.commonmark.org/
```

https://spec.commonmark.org/

## `{card}` inside a sentence

Write `{card}` immediately after `)`, with no space. The link stays in the sentence, and the card follows the paragraph:

```markdown
Tables, task lists, and footnotes come from [remark-gfm](https://github.com/remarkjs/remark-gfm){card}, which enables GFM here.
```

Tables, task lists, and footnotes come from [remark-gfm](https://github.com/remarkjs/remark-gfm){card}, which enables GFM here.

## `{card}` on its own line

When the paragraph is only the marked link, that line becomes the card:

```markdown
[Supported KaTeX functions](https://katex.org/docs/supported.html){card}
```

[Supported KaTeX functions](https://katex.org/docs/supported.html){card}

`{card}` inside code stays as written, for example `[text](https://example.com){card}`. A space between `)` and the marker also leaves an ordinary link. Same-site and external jump links share one card path.

At build time, Garden reads `{card}` links and URLs that stand alone as a paragraph, and stores the page title, summary, and image in `link-assets.json` (same-site and external share one fetch path; HTML meta refresh is followed to the target before reading OG). A failed fetch keeps the previous record, and the build continues. Run `npx garden links` to refresh just these records. Set `GARDEN_OFFLINE` to `1` to skip the fetch during an offline build.

A thought can also carry an external link in Front Matter with `type: link`, using the `title`, `description`, and `image` you write. Those fields are in [Writing Posts & Thoughts](/garden/en/writing).

This is not a `garden` fence, so it has no field table. Fields for the 12 fence components are in the [component reference](/garden/en/reference).
