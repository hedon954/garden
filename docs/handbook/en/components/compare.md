---
title: Side-by-Side Comparison (compare)
navTitle: compare
description: Place two or three options side by side to contrast tradeoffs and attributes.
section: components
order: 33
badge: compare
---

Write "use `compare` to contrast describing a code change in one sentence against writing a diff block by hand" inside a `garden` idea block, and the Agent generates the `garden compare` block below via the `garden-ui` skill (hand-written syntax follows).

```garden compare
items:
  - title: Describe the change in one sentence
    text: Idea block under full code; garden-ui writes the diff.
  - title: Write the diff by hand
    text: Place a diff below full code; alone it raises diff-orphan.
```

````markdown
```garden compare
items:
  - title: Describe the change in one sentence
    text: Idea block under full code; garden-ui writes the diff.
  - title: Write the diff by hand
    text: Place a diff below full code; alone it raises diff-orphan.
```
````

- **Use when**: Comparing 2 or 3 options, configurations, or before/after behaviors side by side (keep each side-by-side cell under ~60 characters), or stacking good vs. bad practices with `verdict: good | bad`.
- **Skip when**: Comparing more than 3 items or aligning multiple attributes across rows; use a Markdown table instead.

## Good vs. Bad Verdicts (`verdict: good | bad`)

When contrasting an anti-pattern with a recommended practice, add `verdict: bad` or `verdict: good` to the items. Entries with a `verdict` stack vertically with a red cross or green check icon next to the heading, and the ~60-character side-by-side `compare-long` limit does not apply:

```garden compare
items:
  - title: A poor question
    verdict: bad
    text: "“Have you read this author's other books? Could you share a review?”"
  - title: A better question
    verdict: good
    text: "“When do you usually read? Would you like to sit in once first?”"
```

````markdown
```garden compare
items:
  - title: A poor question
    verdict: bad
    text: "“Have you read this author's other books? Could you share a review?”"
  - title: A better question
    verdict: good
    text: "“When do you usually read? Would you like to sit in once first?”"
```
````

| Field | Required | Type | Description |
| :--- | :--- | :--- | :--- |
| `items` | Yes | array (at least 2) | Options to compare; each entry can also be a `"Title: description"` shorthand string |
| `items[].title` | Recommended | string | Item heading |
| `items[].text` | Recommended | string or string[] | Body description for the item |
| `items[].verdict` | No | `"good"` or `"bad"` | Marks the item as a good (green check) or bad (red cross) example and stacks items vertically |
| `items[].<customKey>` | No | string or number | In side-by-side mode, extra key-value pairs rendered as attribute tags along the bottom of the card |
