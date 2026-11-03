---
title: How the Reading Layout Works
navTitle: How the Reading Layout Works
description: Three-tier 740/1040/1340px adaptive widths, two-line title splitting, zero-CLS image sizing, dark-mode image backing, and warm paper tokens.
section: writing-and-reading
order: 11
---

Garden automates several layout details for long-form technical reading. Blog posts, column entries, and this handbook share the same stylesheets and measurement scripts.

## 1. Three-tier Adaptive Widths: `740px` / `1040px` / `1340px`

An article page consists of a centered reading column and a floating right-hand table of contents (`200px`). On load and window resize, the `ArticleMeasure` script measures wide figures and tables in the body and expands them symmetrically into the available horizontal margins:

| Element | Max Width | Expansion Rule and Boundaries |
| :--- | :--- | :--- |
| Paragraphs, lists, code blocks, built-in components | `740px` | Body text uses `17px` font size and `1.75` line height (or `1.6` on English handbook pages) and stays inside the reading column |
| Wide figures (`.fig`) | `1040px` | Retina screenshots default to half their pixel width (`naturalWidth / 2`); when wider than the column on viewports `>= 900px`, they extend up to `150px` on each side (keeping at least `24px` from the viewport edge, or staying between the sidebar and TOC on handbook pages) |
| Wide tables (`.table-wrap`) | `1340px` | Measured at `max-content` without wrapping; when wider than `740px` on viewports `>= 900px`, tables extend up to `300px` on each side |
| Floating table of contents (`.toc`) | `200px` | On standalone post pages, when a widened figure or table approaches the TOC, the TOC shifts right to clear it or hides temporarily if the viewport has no room, reappearing once scrolled past |

## 2. Two-line Title Splitting and Font Scaling

The `ArticleTitle` component applies two rules to headings:

1. **With a delimiter (` | ` with surrounding spaces)**: Splits the title into two lines at the first delimiter and computes the `--l` scaling variable from the wider line's character width (counting CJK characters as `1`, uppercase letters as `0.68`, other characters as `0.58`, and spaces as `0.3`) so the longer line fits without wrapping again. Screen readers still read the full title with the delimiter.
2. **Without a delimiter**: Renders a single `<h1>` with CSS `text-wrap: balance`, never splitting automatically on colons or dashes and never rescaling the font size.

> [!NOTE] Note
> If a title includes a split delimiter with an empty left or right side, `npx garden check` emits a `title-split` warning requiring text on both sides of the delimiter.

## 3. Build-time Image Dimensions and Lightbox Zoom

When `npx garden sync` runs, the build script reads the pixel width and height of every local image (PNG, JPEG, WebP, GIF, and SVG) and writes them into the `imageSizes` map in `.garden/generated-content.ts`:

```garden compose
title: From build to the browser
caption: Click a step to read what that stage does
steps:
  - id: sync
    title: Read sizes at build time
    text: Write width and height so text does not jump
  - id: measure
    title: Measure on the client
    text: Fit wide figures and the table of contents
  - id: dark
    title: Dark backing and zoom
    text: A light pad behind dark lines, click to zoom
notes:
  - for: sync
    text: The server HTML already carries width, height, and the wide-figure margins, so later text does not jump before the image loads.
  - for: measure
    text: After load, ArticleMeasure recomputes the margins for the current viewport and checks whether a wide figure covers the table of contents.
  - for: dark
    text: A click opens the lightbox on the same page. Dark mode puts a light paper color behind figures and does not invert them.
```

## 4. Dark-mode Image Backing and Warm Paper Tokens

Technical posts frequently include transparent-background architecture diagrams or equation screenshots drawn with dark lines. On a dark page background those dark lines disappear, while a CSS `filter: invert` distorts full-color screenshots.

In dark mode, Garden sets `background: var(--image-backing)` (`#faf9f5`) on article figures and lightbox images without applying color inversion or extra padding. Transparent dark-line diagrams stay legible, and opaque screenshots look unchanged. Site favicons share the same backing token, whereas post covers, avatars, and link card thumbnails do not.

The site palette is defined in `app/styles/tokens.css` without brand blue:

| Token | Light Mode | Dark Mode | Purpose |
| :--- | :--- | :--- | :--- |
| `--paper` | `#faf9f5` | `#1f1e1d` | Primary page background (`--image-backing` in dark mode also uses `#faf9f5`) |
| `--paper-deep` / `--well` | `#f0eee6` | `#262624` | Code block and recessed well background |
| `--chip` | `#f0eee6` | `#30302e` | Tag pills and button fills |
| `--card` | `#ffffff` | `#262624` | Elevated cards, figure frames, and dialogs |
| `--ink` | `#1b1a18` | `#eeece7` | Headings, strong emphasis, and primary interactive ink |
| `--text` / `--soft` | `#2d2c29` / `#4a4844` | `#dcd9d2` / `#bdb9b0` | Body paragraphs and secondary copy |
| `--muted` | `#6e6b64` | `#a09b91` | Dates, captions, and table headers (meeting WCAG AA 4.5:1 contrast) |
| `--rule` / `--rule-strong` | `#e6e3dc` / `#d6d2c9` | `#3d3d3a` / `#4d4c48` | `1px` hairlines, card borders, and emphasized strokes |
