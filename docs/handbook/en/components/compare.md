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

You can tell the AI:

````markdown
```garden
Contrast describing a code change in one sentence against writing a diff block by hand.
```
````

## Good vs. Bad Practices

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

- **When to use**: Comparing 2 or 3 options, configurations, or before/after behaviors side by side, or stacking anti-patterns and recommended practices.
- **When to skip**: Comparing more than 3 items or aligning multiple attributes across rows; use a Markdown table instead.
