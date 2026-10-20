---
title: Side-by-Side Comparison (compare)
navTitle: compare
description: Place two or three options side by side to contrast tradeoffs, or stack good and bad practices.
section: components
order: 33
badge: compare
---

```garden compare
items:
  - title: Describe the change in one sentence
    text: Idea block under full code; garden-ui writes the diff.
  - title: Write the diff by hand
    text: Place a diff below full code; alone it raises diff-orphan.
```

- **When to use**: Comparing 2 or 3 options, configurations, or before/after behaviors side by side (up to ~60 characters per cell in side-by-side mode), or stacking anti-patterns and recommended practices.
- **When to skip**: Comparing more than 3 items or aligning multiple attributes across rows; use a Markdown list or table instead.

You can tell the AI:

````markdown
```garden
Contrast describing a code change in one sentence against writing a diff block by hand.
```
````

## Good vs. Bad Verdicts (`verdict: good | bad`)

When contrasting an anti-pattern with a recommended practice, adding `verdict: bad` or `verdict: good` stacks the items vertically and shows a red cross or green check beside each heading:

```garden compare
items:
  - title: A poor question
    verdict: bad
    text: "“Have you read this author's other books? Could you share a review?”"
  - title: A better question
    verdict: good
    text: "“When do you usually read? Would you like to sit in once first?”"
```

You can tell the AI:

````markdown
```garden
Contrast a poor question and a better question when welcoming a newcomer, marked as bad and good examples.
```
````

## Fields

Every field, default, limit and error code is in [Component reference · compare](/garden/en/reference/compare).
