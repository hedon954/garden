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

围栏写 ` ```garden interactive #<id> `。`---` 分隔线上方是 YAML 头部字段，下方是声明式交互标签（运行 `npx garden ui catalog` 可在 `.garden/ui-catalog.html` 查看全部内部标签参考）。

| 字段或标签 | 是否必填 | 取值与限制 | 说明 |
| :--- | :--- | :--- | :--- |
| `#<id>` / `id` | 必填 | 小写字母、数字与连字符，篇内唯一 | 写在围栏行末尾（如 `#reading-time`）或 YAML 头部 |
| `caption` | 必填 | 一句结论性的字符串 | 图框说明，需写出默认状态能看出的结论 |
| `intent` | 可选 | 字符串 | 生成该块时的作者原始自然语言想法 |
| `expect` | 可选 | `{ given: {...}, <变量名>: <期望值> }[]` | 数值断言列表，`npx garden ui check` 会自动验算（近似值可写 `{ value, tol }`） |
| `<State />` | 必填 | 数字、字符串或布尔属性 | 声明可调状态变量及默认值，如 `<State words={6000} />` |
| `<Let />` | 可选 | 表达式属性 | 由状态变量派生计算出的中间值、数组或对象 |
| `<Slider />` / `<Choice />` / `<Toggle />` | 至少一项输入控件 | `bind="<State变量名>"` | 绑定状态变量的输入控件；`Slider` 必填 `label`、`min`、`max` |
| `<Stat />` / `<Chart />` / `<Table />` | 至少一项输出展示 | 绑定派生值或数据 | 实时展示随状态变化的指标、曲线/条形图或表格 |
