---
title: Content, layout, and interactions (compose)
navTitle: Compose
description: Combine article content, layout, resources, and interactions through one author entry.
section: components
order: 36
badge: compose
---

`garden compose` is the single Garden author entry. Inside it, combine Markdown, safe HTML content islands, layout, resources, files, relations, selectable cards, and Play interactions. See the [component reference](/garden/en/reference/compose) for capabilities, content boundaries, and contextual defaults; `npx garden ui schema` is authoritative for supported fields.

To ask AI for a structure diagram, type `/garden` and pick **compose (idea)**. That inserts a `garden compose` fence. Write the structure in plain language, then ask the AI to compile the post. It keeps your words in `<intent>` and builds the diagram from Markdown leaves plus catalog tags.

## How to write

Describe the relationships and hierarchy readers should see before choosing layout and necessary styles. You can also write components directly; do not assume every component accepts arbitrary HTML/CSS properties.

Cover four things:

- **How many blocks**: three columns, five layers top-to-bottom, or two rows.
- **What each block is called**: short labels that appear on the diagram. Put explanations on the line under the name.
- **What connects to what**: who reaches whom, fans out, or joins. If there is no order, say so.
- **Which block is the focus**: name it (“the middle column”, “the lower row”).

Describe the visual relationships and desired emphasis. Defaults are a starting point, not a substitute for checking alignment and hierarchy. Explicit styling must use supported controls.

The outer static Compose scene is transparent by default; its border, corner radius, and padding remain. A transparent background does not remove the frame. To remove the entire scene frame, use one outer `<figure frame="none">…</figure>`. Explicit container backgrounds, tones, and node fills are unchanged. The host handles fullscreen or overlay backgrounds separately.

**Every tag and shared token**: [compose reference](/garden/en/reference/compose). **Every icon name**: [compose icons](/garden/en/reference/compose-icons).

## Rewrite patterns

Two common mistakes: naming only a topic with no structure, or spending the fence on colors and padding.

**Three columns, middle joins**

````markdown
```garden compose
Three columns: User under Alice, Bob; Role under admin, reviewer;
Permission under orders:read, orders:approve.
Role sits in the middle and joins users to permissions. Role is the focus.
```
````

**Hub, then fan out**

````markdown
```garden compose
The browser reaches the identity provider first, then fans out to HR, Finance, and Project.
All three trust the same IdP. The IdP is the focus.
```
````

**Top-down layers**

````markdown
```garden compose
Five layers top to bottom: browser, identity, BFF, business service, authorization.
Identity and authorization are the focus; the rest are paths through.
Not every request walks the whole stack in order.
```
````

**Several facets of one request**

````markdown
```garden compose
After the user sends a request, look at four facets: authentication, credential,
authorization, verification. Then transport and secrecy. No strict order among the six.
```
````

**Two rows to contrast**

````markdown
```garden compose
Top row is delivery: understand → design → ship.
Bottom row is the exploration loop: hypothesize → cheap test → iterate or drop.
Top is background; the bottom row is the point.
```
````

## Icons and surfaces

Use `<icon name="check-circle"/>` — not emoji. Combine `padding`, `background`, and `radius` for small chips; do not invent one-off tags per diagram.

## One sample

```garden compose
<intent>
Three columns: User under Alice and Bob; Role under admin and reviewer; Permission under orders:read and orders:approve. Role joins the sides and should be seen first.
</intent>
<row align="center">
  <stack align="center">
    <title>User</title>
    <text>Alice</text>
    <text>Bob</text>
  </stack>
  <band tone="accent" align="center">
    <title>Role</title>
    <text>admin</text>
    <text>reviewer</text>
  </band>
  <stack align="center">
    <title>Permission</title>
    <text>orders:read</text>
    <text>orders:approve</text>
  </stack>
</row>
<join>Role joins users to permissions</join>
<text tone="muted" align="center">Concept: User ↔ Role ↔ Permission</text>
```

## Play (tunable)

Stay on `garden compose` and use DIL when readers need a dial. Mapping: repo `docs/compose-dil.md`.

```garden compose #compose-play-demo
caption: Twist seats; watch the monthly fee.
intent: |
  Let the reader change seat count and see price.
---
{@body const [seats, setSeats] = DIL.useState(3)}
{@body const total = seats * 24}
<slider min={1} max={12} value={seats} onChange={setSeats} label="Seats" />
<stat label="Monthly" value={total} unit="USD" />
```

Play charts: `palette` (`series`|`categorical`), `yStep`, `overflow` (`expand`|`clip`); block header may set `frame: none`. Title/badge rows use `<stack direction="row" justify="between">`. Legend: `legend` (`auto`|`show`|`hide`), `legendPosition` (`top`|`bottom`).

## Chart examples (play)

Two official compose chart samples: eight static series bars with `yStep`, and a five-category weighted fusion chart (`palette="categorical"` + bottom legend). Illustrative data.

### Static: active hours

```garden compose #compose-chart-active-hours
caption: "Illustrative: normalized activity over 30 days. Peak at 20:00."
frame: none
intent: |
  Static distribution: series blue bars, explicit 8% ticks, stack header.
---
{@body const rows = [
  { h: "08:00", p: 0.05 },
  { h: "10:00", p: 0.07 },
  { h: "12:00", p: 0.15 },
  { h: "14:00", p: 0.06 },
  { h: "16:00", p: 0.09 },
  { h: "18:00", p: 0.14 },
  { h: "20:00", p: 0.28 },
  { h: "22:00", p: 0.16 }
]}

<stack direction="row" justify="between" align="center" gap={2}>
  <stack gap={1}>
    <caption>User activity by hour (sample)</caption>
    <caption>Normalized activity over the last 30 days (illustrative)</caption>
  </stack>
  <badge tone="new">Peak 20:00</badge>
</stack>

<chart data={rows} x={h} yLabel="Activity" yFormat="percent" yMin={0} yMax={0.32} yStep={0.08} overflow="expand" height={280}>
  <bar y={p} label="Activity" tone="accent" />
</chart>
```

### Interactive: personal vs global fusion weight

Default weight **45%**. Twist the slider or jump 0 / 45 / 100 — five categorical bars and “best time” update together.

```garden compose #compose-chart-fusion-weights
caption: Twist personal weight; fused bars recompute. Illustrative priors.
frame: none
intent: |
  Fusion slider: categorical bars, bottom one-entry legend, overflow expand.
---
{@body const [w, setW] = DIL.useState(45)}
{@body const a = w / 100}
{@body const p08 = a * 0.05 + (1 - a) * 0.12}
{@body const p12 = a * 0.12 + (1 - a) * 0.22}
{@body const p18 = a * 0.20 + (1 - a) * 0.26}
{@body const p20 = a * 0.45 + (1 - a) * 0.28}
{@body const p22 = a * 0.18 + (1 - a) * 0.12}
{@body const rows = [{ h: "08:00", p: p08 }, { h: "12:00", p: p12 }, { h: "18:00", p: p18 }, { h: "20:00", p: p20 }, { h: "22:00", p: p22 }]}
{@body const peak = max(p08, p12, p18, p20, p22)}
{@body const best = p20 == peak ? "20:00" : (p18 == peak ? "18:00" : (p12 == peak ? "12:00" : (p22 == peak ? "22:00" : "08:00")))}

<choice value={w} onChange={setW} label="Weight presets" options={[{value:0,label:"0%"},{value:45,label:"45%"},{value:100,label:"100%"}]} />
<slider min={0} max={100} value={w} onChange={setW} label="Personal activity weight" unit="%" />
<chart legend="show" legendPosition="bottom" data={rows} x={h} palette="categorical" yLabel="Fused activity" yFormat="percent" yMin={0} yMax={0.4} overflow="expand" height={280}>
  <bar y={p} label="Fused activity" tone="accent" />
</chart>
<stat label="Predicted best time" value={best} />
```


## Custom text and background colors

`color` controls text (inherited; children may override). `backgroundColor` paints only the current surface (not inherited). Both accept literal CSS named colors, transparent/currentColor, 3/4/6/8-digit hex, rgb/rgba/hsl/hsla with optional alpha. URLs, var(), calc(), declarations and arbitrary style are rejected by the same SSR/browser validator. Defaults preserve tone and theme; no font-family change. Explicit colors are not automatically dark-mode adapted: check contrast.

Static primitives: box/card, row/stack/columns/grid/grid-item, pill/band, group/field/header/footer/figure, title/text/caption/label/prose/badge, kpi/stat, list, table/tr/th/td/thead/tbody. Play: stack/columns/card/caption/badge/stat/table. Colors must be literals. Existing static `background` semantic tokens and chart palette/series-tone APIs are unchanged; these props do not set chart series colors.

