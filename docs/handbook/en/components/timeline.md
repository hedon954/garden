---
title: Step Timeline (timeline)
navTitle: timeline
description: Order release milestones, incident steps, or build stages along a vertical sequence.
section: components
order: 34
badge: timeline
---

Write "use `timeline` to list the three stages of the static publishing pipeline in order" inside a `garden` idea block, and the Agent generates the `garden timeline` block below via the `garden-ui` skill (hand-written syntax follows).

```garden timeline
title: 静态发布流水线执行步骤
items:
  - date: 步骤 1
    title: 同步内容与静态资源
    text: 运行 `npx garden sync`，校验 Front Matter、复制图片附件并生成搜索索引与 RSS。
  - date: 步骤 2
    title: 构建静态站点产物
    text: 运行 `STATIC_EXPORT=1 npx garden build`，把全部路由预渲染到 `dist/client/`。
  - date: 步骤 3
    title: 校验静态页面并部署
    text: 运行 `npm run pages:validate` 确认有 `index.html`，且没有混入 `.env`、源码目录、`.map` 或 `.md` 文件和软链接，通过后发布到 GitHub Pages。
```

````markdown
```garden timeline
title: 静态发布流水线执行步骤
items:
  - date: 步骤 1
    title: 同步内容与静态资源
    text: 运行 `npx garden sync`，校验 Front Matter、复制图片附件并生成搜索索引与 RSS。
  - date: 步骤 2
    title: 构建静态站点产物
    text: 运行 `STATIC_EXPORT=1 npx garden build`，把全部路由预渲染到 `dist/client/`。
  - date: 步骤 3
    title: 校验静态页面并部署
    text: 运行 `npm run pages:validate` 确认有 `index.html`，且没有混入 `.env`、源码目录、`.map` 或 `.md` 文件和软链接，通过后发布到 GitHub Pages。
```
````

- **Use when**: Walking through incident timestamps, evolution stages, or pipeline steps in chronological order (at least 2 items).
- **Skip when**: Listing unordered points with no sequence; use a regular bullet list instead.

| Field | Required | Type | Description |
| :--- | :--- | :--- | :--- |
| `title` | No | string | Heading above the timeline |
| `items` | Yes | object[] (at least 2) | Ordered list of steps |
| `items[].date` | No | string | Timestamp, stage label, or step number above the item title |
| `items[].title` | Yes | string | Step heading |
| `items[].text` | No | string | Detailed explanation for the step |
| `items[].source` | No | string or `{ title, url }` | Source attribution badge |
