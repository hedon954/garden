---
title: 可调公式与参数（interactive）
navTitle: 可调公式与参数
description: 让读者拖动滑杆或切换选项，实时看到公式和图表的计算结果。
section: components
order: 38
badge: interactive
---

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

- **什么时候用**：公式或结论随多个变量变化，读者自己拧一下参数比读干巴巴的数字更容易明白。
- **什么时候不用**：一次简单乘法就能算清（触发 `interactive-trivial`），或者只是把几段文字拆成步骤而没有任何状态与输入控件（触发 `steps-prose`）时，直接写在正文里。

可以这样对 AI 说：

````markdown
```garden
让读者拖动正文字数、阅读速度和配图数，看预计阅读时间怎么变。
```
````

## 字段说明

全部字段、默认值、取值限制和报错代码见 [组件参考 · interactive](/garden/reference/interactive)。
