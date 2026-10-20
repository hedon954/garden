---
title: Embedded Web Snippet (html)
navTitle: html
description: Run a self-contained HTML, CSS, and JavaScript demo inside a sandboxed iframe.
section: components
order: 37
badge: html
---

Write "use `html` to embed a small widget that counts characters as the reader types" inside a `garden` idea block, and the Agent generates the `garden html` block below via the `garden-ui` skill (hand-written syntax follows).

```garden html
title: Character Count Widget
height: 156
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

````markdown
```garden html
title: Character Count Widget
height: 156
code: |
  <!doctype html>
  <html lang="en">
  <head><meta charset="utf-8" /></head>
  <body>
    <input id="txt" value="Keep your posts in a Git repository and push to deploy." />
    <div>Characters: <strong id="count">55</strong></div>
    <script>
      const input = document.getElementById("txt");
      const count = document.getElementById("count");
      input.addEventListener("input", () => { count.textContent = String(input.value.length); });
    </script>
  </body>
  </html>
```
````

- **Use when**: Running custom DOM scripts, Canvas drawings, or self-contained HTML snippets (either inline via `code` or loaded from a sibling `.html` file via `src`).
- **Skip when**: You only need sliders wired to a formula (use [`interactive`](/garden/en/components/interactive)) or a diagram with clickable regions (use [`figure`](/garden/en/components/figure)).

| Field | Required | Type | Description |
| :--- | :--- | :--- | :--- |
| `src` | Either this or `code` | relative path | Path to a `.html` file in the same directory or sibling asset directory |
| `code` | Either this or `src` | multiline string | Inline HTML markup (alias `html` is also accepted) |
| `title` | Recommended | string | Header bar title and accessible `iframe` title |
| `height` | No | number | Initial height in pixels (defaults to `260`; resizes to fit content after load) |
| `caption` | No | string | Caption shown below the frame |
