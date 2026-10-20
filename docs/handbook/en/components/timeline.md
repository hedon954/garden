---
title: Step Timeline (timeline)
navTitle: timeline
description: Order release milestones, incident steps, or build stages along a vertical sequence.
section: components
order: 34
badge: timeline
---

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

- **When to use**: Walking through incident timestamps, evolution stages, or pipeline steps in chronological order (at least 2 items).
- **When to skip**: Listing unordered points with no sequence; use a regular bullet list or [`list`](/garden/en/components/list) instead.

You can tell the AI:

````markdown
```garden
List the three stages of static publishing in order as a timeline.
```
````

## Fields

Fence header: ` ```garden timeline ` (snippet trigger `;gtimeline`).

| Field | Required | Default | Allowed Values & Limits | Description |
| :--- | :--- | :--- | :--- | :--- |
| `title` | Optional | none | string | Heading above the timeline |
| `items` | Required | `[]` | object[] (at least `2` items; unknown top-level keys or invalid YAML report `garden-yaml`) | Ordered list of steps or milestones |
| `items[].date` | Optional | none | string | Timestamp, year, or stage label above the item title |
| `items[].title` | Required | `""` | string | Step heading |
| `items[].text` | Optional | none | string | Detailed explanation for the step |
| `items[].source` | Optional | none | URL, `{ url, site?, icon? }`, or array | Source attribution chip appended to the step text (`site` defaults to the URL hostname without `www.`) |
