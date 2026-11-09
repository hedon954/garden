---
title: Compose reference
navTitle: compose
description: One author entry, executable rendering contracts and verification.
section: reference
order: 6
badge: compose
---

## One entry, component selection inside it

Use `garden compose`. Select by the reader's task, not by another fence name:

| Need | Compose structure |
| :--- | :--- |
| Reference material and takeaways | `resources/resource`, nested `point`, `reference` |
| Key results | `metric` with label, value, unit, caption, paragraphs and references |
| Time or stages | `timeline/event` |
| Alternatives and verdicts | `compare/item` |
| Icon-led editorial paragraphs | `icon-list/entry` or a small `icon` beside one shared text container |
| Download and preview | `files/file` or one `file src="…"` |
| Connected concepts | `relations/entity/edge`, stable ids; 3–6 entities |
| Rich selectable cards and replies | `choices/choice-option`, optional `none` option |
| Discrete bars and exact values | `plot/datum`; expandable data table |
| Parameter-dependent results | Play declarations, controls, `chart/bar/line`, `pie`, `table` |
| Article text and useful HTML | `markdown` and `html` content islands |
| Independent executable illustration | Play `sandbox` with literal html/css/js; isolated offline iframe |

The authoritative, demand-loaded catalog is `npx garden ui schema`: actual semantic fields, Play props/defaults/child contracts, icon names, safe HTML tags/attributes/CSS properties. `npx garden ui prompt` adds working recipes. `styleReference` also extracts current font/layout declarations, selectors, responsive conditions and source order from the installed stylesheets; it reports source defaults, not universal computed values. These are generated from the validators and actual styles; do not maintain a second exhaustive tag list. Static layout normalization is not a universal HTML/CSS API: inspect the normalized tree and output because some unsupported static layout attributes are ignored. Semantic unknown fields fail validation.

See the executable [Compose active-hours chart](/garden/en/components/compose#ui-compose-chart-active-hours).

## Relationships → hierarchy → layout → style → actual output

First identify what belongs together. A heading and all its paragraphs must share a container. Next choose columns and proportions, then alignments and typography. Only then add surfaces and decorative details.

A static `row` wraps by default. Its direct text/title/stack/card children share available width (`flex: 1 1 0`), whereas an icon is content-sized. A heading placed directly in that row is a sibling column, not the heading of a paragraph below the row. `align="center"` on a row changes more than vertical placement: theme rules also center text. A centered stack propagates text alignment. For an editorial list use explicit start alignment on children of a shared right-hand group; do not center each title independently.

Direct `row > stack` has 12px top padding in the current theme. A `group` is a width:100%, min-width:0 vertical container that shrinks beside the fixed icon and reads gap without that contextual padding; use it when icon and heading must begin on the same top line. Explicit `align="start"` survives normalization and emits data-align.

Nested paragraphs need separate `text` leaves or an article content island. Two unrelated top-level leaves do not establish a shared right column. Put a full-width divider **between rows**, not inside the right text container, if the rule must span the icon column too. `divider` and `separator` are real primitives, not text lines.

```garden compose
<figure frame="none">
<row wrap="nowrap" align="start" gap="4">
  <icon name="book-open" size="xl"/>
  <group gap="2">
    <title align="start">Test heading — not article content</title>
    <text align="start">Explicit test paragraph: the heading and this body share the same right column. Keep the author's complete text; do not shrink or summarize it to fit.</text>
    <text align="start">A second independent test paragraph stays in that column.</text>
  </group>
</row>
<divider/>
<row wrap="nowrap" align="start" gap="4">
  <icon name="users" size="xl"/>
  <group gap="2">
    <title align="start">Second test heading</title>
    <text align="start">Another test body, aligned with its heading rather than spanning the icon column.</text>
  </group>
</row>
</figure>
```

For a native editorial list the same relationship is expressed with `icon-list` containing `entry icon="…" title="…"`, and multiple `text` children per entry. Native paragraph children are lowered to text strings: their nested text size/alignment/layout properties are not carried into the native scene. Use a generic layout with text size controls for such precision; do not assume identical nested styling contracts. Native scenes preserve the app's keyboard/selection/detail/file-preview behavior when rendered by the Garden article host. A standalone static export is a readable fallback, not an identical interactive host.

## Typography and complete-theme context

Default body text inherits the **actual article's** family, size and line height. There is no universal pixel baseline. This includes ordinary static text, list bodies and native readable prose; changing the article typography configuration must propagate. Semantic headings, graph labels, values, captions and controls intentionally retain their hierarchy.

| Element/context | Actual source rule / intentional variation |
| :--- | :--- |
| Static `text` and `title` | Inherit body size; title weight 600, line height 1.4. `size="sm"` .875em; `lg` 1.125em; `xl` 1.25em. `md` keeps the baseline. |
| Static outer figure title/caption | Source defaults 18px/14px, not ordinary body; actual cascade still matters. |
| Static inline caption | Own semantic style; `sm` 11px, `lg` 16px. Not a body substitute. |
| Native icon-list entry title/body | Title weight 600; body inherits article. Group heading uses `--fs-small`. |
| Native choice value | 22px; narrow rule 20px. Option body inherits article. |
| Native relation ring | Compact/context-dependent labels and line clamps; detail prose inherits article. Do not treat a ring label as a long paragraph. |
| Play components | Query schema defaults and complete theme. Their controls/KPI/graph semantics are not globally changed to body size. |

Use explicit variation only for a meaningful hierarchy. Never shrink body text globally to fit a screenshot or discard facts to avoid wrapping. Inspect actual computed styles with globals → tokens → article theme → shell in the real order, on desktop and narrow widths; base component CSS alone does not prove the final result.

## Markdown, safe HTML, and execution

`text`, `title` and captions are inline contexts: `**bold**`, `_emphasis_`, backticks, `[links](https://example.com)`, `~~strike~~` and safe inline HTML such as `<u>underline</u>`. `<u>` is HTML, not standard Markdown.

Use `markdown` or `html` islands for full paragraphs, lists, headings, blockquotes, code blocks, tables, images, details/summary and other allowlisted article content. The islands share the article Markdown/GFM and safe-HTML renderer; they are not arbitrary component trees. Static text outside islands is a lightweight layout shorthand, **not** the whole article block grammar. Play islands are literal content, not interpolated expressions. Keep state and expressions in Play component nodes outside them.

```garden compose
<figure frame="none">
<markdown>
### Explicit test content

**Bold**, _emphasis_, `code`, [link](https://example.com), ~~strike~~ and <u>underline</u>.

- A full Markdown list
- Another test item

<details><summary>Safe HTML details</summary><p>Useful article HTML can coexist with Markdown.</p></details>
</markdown>
</figure>
```

Safe HTML supports allowlisted local `style` properties, including useful layout and typography; inspect the generated schema for the actual set. Unsupported tags/properties, events, unsafe URLs, executable scripts and network CSS functions report diagnostics. Do not expand the article allowlist into arbitrary execution. An intentional executable demo uses `sandbox` inside the **same Compose entry**, with literal html/css/js and no parent origin access. Sandbox layout is its own document, not inherited article prose.

## Verification levels

1. Run `npx garden ui check <file>` (and `npx garden check <file>` for real file paths). Preserve original text/resources and inspect diagnostics.
2. Parse/render the actual scene; confirm accepted properties survive normalization and meaningful content appears.
3. Inspect the complete-theme render: icon rail fixed, heading and **all** paragraphs share the same right edge/left edge, no centered headings or full-width body beneath a detached icon row, dividers outside rows, no unintended cards/arrows, no horizontal overflow.
4. Check desktop and narrow screenshots plus geometry/computed styles; exercise choices, relations, file previews, state updates and sandbox behavior when used.
5. A hand-authored passing scene proves engine capability, not that an independent model reliably produces it from a short prompt. Report those claims separately.

## Host and exported-artifact acceptance
Explicit `justify` owns the main axis; `align` owns the cross axis. A title and trailing badge can use `row align="center" justify="between"`. Reading width takes priority over side rails; frameless runtimes do not add body padding; fullscreen controls use a separate top band. The post's mobile contents entry stays in normal flow. Measure the real column and iframe before changing content or type size.

Use native relations for ring-and-detail interactions. Custom topology stays in the same Compose entry, using an offline sandbox, HTML labels and connector-only SVG. The author skill includes a measured-endpoint recipe, not an automatic layout/obstacle router. An isolated iframe does not automatically inherit article web fonts.

Static builds check final HTML links, CSS/JS and lazy dependencies, Compose styles and navigation payloads. Rerun with `garden verify --rendered`. Asset integrity is not visual or client-lifecycle proof: test normal homepage Link entry, return/re-entry, history and direct links separately.
