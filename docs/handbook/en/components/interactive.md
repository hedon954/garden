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

Fence header: ` ```garden interactive #<id> `. YAML metadata goes above `---` and declarative UI tags go below `---` (run `npx garden ui catalog` to inspect all internal tags in `.garden/ui-catalog.html`).

| Field or Tag | Required | Allowed Values & Limits | Description |
| :--- | :--- | :--- | :--- |
| `#<id>` / `id` | Required | lowercase letters, digits, hyphens (unique per post) | Written on the fence line (such as `#reading-time`) or in the YAML header |
| `caption` | Required | one-sentence takeaway string | States the conclusion visible in the default state |
| `intent` | Optional | string | Original natural-language prompt this block was compiled from |
| `expect` | Optional | `{ given: {...}, <name>: <expected> }[]` | Numeric assertions verified by `npx garden ui check` (use `{ value, tol }` for approximate values) |
| `<State />` | Required | number, string, or boolean props | Declares mutable state variables and default values, e.g. `<State words={6000} />` |
| `<Let />` | Optional | expression props | Computes derived numbers, arrays, or objects from state |
| `<Slider />` / `<Choice />` / `<Toggle />` | At least one input control | `bind="<StateName>"` | Input controls bound to state variables; `Slider` requires `label`, `min`, and `max` |
| `<Stat />` / `<Chart />` / `<Table />` | At least one output view | bound to state or `Let` values | Displays computed metrics, function curves (`sweep`), bar/line charts (`data`), or tables |
