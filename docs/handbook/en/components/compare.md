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
  - title: 写一句话说明改了什么
    text: 想法块紧跟在完整代码下面，garden-ui 把它换成 diff，页面合成「代码 / 对比上一版」。
  - title: 手写 diff
    text: 完整代码下面紧跟一段 diff；前面没有完整代码时，garden check 报 diff-orphan。
```

````markdown
```garden compare
items:
  - title: 写一句话说明改了什么
    text: 想法块紧跟在完整代码下面，garden-ui 把它换成 diff，页面合成「代码 / 对比上一版」。
  - title: 手写 diff
    text: 完整代码下面紧跟一段 diff；前面没有完整代码时，garden check 报 diff-orphan。
```
````

- **Use when**: Comparing 2 or 3 options, configurations, or before/after behaviors side by side (keep each cell under ~60 characters).
- **Skip when**: Comparing more than 3 items or aligning multiple attributes across rows; use a Markdown table instead.

| Field | Required | Type | Description |
| :--- | :--- | :--- | :--- |
| `items` | Yes | array (at least 2) | Options to compare; each entry can also be a `"Title: description"` shorthand string |
| `items[].title` | Recommended | string | Column heading |
| `items[].text` | Recommended | string or string[] | Body description for the column |
| `items[].<customKey>` | No | string or number | Extra key-value pairs rendered as attribute tags along the bottom of the card |
