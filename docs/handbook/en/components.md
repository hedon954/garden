---
title: Components Overview
navTitle: Overview
description: What each of the 9 built-in garden components is for, its fence name, and its required fields.
section: components
order: 30
---

You can describe any of these 9 components in a single sentence inside a `garden` idea block and let your Agent generate the block with the `garden-ui` skill (see [Writing with AI](/garden/en/ai-writing)). When writing by hand, open a ```` ```garden <name> ```` code block with the English component name (`card`, `stat`, `compare`, `timeline`, `chart`, `figure`, `html`, `interactive`, or `file`); parameters use YAML, while `interactive` takes declarative tags below `---`.

## Component Quick Reference

| Component | Code Fence | When to Use | Minimum Requirement |
| :--- | :--- | :--- | :--- |
| [card](/garden/en/components/card) | ```` ```garden card ```` | Summarize a paper, open-source project, or subsystem | Provide `description` or `points` |
| [stat](/garden/en/components/stat) | ```` ```garden stat ```` | Place 2 to 4 key numbers and units side by side | Each item requires `label` and `value` |
| [compare](/garden/en/components/compare) | ```` ```garden compare ```` | Compare 2 or 3 options or before/after tradeoffs side by side | At least 2 `items`, ~60 characters per cell |
| [timeline](/garden/en/components/timeline) | ```` ```garden timeline ```` | Walk through debugging steps or release stages in order | At least 2 `items` |
| [chart](/garden/en/components/chart) | ```` ```garden chart ```` | Plot proportional bars from YAML rows (includes an expandable table) | At least 2 rows in `data` |
| [figure](/garden/en/components/figure) | ```` ```garden figure ```` | Highlight regions of an SVG or image diagram with step buttons | Either `svg` or `image` |
| [html](/garden/en/components/html) | ```` ```garden html ```` | Run a self-contained HTML/JS demo in a sandboxed `iframe` | Either `src` or `code` |
| [interactive](/garden/en/components/interactive) | ```` ```garden interactive ```` | Let readers drag sliders or switches to evaluate a non-trivial formula | Must include an input control and a formula beyond a single multiplication |
| [file](/garden/en/components/file) | ```` ```garden file ```` | Offer local or remote attachments for download and inline preview | Either `src` or `files` |

## Authoring Rules

1. **Use standard Markdown first**: Write regular paragraphs, ordered lists, and comparison tables in plain Markdown, and reach for a `garden` fence only when a structured block makes the point easier to read.
2. **Do not duplicate the same numbers**: A `chart` block already includes an expandable data table underneath, so do not put a second Markdown table with the same figures in the same section.
3. **Inline formatting works inside fields**: Text fields such as `text`, `description`, `caption`, and `points` accept inline `**bold**`, `` `code` ``, and `<u>highlighter underline</u>`.
4. **Preview every component locally**: Run `npx garden ui catalog` to generate `.garden/ui-catalog.html` and open it in your browser.
