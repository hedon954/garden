---
title: Component reference · compose
navTitle: compose
description: Draw an explanation diagram with Markdown leaves and catalog tags. The build compiles them into one tree of static HTML.
section: reference
order: 6
badge: compose
---

[← Component reference](/garden/en/reference) · [Usage: compose](/garden/en/components/compose)

## Example

The fence is ` ```garden compose `. Prose with no tags reports `compose-uncompiled`. A broken tag, or a YAML slot tree, reports `compose-invalid`.

```garden compose
<intent>
Three cards and downward arrows for sync, build, then validate. Clicking a step opens its note.
</intent>
# Site publish pipeline

Click a step to read what it does

<steps>
  <step id="sync">
    <badge>1</badge>
    <title>sync</title>
    <text>Sync content and config</text>
    <note>Line up remote and local material</note>
  </step>
  <step id="build">
    <badge>2</badge>
    <title>build</title>
    <text>Emit static HTML</text>
    <note>The build renders compose into the page</note>
  </step>
  <step id="validate">
    <badge>3</badge>
    <title>validate</title>
    <text>Check before shipping</text>
    <note>The hook stops an idea that is still prose</note>
  </step>
</steps>
```

A `#` heading and the paragraph under it are Markdown leaves. They join the same tree as `<steps>`.

```garden compose
<intent>
Two cards joined by a rightward arrow. Each card has a badge, and one has a metric. Click a card to read its note.
</intent>
<row>
  <box id="sync" tone="accent">
    <badge>1</badge>
    <title>sync</title>
    <kpi value="12" unit="ms" label="sync"/>
    <text>Sync content and config</text>
    <note>Line up remote and local material</note>
  </box>
  <arrow dir="right"/>
  <box id="build">
    <title>build</title>
    <text>Emit static HTML</text>
    <note>The build renders compose into the page</note>
  </box>
</row>
```

## Tags

The author's sentence goes in `<intent>` and is not drawn. Other leaves are Markdown. Structure is the tags below. Do not write `{@body}`, `{#if}`, expressions, scripts, color values, or widths.

| Tag | Role |
| :--- | :--- |
| `#` headings, paragraphs, `**emphasis**`, lists | Join the same tree as tags. A heading becomes a title, a paragraph becomes text |
| `<box>` | A card. `frame` is `card`, `band`, `text`, or `pill`. `tone` is `plain`, `accent`, `tip`, or `muted` |
| `<band>` / `<pill>` | Two frames of `box`. A sentence inside `<pill>` becomes its title |
| `<row>` / `<stack>` / `<grid>` | A horizontal row, a vertical stack, or a row of equal cells |
| `<title>` / `<text>` | A short name, and the line under it. `text` may set `tone="muted"`, `align="center"`, or `align="start"` |
| `<badge>` | A badge. One circled digit is drawn as an index |
| `<kpi value unit label/>` | One metric |
| `<arrow dir="down"/>` | An arrow. `dir` may also be `right`. A narrow screen turns right arrows downward |
| `<fan n="3"/>` | Several downward arrows. The next row needs the same number of cells |
| `<join>` | A V that meets under a label |
| `<lanes>` | Lanes. Inside: `<actor>` and `<message from="1" to="2" tone="forward">`. `tone` is `forward` or `back` |
| `<divider/>` | A rule |
| `<steps>` / `<step id>` / `<note>` | Click a step to read only that note |
| `<compare>` / `<item>` | Two to four compared items |
| `<callout tone="tip">` | One note. `tone` is `note`, `tip`, or `warn` |

`tone="accent"` and `tone="tip"` are the two emphases, the same pair as lane `forward` / `back`. `muted` is the quiet layer. It is a meaning, not a style instruction.

Nesting stops at 8 levels, and a diagram stops at 80 tags. An unclosed tag is an error. The compiler does not repair a half-written document.

## Limits

- The open note sits under its step. One diagram shows one open note at a time. It still opens with JavaScript off.
- A fence that is still one sentence reports `compose-uncompiled`. A draft may keep it. Publish only after compile.
- Color comes from theme tokens. The outer frame uses the page paper color, not a second off-white card.
