---
title: 可调公式与参数（interactive）
navTitle: 可调公式与参数
description: 提供滑杆或单选按钮，让读者调整变量并实时计算公式与图表结果。
section: components
order: 38
badge: interactive
---

在 `garden` 想法块里写一句「让读者拖动字数、阅读速度和配图数，看预计阅读时间怎么变」，Agent 会按 `garden-ui` skill 生成下面的 `garden interactive`（手写格式附后）。

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

- **用**：解释带多个变量的数学关系、容量估算或参数权衡，需要读者拖动滑杆实时观察结果变化时。
- **别用**：只有 `<Steps>` 而没有任何状态或输入控件，会报 `steps-prose` 错误；所有 `<Let>` 都只是一次乘法（形如 `a * b`），会报 `interactive-trivial` 错误。遇到这两种情况，改用普通段落。

分隔线 `---` 上方是块头，下方是标签。常用的写法：

| 字段或标签 | 必填 | 说明 |
| :--- | :--- | :--- |
| `#reading-time` | 建议 | 写在围栏头，块的标识，只能用小写字母、数字和连字符 |
| `caption` | 是 | 一句话说明这块交互想让读者看到什么 |
| `intent` | 否 | 这块交互由哪句想法编译而来，写成文字 |
| `expect` | 否 | 数组，每条写成 `{ given: {...}, 名字: 期望值 }`，检查时会按给定状态算一遍 |
| `<State />` | 是 | 声明会变的量和默认值，例如 `<State words={6000} />` |
| `<Let />` | 否 | 由别的量算出来的值，也可以写数据数组 |
| `<Slider />` / `<Choice />` / `<Toggle />` | 是 | 输入控件，用 `bind` 绑定一个状态；`Slider` 必填 `label`、`min`、`max` |
| `<Stat />` | 否 | 显示一个醒目的数字，必填 `label` 与 `value` |
| `<Chart />` | 否 | 用 `sweep` 画函数曲线，或用 `data` 加 `<Bar>` / `<Line>` 画数据 |

全部标签和属性见 `npx garden ui catalog` 生成的组件目录。
