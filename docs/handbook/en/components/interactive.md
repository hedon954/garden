---
title: Interactive Formula & Parameters (interactive)
navTitle: interactive
description: Let readers drag sliders or switches to recalculate formulas and charts in real time.
section: components
order: 38
badge: interactive
---

```garden interactive #reading-time
caption: "Example: estimate reading time from word count, reading speed, and image count. Numbers are illustrative only."
---
<State words={6000} speed={400} images={8} />
<Let textMinutes={round(words / speed)} />
<Let imageMinutes={round(images * 12 / 60)} />
<Let parts={[{ part: "Prose", minutes: textMinutes }, { part: "Images", minutes: imageMinutes }]} />

<Slider bind="words" label="Word count" min={1000} max={20000} step={500} unit="words" />
<Slider bind="speed" label="Reading speed" min={200} max={800} step={50} unit="wpm" />
<Slider bind="images" label="Image count" min={0} max={30} step={1} unit="images" />

<Stat label="Example: estimated reading time" value={textMinutes + imageMinutes} unit="min" hint="Counting 12 seconds per image" />
<Chart data={parts} x={part} yLabel="min">
  <Bar y={minutes} label="Example" />
</Chart>
```

- **When to use**: Explaining a multi-variable formula, capacity estimate, or parameter tradeoff where dragging a slider reveals how the output responds.
- **When to skip**: A block has only `<Steps>` without any state or input control (fails with `steps-prose`), or every `<Let>` is a single multiplication like `a * b` (fails with `interactive-trivial`). Write plain prose in both cases.

You can tell the AI:

````markdown
```garden
Let readers drag word count, reading speed, and image count sliders to see how estimated reading time changes.
```
````

## Fields

Fence header: ` ```garden interactive #<id> ` (snippet trigger `;ginteractive`). YAML metadata goes above `---` and declarative UI tags go below `---` (run `npx garden ui catalog` to inspect all internal tags in `.garden/ui-catalog.html`).

| Field or Tag | Required | Default | Allowed Values & Limits | Description |
| :--- | :--- | :--- | :--- | :--- |
| `#<id>` / `id` | Required | none | lowercase letters, digits, hyphens `^[a-z0-9]+(?:-[a-z0-9]+)*$`, unique per post; missing or invalid reports `ui-id`, unknown header keys or invalid YAML report `ui-header` / `garden-yaml` | Written on the fence line (such as `#reading-time`) or in the YAML header |
| `caption` | Required | none | non-empty one-sentence takeaway string; missing or empty reports `ui-caption` | States the conclusion visible in the default state |
| `intent` | Optional | none | string (non-string reports `ui-header`; modified `intent` without recompiling reports a `ui-stale` warning) | Original natural-language prompt this block was compiled from |
| `expect` | Optional | none | `{ given: {...}, <name>: <expected> }[]` (non-array reports `ui-header`; malformed or failing assertion reports `ui-expect`) | Numeric assertions verified by `npx garden ui check` (use `{ value, tol }` for approximate values) |
| `<State />` | Required | none | lowercase-initial prop names with number, string, or boolean literal defaults (invalid name, duplicate name, or non-literal reports `ui-prop`) | Declares mutable state variables and default values, e.g. `<State words={6000} />` |
| `<Let />` | Optional | none | expression props (unknown identifier or disallowed syntax reports `ui-expr`, cyclic dependency reports `ui-cycle`, evaluation failure reports `ui-eval`, single-multiplication-only block reports `interactive-trivial`) | Computes derived numbers, arrays, or objects from state |
| `<Data />` | Optional | none | `name` (valid identifier) and `src` (`.csv` or `.json` inside the post's sidecar directory; out-of-bounds, missing, or invalid file reports `ui-data`) | Loads a sidecar data file |
| `<Slider />` / `<Stepper />` / `<Toggle />` | At least one input control | `Slider`: `scale="linear"`, `snap="none"` (`"pow2"` when `scale="log"` and bounds are powers of 2); `Stepper`: `step={1}` | `bind` must reference a declared state variable of matching type (otherwise `ui-bind`); `max <= min`, `scale="log"` with `min <= 0`, or default outside `min..max` reports `ui-prop` | Input controls bound to numeric or boolean state |
| `<Choice />` / `<Checklist />` / `<Button />` | Optional input controls | `Button`: `tone="plain"` | `<Choice>` `options` must have `2` to `8` items (outside `2`–`8` reports `ui-limit`, default not in `options` reports `ui-prop`); `<Checklist>` `items` must have `1` to `30` items (outside `1`–`30` reports `ui-limit`); `<Button>` requires exactly one of `set` or `reset` (otherwise `ui-prop`) | Segmented/dropdown selector, interactive checklist, and state button |
| `<Stack />` / `<Columns />` / `<Tabs />` / `<Steps />` | Optional layout containers | `Stack`: `gap={3}`, `direction="col"`; `Columns`: `gap={3}`, `min={220}`; `Steps`: `autoplay={false}` | `gap` `0`–`4` integer, `Columns.min` `160`–`400`, `Steps.autoplay` `false` or `>= 800` (violation reports `ui-prop`); `<Columns>` max `4` children, `<Tabs>` `2`–`6` `<Tab>` children, `<Steps>` `2`–`24` `<Step>` children (outside limits reports `ui-limit`, wrong child tag reports `ui-children`, prose-only steps with no state changes report `steps-prose`) | Layout containers (`<Each>` slices at `200` items; total expanded elements across the block max `200`, exceeding reports `ui-limit`) |
| `<Stat />` / `<Meter />` / `<Chart />` / `<Pie />` | At least one output view | `Stat`: `tone="plain"`, `size="md"`; `Meter`: `tone="accent"`; `Chart`: `samples={64}`, `yScale="linear"`, `height={200}` | `<Meter>` `parts` max `5` segments, `<Pie>` `1`–`8` `<Slice>` children, `<Chart>` `1`–`4` series children and `data` max `2000` rows (exceeding reports `ui-limit`); `<Chart>` `samples` `2`–`200` and `height` `120`–`480` (outside range reports `ui-prop`) | Displays computed metrics, progress meters, donut charts, and function/data charts |
| `<Table />` / `<Grid />` / `<Image />` / `<Code />` / `<Diagram />` / `<Sandbox />` | Optional display views | none | `<Table>` max `50` rows, `<Grid>` `cols` max `16` columns and `1`–`16` `<Row>` children, `<Image>` max `12` `<Hotspot>` children, `<Code>` max `60` lines, `<Sandbox>` `html`/`js` max `12000` chars each and `css` max `6000` chars (exceeding reports `ui-limit`; unknown tag reports `ui-component`; headings, code fences, HTML, or Markdown images in the body report `ui-markdown`; JSX syntax or spread props report `ui-syntax`) | Tables, inspection grids, hotspot images, code walkthroughs, Mermaid state diagrams, and self-contained sandboxes |
