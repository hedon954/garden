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
title: Static Publishing Pipeline Stages
items:
  - date: Step 1
    title: Sync Content and Assets
    text: Run `npx garden sync` to validate Front Matter, copy image attachments, and generate the search index and RSS feed.
  - date: Step 2
    title: Build Static Site Output
    text: Run `STATIC_EXPORT=1 npx garden build` to prerender every route into `dist/client/`.
  - date: Step 3
    title: Validate Output and Deploy
    text: Run `npm run pages:validate` to confirm `index.html` exists and no `.env`, source directories, `.map` or `.md` files, or symlinks were included, then publish to GitHub Pages.
```

````markdown
```garden timeline
title: Static Publishing Pipeline Stages
items:
  - date: Step 1
    title: Sync Content and Assets
    text: Run `npx garden sync` to validate Front Matter, copy image attachments, and generate the search index and RSS feed.
  - date: Step 2
    title: Build Static Site Output
    text: Run `STATIC_EXPORT=1 npx garden build` to prerender every route into `dist/client/`.
  - date: Step 3
    title: Validate Output and Deploy
    text: Run `npm run pages:validate` to confirm `index.html` exists and no `.env`, source directories, `.map` or `.md` files, or symlinks were included, then publish to GitHub Pages.
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
