---
title: "Markdown & Component Showcase"
date: 2026-04-08
description: "A tour of how Garden renders tables, four callout styles, two-level headings, code blocks, KaTeX math, and structured garden cards."
tags:
  - Markdown
  - Components
  - Typography
pinned: true
numbering: true
references:
  - title: "GitHub Flavored Markdown Spec"
    url: "https://github.github.com/gfm/"
  - title: "Supported Functions · KaTeX"
    url: "https://katex.org/docs/supported.html"
---

Every article in Garden starts as a plain `.md` file in `content/posts/`. Standard Markdown covers ninety percent of technical writing, while GFM alerts, KaTeX formulas, and fenced `garden` blocks handle the places where raw prose falls short.

## Tables and Callout Blocks

When comparing trade-offs across tools or formats, a plain Markdown table with left, right, and center alignment is faster to read than a wall of bullet points.

### Format Comparison Table

| Layer | Source Syntax | Build Output | Best Used For |
| :--- | :--- | :--- | :--- |
| Prose & Headings | CommonMark (`##`, `###`) | Semantic HTML + auto TOC | Narrative structure and long arguments |
| Data Tables | GFM pipe tables | Scrollable `.table-wrap` | Multi-column feature or benchmark matrices |
| Callouts | `> [!NOTE]` .. `> [!WARNING]` | `.markdown-alert` cards | Side notes, caveats, and operational warnings |
| Math | `$...$` and `$$...$$` | Build-time KaTeX HTML | Complexity bounds, probabilities, and layout math |
| UI Blocks | ```` ```garden <name> ```` | Validated structured components | Key metrics, comparisons, and interactive demos |

### Four Callout Levels

Callouts use GitHub's `> [!TYPE]` blockquote syntax so they remain readable in any plain-text editor or GitHub preview.

> [!NOTE]
> **Context that stays out of the way**
>
> Use a `NOTE` callout for background context or implementation details that a reader skimming the main argument can safely skip on a first pass.

> [!TIP]
> **Run the content linter before building**
>
> Run `make check` (or `npx garden ui check --all`) while drafting to validate frontmatter dates, local image paths, and `garden` component blocks in one pass.

> [!IMPORTANT]
> **Keep hierarchy to two heading levels**
>
> Stick to `##` and `###` inside articles so the right-hand table of contents stays scannable without deep nesting.

> [!WARNING]
> **Avoid raw HTML for layout**
>
> Inline styles and ad-hoc `<div>` wrappers bypass theme tokens and often break when switching between light (`#faf9f5`) and dark (`#1f1e1d`) paper modes.

## Code, Math, and Structured Cards

Technical posts usually mix code, back-of-the-envelope math, and structured summaries. Keeping all three in the same Markdown file avoids broken external embeds.

### Syntax-Highlighted Code and Math

Fenced code blocks carry a language label and a one-click copy button:

```ts
export interface ReadingBudget {
  words: number;
  wordsPerMinute: number;
  codeBlocks: number;
}

export function estimateReadingMinutes(budget: ReadingBudget): number {
  const proseMinutes = budget.words / budget.wordsPerMinute;
  const codeMinutes = budget.codeBlocks * 0.45;
  return Math.max(1, Math.round(proseMinutes + codeMinutes));
}
```

Inline math like $T(n) = \mathcal{O}(n \log n)$ sits on the text baseline, while display blocks center across the reading column:

$$
\text{Contrast Ratio} = \frac{L_{\text{paper}} + 0.05}{L_{\text{ink}} + 0.05}, \qquad \bar{t} = \frac{1}{N}\sum_{i=1}^{N} \left(\frac{w_i}{v} + \alpha c_i\right)
$$

### Structured Garden Cards

When a section needs scannable cards or side-by-side numbers, fenced `garden` blocks turn YAML into warm-paper components that match the rest of the page:

```garden stat #build-pipeline-metrics
caption: Static build profile for the showcase site
items:
  - label: Client Runtime JS
    value: 0
    unit: KB
    text: For plain prose and tables
  - label: Check Gate
    value: "< 1"
    unit: s
    text: Frontmatter and UI schema validation
  - label: Color Modes
    value: 2
    text: Warm light paper and dark slate
```

```garden card #writing-workflow-cards
items:
  - title: CommonMark Specification
    url: https://spec.commonmark.org/
    site: spec.commonmark.org
    description: A strongly defined, highly compatible specification of Markdown for long-lived plain-text archives.
  - title: GitHub Flavored Markdown Spec
    url: https://github.github.com/gfm/
    site: github.github.com
    description: Extends CommonMark with pipe tables, task lists, strikethrough, and autolinks used across Garden posts.
```

```garden compare #authoring-approaches
items:
  - title: Ad-hoc MDX
    text: JSX mixed into prose; easy to break dark mode tokens.
  - title: Standard Markdown
    text: Portable CommonMark with schema-checked garden blocks.
```
