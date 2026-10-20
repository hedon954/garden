---
title: Component reference · html
navTitle: html
description: Run a self-contained HTML, CSS, and JavaScript demo inside a sandboxed iframe.
section: reference
order: 7
badge: html
---

[← Component reference](/garden/en/reference) · [Usage: html](/garden/en/components/html)

## Examples

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

## Syntax

````markdown
```garden html
src:     # either this or code, path
code: |  # either this or src, HTML
title:   # recommended, frame title
```
````

## Fields

Fence header: ` ```garden html ` (snippet trigger `;ghtml`). Invalid YAML or unknown top-level keys report `garden-yaml` on the block.

| Field | Required | Default | Allowed Values & Limits | Description |
| :--- | :--- | :--- | :--- | :--- |
| `src` | Either `src` or `code` | none | relative path (e.g. `./demo.html`) | Path to a standalone `.html` file inside the post's sidecar directory |
| `code` | Either `code` or `src` | HTML body below `---` or `""` | multiline HTML string | Inline HTML markup (runs inside a sandboxed `iframe` and resizes to fit its content when `<script>` is present; HTML can also be placed below a `---` separator) |
| `title` | Recommended | `"HTML"` | string | Frame header title and accessible `iframe` title |

## Limits & errors

- Apart from the shared `garden-yaml`, this component has no error codes of its own; values marked "not checked" in the table never report an error.
