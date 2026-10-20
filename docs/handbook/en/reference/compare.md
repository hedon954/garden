---
title: Component reference · compare
navTitle: compare
description: Place two or three options side by side to contrast tradeoffs, or stack good and bad practices.
section: reference
order: 3
badge: compare
---

[← Component reference](/garden/en/reference) · [Usage: compare](/garden/en/components/compare)

## Examples

```garden compare
items:
  - title: Describe the change in one sentence
    text: Idea block under full code; garden-ui writes the diff.
  - title: Write the diff by hand
    text: Place a diff below full code; alone it raises diff-orphan.
```

```garden compare
items:
  - title: A poor question
    verdict: bad
    text: "“Have you read this author's other books? Could you share a review?”"
  - title: A better question
    verdict: good
    text: "“When do you usually read? Would you like to sit in once first?”"
```

## Syntax

````markdown
```garden compare
items:        # required, 2–3 items
  - title:    # option name
    text:     # description
    verdict:  # optional, good | bad
    <key>:    # optional, as a tag
```
````

## Fields

Fence header: ` ```garden compare ` (snippet trigger `;gcompare`). Invalid YAML or unknown top-level keys report `garden-yaml` on the block.

| Field | Required | Default | Allowed Values & Limits | Description |
| :--- | :--- | :--- | :--- | :--- |
| `items` | Required | `[]` | array (at least `2` items and `2` to `3` in side-by-side mode recommended, not checked) | Options to compare; each entry can be an object or a single `"Title: description"` string |
| `items[].title` | Recommended | `""` (text before `:` in single-line string form) | string | Item heading |
| `items[].text` | Recommended | `[]` | string or string[]; in side-by-side mode, combined `text` and extra string fields per cell must be at most `60` characters (exceeding this reports `compare-long`) | Item description; in single-line `"Title: description"` form only the text after `:` counts toward the `60`-character limit |
| `items[].verdict` | Optional | none (side-by-side layout) | `"good"` \| `"bad"` | Marks the item as a recommended practice (green check) or anti-pattern (red cross); when any item has `verdict`, items stack vertically and the `60`-character `compare-long` limit does not apply |
| `items[].<customKey>` | Optional | none | string or number (in side-by-side mode, string values count toward the `60`-character cell limit and report `compare-long` if exceeded) | In side-by-side mode, extra key-value pairs render as attribute tags at the bottom of the card |

## Limits & errors

- `compare-long`: in side-by-side mode, one cell's `text` plus its other string fields runs past 60 characters. Move that cell back into a list or paragraph.
- When any item has `verdict: good | bad`, the group stacks vertically and the 60-character check is skipped.
