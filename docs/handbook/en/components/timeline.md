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

- **When to use**: Walking through incident timestamps, evolution stages, or pipeline steps in chronological order.
- **When to skip**: Listing unordered points with no sequence; use a regular bullet list or [`list`](/garden/en/components/list) instead.

You can tell the AI:

````markdown
```garden
List the three stages of static publishing in order as a timeline.
```
````

## Fields

Every field, default, limit and error code is in [Component reference · timeline](/garden/en/reference/timeline).
