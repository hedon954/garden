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

```garden figure
caption: Click the buttons above to inspect the three stages from build to browser render
svg: |
  <svg viewBox="0 0 680 110" xmlns="http://www.w3.org/2000/svg" font-family="var(--sans)">
    <rect data-p="sync" x="12" y="18" width="196" height="74" rx="10" fill="var(--card)" stroke="var(--rule-strong)" stroke-width="1.5"/>
    <text data-p="sync" x="110" y="50" text-anchor="middle" font-size="14" font-weight="600" fill="var(--ink)">1. Build-time Sizing</text>
    <text data-p="sync" x="110" y="72" text-anchor="middle" font-size="12" fill="var(--muted)">Emit width / height &amp; --wl</text>
    <path d="M214 55 H236" stroke="var(--muted)" stroke-width="1.5"/>
    <rect data-p="measure" x="242" y="18" width="196" height="74" rx="10" fill="var(--card)" stroke="var(--rule-strong)" stroke-width="1.5"/>
    <text data-p="measure" x="340" y="50" text-anchor="middle" font-size="14" font-weight="600" fill="var(--ink)">2. Client Measurement</text>
    <text data-p="measure" x="340" y="72" text-anchor="middle" font-size="12" fill="var(--muted)">Fit wide figures &amp; TOC</text>
    <path d="M444 55 H466" stroke="var(--muted)" stroke-width="1.5"/>
    <rect data-p="dark" x="472" y="18" width="196" height="74" rx="10" fill="var(--card)" stroke="var(--rule-strong)" stroke-width="1.5"/>
    <text data-p="dark" x="570" y="50" text-anchor="middle" font-size="14" font-weight="600" fill="var(--ink)">3. Dark Backing &amp; Zoom</text>
    <text data-p="dark" x="570" y="72" text-anchor="middle" font-size="12" fill="var(--muted)">Pad #faf9f5 · Click to zoom</text>
  </svg>
parts:
  - id: sync
    label: 1. Build-time Sizing
    text: Server-rendered HTML already carries the image's `width`, `height`, `data-nw`, `data-bw`, and initial `--wl` / `--wr`, preventing layout shift before the image finishes downloading.
  - id: measure
    label: 2. Client Measurement
    text: After load, `ArticleMeasure` recomputes the expansion margins for the current viewport width and checks on scroll whether a wide figure overlaps the floating table of contents.
  - id: dark
    label: 3. Dark Backing & Zoom
    text: "Clicking any article figure opens it in a full-screen lightbox (press `Esc` or click the backdrop to close); dark mode sets `--image-backing: #faf9f5` behind figures."
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
