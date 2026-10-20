---
name: garden-interactive-chart
description: >-
  Writes Garden interactive charts as self-contained HTML in a same-name
  sidecar directory and embeds them with a short garden html fence. Use when adding
  or editing Garden widgets, steppers, inspect grids, param benches,
  compare views, traces, KV cache charts, or any interactive chart / same-name directory HTML.
---

# Garden interactive charts

Complex interaction does not go into Markdown. Each post has a same-name directory, and every `.html` file in it is one chart that can be opened on its own. The post body only embeds a short fence.

Background: [Interactive components](https://github.com/hedon954/garden/blob/main/docs/interactive-blog-components.md). Finished examples to copy: [widget-kind-examples](https://github.com/hedon954/garden/tree/main/docs/widget-kind-examples).

## When to draw, when to stop

Ask first: is the reader stuck because a process was frozen into a photo, a parameter is a fixed example, two dimensions were flattened, a comparison needs scrolling back and forth, or a "what if" cannot be tried? If not, write prose or Mermaid.

Five primitives. Pick one before you draw:

| What the reader should do | Primitive | Copy from |
| --- | --- | --- |
| Stop at a given beat | Stepper | [stepper.html](https://github.com/hedon954/garden/blob/main/docs/widget-kind-examples/stepper.html), [waste.html](https://github.com/hedon954/garden/blob/main/docs/widget-kind-examples/waste.html) |
| Look at cells and talk about them | Inspect grid | [inspect-grid.html](https://github.com/hedon954/garden/blob/main/docs/widget-kind-examples/inspect-grid.html) |
| Turn a knob, watch numbers or curves | Param bench | [param-bench.html](https://github.com/hedon954/garden/blob/main/docs/widget-kind-examples/param-bench.html) |
| See both sides at the same moment | Compare view | [compare.html](https://github.com/hedon954/garden/blob/main/docs/widget-kind-examples/compare.html) |
| See the current node and current edge | Trace | [trace.html](https://github.com/hedon954/garden/blob/main/docs/widget-kind-examples/trace.html) |

If it fits, change the data instead of adding a new type. Past about 9 nodes or 12 steps, split it into two charts.

## File conventions

When the Markdown is at `content/posts/<dir>/<slug>.md`, charts can only live in `content/posts/<dir>/<slug>/`:

```text
content/posts/windowsill-herbs.md
content/posts/windowsill-herbs/layers.html
```

Body:

````md
```garden html
src: ./windowsill-herbs/layers.html
title: Water takes about a minute to seep from the soil surface to the drain hole.
```
````

Rules:

- `src` must be a local `.html` or `.pdf` in that same-name directory. It cannot point to `assets/`, another post, or `https://`
- HTML that reports its height with `garden-chart` is a chart and is shown inline. Plain HTML and PDF are folded into a preview entry by default and load when the reader opens them
- `title` must be a claim, not "see the chart below"
- One chart per HTML file. Use short kebab-case names such as `layers.html` or `diagram.html`
- The HTML is self-contained: CSS, SVG and scripts all live in that one file
- Write the HTML first, then the fence. Do not spell out step arrays or sample points in the fence

The build checks the path and copies the file to `/media/...`. A wrong path fails the build.

## Writing the HTML

1. Copy [references/shell.html](references/shell.html), or start from the closest example.
2. Use only the color and font tokens in [references/style.md](references/style.md). Do not invent a dark cinematic style.
3. Call the boot script in the shell: it reads `?theme=light|dark` and uses `ResizeObserver` to send `{ source: "garden-chart", height }` to the parent page.
4. Respect `prefers-reduced-motion: reduce`: autoplay stops at the first step or the final state.
5. Use native `button` and `input` controls. Bind sliders to fixed inputs. Never `eval` reader input, and never make network requests.
6. Open the HTML in a browser and walk the main path and the empty state. Then run `CONTENT_INCLUDE_DRAFTS=1 make dev` to check the embed.

## Don't

- Put steps, grids or formula sample points in Markdown
- Use remote scripts, remote iframes or any CDN (the system monospace stack is enough)
- Read or write the parent page's DOM or cookies, or depend on `allow-same-origin`
- Use MDX, JSX, or post-specific type names (for example `autoregressive-waste`)
- Make the interaction the only explanation: the surrounding prose must stand on its own

## Before you hand it in

- [ ] The file is in the same-name directory, and the fence has only `src` + `title`
- [ ] The HTML works when opened on its own, and the iframe grows to its height
- [ ] Light and dark themes both follow the Garden page
- [ ] No autoplay loop when reduced motion is on
- [ ] `title` gives the conclusion to readers without JS
