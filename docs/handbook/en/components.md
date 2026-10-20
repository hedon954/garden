---
title: Components Overview
navTitle: Overview
description: Live preview of all 12 built-in components.
section: components
order: 30
---

## [Reference Card · card](/garden/en/components/card)

```garden card
title: SQLite Write-Ahead Logging
url: https://www.sqlite.org/wal.html
meta: Documentation · sqlite.org
description: Appends changes sequentially to a write-ahead log while readers continue reading the original database pages, reducing read-write contention.
points:
  - Writes append to the end of the `-wal` file instead of overwriting database pages in place on commit.
  - Readers record the current end-of-log mark to see a consistent snapshot without blocking concurrent writers.
```

## [Key Figures · stat](/garden/en/components/stat)

```garden stat
items:
  - label: Reading Column
    value: "740"
    unit: px
    caption: Default prose column width
  - label: Wide Figure Limit
    value: "1040"
    unit: px
    caption: Extends up to 150px on each side
  - label: Wide Table Limit
    value: "1340"
    unit: px
    caption: Extends up to 300px on each side
```

## [Side-by-Side Comparison · compare](/garden/en/components/compare)

```garden compare
items:
  - title: Describe the change in one sentence
    text: Idea block under full code; the AI writes the diff.
  - title: Write the diff by hand
    text: Place a diff block right below the full code block.
```

## [Step Timeline · timeline](/garden/en/components/timeline)

```garden timeline
items:
  - date: Step 1
    title: Sync Content and Assets
    text: Validate Front Matter, copy attachments, and build the search index and RSS feed.
  - date: Step 2
    title: Build Static Site Output
    text: Prerender every route into the static output directory.
```

## [Bar Chart · chart](/garden/en/components/chart)

```garden chart
title: Max Width by Layout Zone
xLabel: Layout Zone
yLabel: Max Width
unit: px
data:
  - x: Prose Column
    y: 740
  - x: Wide Figure Zone
    y: 1040
  - x: Wide Table Zone
    y: 1340
```

## [Annotated Diagram · figure](/garden/en/components/figure)

```garden figure
svg: |
  <svg viewBox="0 0 560 194" xmlns="http://www.w3.org/2000/svg" font-family="var(--sans)" style="max-width: 380px; margin-inline: auto">
    <rect data-p="sync" x="2" y="4" width="180" height="186" rx="16" fill="var(--card)" stroke="var(--rule-strong)" stroke-width="2.5"/>
    <text data-p="sync" x="92" y="42" text-anchor="middle" font-size="24" font-weight="600" fill="var(--ink)">1. garden</text>
    <text data-p="sync" x="92" y="72" text-anchor="middle" font-size="24" font-weight="600" fill="var(--ink)">sync</text>
    <text data-p="sync" x="92" y="108" text-anchor="middle" font-size="24" fill="var(--muted)">Parse</text>
    <text data-p="sync" x="92" y="137" text-anchor="middle" font-size="24" fill="var(--muted)">Markdown &amp;</text>
    <text data-p="sync" x="92" y="166" text-anchor="middle" font-size="24" fill="var(--muted)">image sizes</text>
    <path d="M183.5 97 H188.5" stroke="var(--muted)" stroke-width="2.5"/>
    <rect data-p="build" x="190" y="4" width="180" height="186" rx="16" fill="var(--card)" stroke="var(--rule-strong)" stroke-width="2.5"/>
    <text data-p="build" x="280" y="42" text-anchor="middle" font-size="24" font-weight="600" fill="var(--ink)">2. garden</text>
    <text data-p="build" x="280" y="72" text-anchor="middle" font-size="24" font-weight="600" fill="var(--ink)">build</text>
    <text data-p="build" x="280" y="108" text-anchor="middle" font-size="24" fill="var(--muted)">Build static</text>
    <text data-p="build" x="280" y="137" text-anchor="middle" font-size="24" fill="var(--muted)">pages &amp; index</text>
    <path d="M371.5 97 H376.5" stroke="var(--muted)" stroke-width="2.5"/>
    <rect data-p="validate" x="378" y="4" width="180" height="186" rx="16" fill="var(--card)" stroke="var(--rule-strong)" stroke-width="2.5"/>
    <text data-p="validate" x="468" y="42" text-anchor="middle" font-size="24" font-weight="600" fill="var(--ink)">3. pages:</text>
    <text data-p="validate" x="468" y="72" text-anchor="middle" font-size="24" font-weight="600" fill="var(--ink)">validate</text>
    <text data-p="validate" x="468" y="108" text-anchor="middle" font-size="24" fill="var(--muted)">Check</text>
    <text data-p="validate" x="468" y="137" text-anchor="middle" font-size="24" fill="var(--muted)">exported files</text>
  </svg>
parts:
  - id: sync
    label: 1. Sync Content
    text: Scans posts and sidecar assets to generate site data.
  - id: build
    label: 2. Build Pages
    text: Prerenders all routes and outputs RSS, sitemap, and search indexes.
  - id: validate
    label: 3. Validate Export
    text: Checks that the exported static directory is complete.
```

## [Embedded Web Snippet · html](/garden/en/components/html)

```garden html
title: Character Count Widget
code: |
  <!doctype html>
  <html lang="en">
  <head>
    <meta charset="utf-8" />
    <style>
      body { margin: 0; padding: 16px 18px; font: 14px/1.6 system-ui, sans-serif; color: #1b1a18; background: #faf9f5; }
      input { width: 100%; box-sizing: border-box; padding: 8px 10px; border: 1px solid #d5d1c8; border-radius: 6px; font: inherit; background: #fff; color: #1b1a18; }
      .meta { margin-top: 10px; color: #6e6b64; font-variant-numeric: tabular-nums; }
      strong { color: #1b1a18; }
    </style>
  </head>
  <body>
    <input id="txt" value="Keep your posts in a Git repository and push to deploy." aria-label="Sample text input" />
    <div class="meta">Characters: <strong id="count">55</strong></div>
    <script>
      const input = document.getElementById("txt");
      const count = document.getElementById("count");
      input.addEventListener("input", () => { count.textContent = String(input.value.length); });
    </script>
  </body>
  </html>
```

## [Interactive Formula & Parameters · interactive](/garden/en/components/interactive)

```garden interactive #overview-reading
caption: "Example: estimate reading time from word count and reading speed."
---
<State words={6000} speed={400} />
<Let minutes={round(words / speed)} />

<Slider bind="words" label="Word count" min={1000} max={20000} step={500} unit="words" />
<Slider bind="speed" label="Reading speed" min={200} max={800} step={50} unit="wpm" />

<Stat label="Estimated reading time" value={minutes} unit="min" />
```

## [File Download & Preview · file](/garden/en/components/file)

```garden file
src: ./components/file/checklist.md
title: Pre-publish Checklist
note: Click Preview to read inline or Download to save the file
```

## [Relationship diagram · relations](/garden/en/components/relations)

```garden relations
items:
  - title: Pick
    text: Choose this month's book
  - title: Read
    text: Finish the agreed chapters each week
  - title: Talk
    text: Meet and share views
  - title: Review
    text: Note what to change next time
links:
  - from: 1
    to: 2
  - from: 2
    to: 3
  - from: 3
    to: 4
  - from: 4
    to: 1
  - from: 3
    to: 1
    style: dashed
    label: shapes the pick
```

## [Icon List · list](/garden/en/components/list)

```garden list
items:
  - icon: search
    text: Searches for this month's title
  - icon: eye
    text: Reads 3 reviews
  - icon: heart
    text: Saves the event page
  - icon: chat
    text: Asks in the group chat whether listening only is fine
```

## [Choice Cards · choice](/garden/en/components/choice)

```garden choice
title: Where should we meet next month?
items:
  - icon: idea
    value: $6 each
    text: Corner café, one drink included
    label: Prefer the atmosphere
    reply: Café it is. We will book the long table by the window.
  - icon: book
    value: Free
    text: Library meeting room, booking needed
    label: Prefer the quiet
    reply: Library it is. We will book the room at the start of the month.
none:
  label: Neither / not sure
  reply: No problem. We will share a few more venues in the group chat.
```
