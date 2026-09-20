# How [KV Caching](https://www.christyjacob.dev/blog/kv-caching) presents, and what garden-blog can do today

This note is research only. It describes the presentation techniques on [Christy Jacob’s KV Caching article](https://www.christyjacob.dev/blog/kv-caching) (26 Mar 2026) and how [garden-blog](https://github.com/hedon954/garden-blog) could support them without changing product code.

Evidence comes from the live HTML, the Next.js RSC payload, and the hydrated client bundle. The three teaching widgets are client-only (`next/dynamic` + `BAILOUT_TO_CLIENT_SIDE_RENDERING`), so a Markdown scrape of the page drops them. The widgets were reconstructed from their shipped JavaScript, not guessed from the prose.

The [garden](https://github.com/hedon954/garden) template already has a short KV Cache note (`content/posts/understand-kv-cache.md`) that uses Mermaid plus one display formula. That is the current Garden fallback for this topic: static diagram and math, no interaction.

## 1. What the article actually does

The page is a Next.js App Router essay, not a Markdown blog with a few extras. Prose is compiled (MDX-style) and three React SVG widgets are inserted with `next/dynamic`. There is no Mermaid, no callout, no table, and no footnote list on this page. Interaction is the point.

### Page chrome and reading layout

- **Dark-only portfolio frame.** `html` is `dark min-h-screen bg-background font-sans overflow-x-hidden`. A full-viewport `grain` overlay sits behind the page.
- **Narrow column, not a docs layout.** Content is `max-w-2xl mx-auto` (~672px). There is no article table of contents and no extra sidebar next to the prose.
- **Site nav, not post TOC.** A compact `home / work / projects / blog` row sits above the article; on large screens it is `lg:sticky lg:top-20`. The current item (`blog`) gets a faint pill.
- **Title block is typographic, not metadata-heavy.** Uppercase date eyebrow (`Mar 26, 2026`), Lora serif H1, then a Lora muted deck that restates the subtitle. No topic chip, reading time, word count, or tags on the page.
- **Hero is a 16:9 cover, not an inline figure.** `/blog/kv-caching/cover.jpg` is a `relative aspect-video` image with `rounded-xl shadow-2xl`, Next `<Image>` srcset, and `fetchPriority="high"`.
- **Body uses Tailwind Typography.** `article.prose mt-8`. Headings get empty permalink anchors (`<a class="anchor">`) before the title text.
- **SEO is first-class.** JSON-LD `BlogPosting`, Open Graph, Twitter `summary_large_image`, canonical URL, robots meta.

Garden-blog already has a stronger *reading system* (cover, topic, deck, dates, reading time, word count, sticky TOC, tags). Christy’s page is a *presentation system*: one column, dark, cinematic, and then widgets.

### Three custom teaching widgets

All three sit in `div.not-prose my-8` so Typography margins do not fight the SVG. They share a look: Geist Mono, green `#4ade80`, 300ms fill/stroke transitions, `rounded-xl` padding, viewBox-scaled SVG.

#### Widget A — Autoregressive waste (autoplay, no controls)

Placed after “Token 1 will be recomputed *N* times…”.

- Tokens `The cat sat on the mat` light up left to right.
- Under each step, a growing row of 30×30 cells appears: **green = new work**, **red = recomputed past tokens**.
- A running counter shows `Compute: X / Y redundant`. After the last step it swaps to a summary: **Total 21, New work 6, Redundant 15** (`N(N+1)/2` for `N=6`).
- It autoplays (about 800ms per step), holds the summary for 2s, then loops. There is no Prev/Next. The argument is *felt* before the `O(N²)` formula.

#### Widget B — Prefill / decode stepper (manual)

Placed after “Step through the visualization below…”. Five steps, `Prev` / numbered pills `1–5` / `Next`.

| Step | What you see |
| --- | --- |
| 1 | Prompt tokens `I love ML !`. Full **Q / K / V** matrices, all 4×d rows bright. Caption: “Prefill: process entire prompt in parallel”. |
| 2–4 | Decode tokens `It`, `is`, `great` one at a time. **Q shrinks to 1×d**. **K cache** and **V cache** grow by one highlighted row. A dashed “attention” curve runs from Q into K. |
| 5 | Split view: **Without cache** (red, dimmed redundant rows) vs **With cache**. Caption: `21 projections → 7 projections`. |

Color is consistent: Q green, K blue, V mint. This is the article’s main “see it” device.

#### Widget C — Memory-wall chart (hover + slider)

Placed after “scale up the sequence length or batch size…”.

- Log-X sequence length: 512 → 128K. Linear-Y KV cache GB, 0–160.
- Three fp16 curves using the same formula as the later code: `2 × L × H × d_h × N × B × 2 / 1024³` for Llama-style **7B / 13B / 70B**.
- Dashed GPU ceilings: RTX 4090 24GB, A100 40GB, A100 80GB / H100, with dots where each curve crosses.
- Mouse-move crosshair + tooltip: `Seq: 4K | 7B: 2.0 GB | 13B: …`.
- **Batch size** range input, 1–32. This is the only slider on the page; it is how “batch 8 at 32K blows a consumer GPU” becomes a number you can change.

### Math, code, and prose texture

- **KaTeX everywhere.** Two display blocks (the attention formula and the cache-size formula) plus many inline expressions (`N`, `O(N^2)`, `K_i = W_K x_i`, `q_t`, shapes like `(1 × d)`). MathML is in the DOM for accessibility.
- **Code is a window, not a fence.** Five Python blocks share one `CodeBlock` component: macOS traffic-light dots, centered language label (`python` / mapped names), a non-selectable line-number gutter, Prism tokens, `0.84em` / `1.75` line-height, dark translucent chrome. Optional `filename` exists in the component but this article does not use it. There is no copy button.
- **Prose devices are ordinary Markdown.** Numbered decode steps, a Q/K/V bullet list with inline math, bold terms (`training` / `inference` / `memory wall`), parenthetical paper citations (`Shazeer, 2019`, `Ainslie et al., 2023`, `Dao et al., 2022`, `Kwon et al., 2023`, `Hooper et al., 2024`). No `[!NOTE]` callouts, no `<details>`, no tabs.
- **Animation budget is small and local.** Widget A is a timeout loop. Widgets B and C use CSS `transition` on SVG fill/stroke plus hover. This is not Framer Motion or a scroll-driven story.

### How the site authors this (inferred)

The RSC tree inserts the widgets as `next/dynamic` client modules with `fallback: null`. That is MDX / compiled React, not a Markdown plugin. The same blog bundle also contains Mermaid, a Model Memory Calculator, FlashAttention tabs, and other essay widgets — this post only mounts the three above.

Implication for Garden: cloning the *effect* does not require cloning their whole MDX site. It does require a way to drop **named, hydrated client components** into an otherwise static Markdown article.

## 2. What garden-blog already supports

garden-blog is a Typora-first, `content/*.md` pipeline: `react-markdown` + remark/rehype, static export to GitHub Pages. Interactive bits already exist, but only as **fenced-language special cases** and **raw HTML**.

| Technique on Christy’s page | Garden-blog today |
| --- | --- |
| Cover + title + deck | Yes. Front matter `cover`, `description`; also topic, dates, reading time, word count, tags. |
| Heading permalinks | Yes. `rehype-slug` + `rehype-autolink-headings` (`behavior: "wrap"`). |
| Inline + display KaTeX | Yes. `remark-math` + `rehype-katex`, including CJK-adjacent bold and display-math scroll. |
| Syntax-highlighted code + language label | Yes. `rehype-highlight`; `pre[data-language]` badge, top-right. Always-dark code theme. |
| Line numbers, traffic lights, centered language | No. |
| Mermaid process diagrams | Yes, and stronger than this article needs: client render, 图表 / Code toggle, neutral theme. The garden template KV post already uses this. |
| Callouts | Yes. Typora/Obsidian `> [!TYPE]`. This article does not use them; Garden posts do. |
| GFM tables, task lists, footnotes, strikethrough | Yes (`remark-gfm`). Unused on this page; footnotes would cover the paper citations better than parentheticals. |
| Native HTML (`<details>`, `<video>`, `<u>`) | Yes via `rehype-raw`. Styled `<details>` / `<summary>` already ship. |
| Custom fenced blocks that become components | Yes, two languages: `mermaid` → `MermaidDiagram`, `embed` → `ExternalEmbed`. |
| Sticky TOC + scroll spy | Yes (H2–H5). Christy’s page has none. |
| Image lightbox | Yes. |
| YouTube / Bilibili / link cards | Yes (`embed`). Unused here. |
| Dark cinematic essay chrome | No. Garden is a light reading site with a right TOC; callout surfaces are light. |
| Autoplay / stepper / hover-chart widgets | No. |
| MDX / JSX in posts | No. `package.json` has no `@mdx-js/*` or `next-mdx`. |
| Tabs, Markmap | Not rendered. Hexo `{% tabs %}` / `{% markmap %}` were stripped or left as fences during migration. |

The extension point that already matches Christy’s *authoring shape* is `MarkdownArticle`’s `CodeBlock`: language tag → React component. Mermaid and embed prove the pattern. Widgets would be a third language (or a small family), not a new architecture.

Constraints that matter later:

- **Typora is the editor.** Authors preview `.md`. JSX / MDX will not preview there.
- **Static export.** `STATIC_EXPORT=1` → GitHub Pages. Client components already hydrate (Mermaid). Same is true for new widgets if they are self-contained and do not need a server.
- **Search and RSS strip markup.** `toSearchableText` unwraps fences to their inner text. A `widget` fence should carry a caption or it disappears from search.
- **Heading IDs** come from the same remark plugin list as the article. Widget fences must not be parsed as headings.

## 3. Gaps, and a way to support each technique

### A. Pedagogical widgets (the real gap)

Christy’s three widgets are **bespoke React**, not generic Markdown. Garden should not port those components one-for-one. It should add a **small widget host** and a few primitives.

**Recommended authoring (stays Typora-valid):**

````md
```widget
kind: autoregressive-waste
tokens: [The, cat, sat, on, the, mat]
autoplay: true
caption: Naive decode recomputes every past token at every step.
```
````

`kind` selects a registered client component. YAML in the fence matches `embed`. Unknown `kind` renders the caption plus a non-interactive fallback (table or Mermaid), never a blank `not-prose` hole.

| Widget | Support path | Why not MDX first |
| --- | --- | --- |
| Autoplay waste animation | New `kind` on a `Stepper` / `MatrixRows` primitive. Tokens and colors as YAML. Honor `prefers-reduced-motion` (jump to summary). | Needs timers and SVG cells; cannot be honest HTML. |
| Prefill/decode stepper | Same primitive with `mode: manual`, `steps: [...]`, optional side-by-side last step. | Prev/Next + step state. |
| Memory chart | New `kind: line-chart` with series formula or explicit points, log axis, reference lines, tooltip, `input[type=range]` binding. | Hover + slider. A static Mermaid/SVG is a fallback, not a replacement. |

**Do not** start with full MDX. It breaks Typora, splits the content compiler (`build-content.mjs` + `extractHeadings` + search), and invites arbitrary JSX in a Git-backed corpus.

**Optional later:** a single-post MDX escape hatch (`content/posts/**/*.mdx`) for one-off widgets that will never be reused. Only after the fenced registry exists, and only if a post cannot be expressed as YAML + a registered `kind`.

**Also acceptable, lower ceiling:**

- Static SVG / PNG in `./assets/` — works today, no interaction.
- Mermaid (already in the garden KV post) — good for prefill→decode loops, bad for matrix cells and charts.
- `<details>` walkthroughs — works today, no motion.

### B. Code-block chrome

Gap: line numbers, traffic-light bar, centered language, optional filename.

Support without MDX: enhance the existing `pre` renderer in `MarkdownArticle`. Keep the current `data-language` badge as default; add opt-in (` ```python filename=cache.py ` or a site flag) so existing posts do not all grow gutters.

Copy-to-clipboard is not on Christy’s page. If Garden adds chrome, copy is more useful than traffic lights.

### C. Layout and visual tone

Gap: narrow dark essay, grain, Lora, no TOC, 16:9 rounded hero.

Garden should **not** copy that chrome site-wide. The TOC, topic row, and light paper are the product. If a post wants “essay mode”, a front-matter flag (`layout: essay` or `chrome: cinematic`) is enough: hide TOC, tighten measure, optionally invert the article well. That is CSS, not Markdown.

Hero treatment (aspect-ratio + radius) is also CSS on `.article-hero`.

### D. Math

No gap for this article. Garden already renders the same TeX. Display-math overflow and KaTeX version pinning are already documented.

### E. Callouts, tabs, diagrams

This article does not use callouts; Garden already has better ones. Tabs and Markmap are leftover Hexo gaps, not requirements to clone this page. A future `tabs` fence would help comparison posts (naive vs cached code) more than this one, which just stacks two Python blocks.

### F. Accessibility, no-JS, RSS

Christy’s widgets are empty in the raw HTML until hydration. Garden should do better if it adds widgets:

- Always render `caption` (and maybe a short alt table) in the server HTML.
- Pause autoplay when `prefers-reduced-motion: reduce` (Garden already forces short animations globally in one media query).
- Keep the surrounding prose self-contained so RSS / no-JS readers still get the argument.

## 4. Prioritized recommendations

1. **Extend the fenced-language registry** (`mermaid` / `embed` → add `widget`). Same `CodeBlock` switch, YAML body, caption required. This is the only path that fits Typora, static export, and the existing compiler.
2. **Ship three primitives, not three one-off KV toys:** manual/auto stepper with matrix cells; hoverable line chart with a bound range input; optional side-by-side compare step. Those three cover this article and most later LLM explainers (attention, GQA, quantization).
3. **Require a static fallback** (caption + Mermaid or table) so search, RSS, and no-JS stay honest.
4. **Optional essay chrome via front matter**, not a redesign. Measure + hero radius + optional TOC hide. Leave Garden’s light reading UI as default.
5. **Code-block polish second.** Line numbers and copy help every post; traffic lights are costume. Do not block widgets on this.
6. **Defer MDX** until a post needs an unregistered, one-off component. If it happens, isolate `.mdx` so `.md` + Typora stay the default.
7. **Do not port Christy’s widget source.** Recreate the *behaviors* (autoplay waste, five-step KV, memory slider) on Garden primitives so the look matches `--font-mono` / accent tokens, not their dark portfolio.

### Suggested first article to prove it

The garden template post `understand-kv-cache.md` is the natural demo: keep the Mermaid overview, then add Widget A + B + C as `widget` fences. garden-blog’s longer LLM posts (`weight-typing`, `back-propagation`, …) can adopt the same fences later without leaving Typora.

### What not to do

- Do not compile every post as MDX.
- Do not add a general “run JSX from Markdown” escape.
- Do not treat Mermaid as sufficient for this article’s matrix and chart work.
- Do not make the public site dark-only to match the reference.

## Appendix — technique checklist

| Technique | On the article | Garden-blog now | Proposed support |
| --- | --- | --- | --- |
| Narrow dark essay + grain | Yes | No (light + TOC) | Optional `layout: essay` CSS |
| 16:9 rounded hero | Yes | Full-width cover | CSS on `.article-hero` |
| Autoplays waste animation | Yes | No | `widget` + stepper primitive |
| Manual Q/K/V stepper | Yes | No | same |
| Hover chart + batch slider | Yes | No | `widget` + chart primitive |
| KaTeX | Yes | Yes | Keep |
| Windowed code + line numbers | Yes | Language badge only | Enhance `pre` |
| Mermaid | No | Yes | Keep as fallback |
| Callouts | No | Yes | Keep |
| MDX / arbitrary JSX | Yes (site-wide) | No | Avoid; fence registry first |
| TOC / reading time / tags | No | Yes | Keep |
