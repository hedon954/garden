---
title: Component reference · compose
navTitle: compose
description: Scannable catalog of every compose tag, shared tokens, and links to the icon grid.
section: reference
order: 6
badge: compose
---

[← Component reference](/garden/en/reference) · [Usage](/garden/en/components/compose) · [Icons](/garden/en/reference/compose-icons)

Fence: ` ```garden compose `. Author intent stays in `<intent>` (not drawn). Unknown tags fail with `compose-invalid`.

**68 tags** in the catalog below. Icons: **690** names — see [compose icons](/garden/en/reference/compose-icons).

## Shared tokens

Write once; most layout tags accept them. Colors come only from Garden theme variables (Claude paper).

| Token | Values |
| :--- | :--- |
| `padding` / `gap` | `0`–`4` (4px × n) |
| `background` | `surface` `surface-secondary` `surface-accent` `surface-tip` `surface-muted` `transparent` |
| `radius` | `none` `sm` `md` `lg` `xl` `full` |
| `border` | `subtle` `strong`/`true` `none`/`false` |
| `size` | `sm` `md` `lg` `xl` |
| `tone` | `plain` `accent` `tip` `muted` (and callout `note`/`warn`) |
| `align` | `start` `center` `end` `stretch` |
| `justify` (row) | `start` `center` `end` `between` `around` |
| `wrap` (row) | `wrap` `nowrap` |

## High-traffic attributes

### `box` / `card`

| Attr | Notes |
| :--- | :--- |
| `frame` | `card` (default) `band` `pill` `text` — or sugar tags `<band>` / `<pill>` |
| `padding` `gap` `radius` `border` `background` `size` `align` `tone` `id` `mark` | shared tokens; `mark="shield"` draws a shield glyph |

### `row` / `stack` / `grid`

| Attr | Notes |
| :--- | :--- |
| `gap` `align` | shared |
| `justify` `wrap` | `row` only |
| `cols` | `grid` only, 1–6 |
| `span` | `grid-item` only, 1–6 |

### `text` / `title` / `caption`

| Attr | Notes |
| :--- | :--- |
| `size` `align` | shared |
| `tone` | `text`: `plain` `muted` `accent` `tip`. `caption` forces muted. |

### `icon`

| Attr | Notes |
| :--- | :--- |
| `name` | required; must be in the [icon catalog](/garden/en/reference/compose-icons) |
| `size` | `sm` `md` `lg` `xl` |
| `inline` | sit with surrounding text |

## Tag catalog

One mini sample per group, then a one-line table for every tag. No per-tag essays.

### Layout

```garden compose
<row gap={2}><box padding={2} radius="md" border="subtle"><title size="sm">A</title></box><box padding={2} radius="md" background="surface-accent"><title size="sm">B</title></box></row>
```

| Tag | Purpose |
| :--- | :--- |
| `box` | Generic container; padding / gap / background / radius |
| `card` | Alias of box as a card face |
| `stack` | Vertical stack |
| `row` | Horizontal row |
| `columns` | Multi-column row (wrap by default) |
| `grid` | Equal grid; cols 1–6 |
| `grid-item` | Grid cell; span columns |
| `group` | Semantic group |
| `field` | Form-field group |
| `header` | Header region |
| `footer` | Footer region |
| `figure` | Figure region |
| `prose` | Prose region |
| `divider` | Divider (self-closing) |
| `separator` | Alias of divider |
| `spacer` | Empty spacer |
| `band` | Full-width band (box frame=band) |
| `pill` | Pill (box frame=pill) |

### Text

```garden compose
<stack gap={1}><title size="sm">Title</title><text size="sm">Body</text><caption size="sm">Caption</caption><badge>badge</badge></stack>
```

| Tag | Purpose |
| :--- | :--- |
| `title` | Short title |
| `text` | Body text |
| `caption` | Caption (muted by default) |
| `label` | Control label |
| `badge` | Pill badge |
| `kpi` | Metric (self-closing) |
| `stat` | Alias of kpi |
| `icon` | Named stroke icon (self-closing) |
| `callout` | Callout strip |
| `kbd` | Keyboard keycap |
| `link` | Inline link |
| `intent` | Author intent (not drawn) |

### Controls

```garden compose
<stack gap={2}><row gap={2}><avatar label="A" size="sm"/><badge>ok</badge><kbd>⌘K</kbd></row><list><list-item>One</list-item><list-item>Two</list-item></list><progress value={40} max={100} label="40%"/></stack>
```

| Tag | Purpose |
| :--- | :--- |
| `button` | Button snapshot |
| `slider` | Slider snapshot / play |
| `progress` | Progress bar |
| `meter` | Meter bar |
| `checkbox` | Checkbox snapshot |
| `radio` | Radio snapshot |
| `toggle` | Toggle snapshot |
| `switch` | Alias of toggle |
| `input` | Text input snapshot |
| `textarea` | Textarea snapshot |
| `select` | Select snapshot |
| `tabs` | Tabs container |
| `tab` | One tab |
| `list` | List |
| `list-item` | List item |
| `table` | Table |
| `thead` | Table head |
| `tbody` | Table body |
| `tr` | Table row |
| `th` | Header cell |
| `td` | Data cell |
| `image` | Image |
| `avatar` | Avatar placeholder |
| `empty` | Empty state |
| `option` | Segment option snapshot |

### Connectors

```garden compose
<stack align="center" gap={1}><pill>Start</pill><arrow dir="down"/><band tone="accent" align="center"><title size="sm">Hub</title></band></stack>
```

| Tag | Purpose |
| :--- | :--- |
| `arrow` | Arrow |
| `fan` | Downward fan arrows |
| `join` | V-shaped join |
| `lanes` | Swimlanes |
| `actor` | Lane actor |
| `message` | Lane message |
| `steps` | Steps container |
| `step` | One step |
| `note` | Step note |
| `compare` | Compare cards |
| `item` | Compare item |
| `code` | Code snapshot |
| `pre` | Preformatted text |


## Chart examples

Play-level chart samples (static eight bars, fusion weight slider) live on [Diagrams · compose](/garden/en/components/compose#ui-compose-chart-active-hours).

## Limits

- Nesting ~10 levels / ~220 nodes.
- Uncompiled prose-only fences report `compose-uncompiled`.
- Play path (`{@body}`, `{#if}`, …) is documented in the repo `docs/compose-dil.md`; static fences render default-state snapshots for control tags.

## Custom text and background colors

`color` controls text (inherited; children may override). `backgroundColor` paints only the current surface (not inherited). Both accept literal CSS named colors, transparent/currentColor, 3/4/6/8-digit hex, rgb/rgba/hsl/hsla with optional alpha. URLs, var(), calc(), declarations and arbitrary style are rejected by the same SSR/browser validator. Defaults preserve tone and theme; no font-family change. Explicit colors are not automatically dark-mode adapted: check contrast.

Static primitives: box/card, row/stack/columns/grid/grid-item, pill/band, group/field/header/footer/figure, title/text/caption/label/prose/badge, kpi/stat, list, table/tr/th/td/thead/tbody. Play: stack/columns/card/caption/badge/stat/table. Colors must be literals. Existing static `background` semantic tokens and chart palette/series-tone APIs are unchanged; these props do not set chart series colors.

