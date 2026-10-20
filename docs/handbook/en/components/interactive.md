---
title: Interactive Formula & Parameters (interactive)
navTitle: interactive
description: Let readers drag sliders or switches to recalculate formulas and charts in real time.
section: components
order: 38
badge: interactive
---

Write "let readers drag word count, reading speed, and image count sliders to see how estimated reading time changes" inside a `garden` idea block, and the Agent generates the `garden interactive` block below via the `garden-ui` skill (hand-written syntax follows).

```garden interactive #reading-time
caption: 示例：按字数、阅读速度和配图数估算一篇文章的阅读时间。数字只用来演示组件，不是统计结果。
---
<State words={6000} speed={400} images={8} />
<Let textMinutes={round(words / speed)} />
<Let imageMinutes={round(images * 12 / 60)} />
<Let parts={[{ part: "正文", minutes: textMinutes }, { part: "配图", minutes: imageMinutes }]} />

<Slider bind="words" label="正文字数" min={1000} max={20000} step={500} unit="字" />
<Slider bind="speed" label="阅读速度" min={200} max={800} step={50} unit="字/分钟" />
<Slider bind="images" label="配图数" min={0} max={30} step={1} unit="张" />

<Stat label="示例：预计阅读时间" value={textMinutes + imageMinutes} unit="分钟" hint="配图按每张 12 秒估算" />
<Chart data={parts} x={part} yLabel="分钟">
  <Bar y={minutes} label="示例" />
</Chart>
```

````markdown
```garden interactive #reading-time
caption: 示例：按字数、阅读速度和配图数估算一篇文章的阅读时间。数字只用来演示组件，不是统计结果。
---
<State words={6000} speed={400} images={8} />
<Let textMinutes={round(words / speed)} />
<Let imageMinutes={round(images * 12 / 60)} />
<Let parts={[{ part: "正文", minutes: textMinutes }, { part: "配图", minutes: imageMinutes }]} />

<Slider bind="words" label="正文字数" min={1000} max={20000} step={500} unit="字" />
<Slider bind="speed" label="阅读速度" min={200} max={800} step={50} unit="字/分钟" />
<Slider bind="images" label="配图数" min={0} max={30} step={1} unit="张" />

<Stat label="示例：预计阅读时间" value={textMinutes + imageMinutes} unit="分钟" hint="配图按每张 12 秒估算" />
<Chart data={parts} x={part} yLabel="分钟">
  <Bar y={minutes} label="示例" />
</Chart>
```
````

- **Use when**: Explaining a multi-variable formula, capacity estimate, or parameter tradeoff where dragging a slider reveals how the output responds.
- **Skip when**: A block has only `<Steps>` without any state or input control (fails with `steps-prose`), or every `<Let>` is a single multiplication like `a * b` (fails with `interactive-trivial`). Write plain prose in both cases.

Metadata goes above `---`, and declarative tags go below it:

| Field or Tag | Required | Description |
| :--- | :--- | :--- |
| `#reading-time` | Recommended | Block identifier on the fence line (lowercase letters, digits, and hyphens) |
| `caption` | Yes | One sentence explaining what the reader can observe |
| `intent` | No | The original natural-language prompt this block was compiled from |
| `expect` | No | Array of `{ given: {...}, name: expectedValue }` assertions checked by `garden ui check` |
| `<State />` | Yes | Declares mutable state variables and their initial values, e.g. `<State words={6000} />` |
| `<Let />` | No | Computes derived values or data arrays from state |
| `<Slider />` / `<Choice />` / `<Toggle />` | Yes | Input controls bound to a state variable via `bind`; `Slider` requires `label`, `min`, and `max` |
| `<Stat />` | No | Displays a highlighted computed value; requires `label` and `value` |
| `<Chart />` | No | Plots a function curve with `sweep` or a bar/line chart with `data` and `<Bar>` / `<Line>` |

Run `npx garden ui catalog` to inspect the full tag and attribute reference in `.garden/ui-catalog.html`.
