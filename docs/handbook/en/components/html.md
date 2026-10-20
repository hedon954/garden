---
title: Embedded Web Snippet (html)
navTitle: html
description: Run a self-contained HTML, CSS, and JavaScript demo inside a sandboxed iframe.
section: components
order: 37
badge: html
---

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

- **When to use**: Running custom DOM scripts, Canvas animations, physical simulations, or self-contained HTML widgets.
- **When to skip**: You only need sliders wired to a formula (use [`interactive`](/garden/en/components/interactive)) or a diagram with clickable regions (use [`figure`](/garden/en/components/figure)).

You can tell the AI:

````markdown
```garden
Embed a small widget where typing in an input box updates the character count in real time.
```
````

## Fields

Every field, default, limit and error code is in [Component reference · html](/garden/en/reference/html).
