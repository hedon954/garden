---
title: 组件参考 · interactive
navTitle: interactive
description: 让读者拖动滑杆或切换选项，实时看到公式和图表的计算结果。
section: reference
order: 8
badge: interactive
---

[← 组件参考](/garden/reference) · [用法：可调公式与参数](/garden/components/interactive)

## 示例

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

## 字段写法

````markdown
```garden interactive #<id>
caption:               # 必填，默认状态的结论
intent: |              # 可选，作者原话
expect:                # 可选，数值断言
---                    # 下方写交互标签
<State ... />          # 必填，可调状态
<Let ... />            # 可选，派生值
<Slider bind="..." />  # 输入控件
<Stat ... />           # 输出展示
```
````

## 字段

围栏写 ` ```garden interactive #<id> `（编辑器代码片段触发词 `;ginteractive`）。`---` 分隔线上方是 YAML 头部字段，下方是声明式交互标签（运行 `npx garden ui catalog` 可在 `.garden/ui-catalog.html` 查看全部内部标签参考）；YAML 头部语法错误或顶层含未知键名时整块报 `garden-yaml` 错误。

| 字段或标签 | 是否必填 | 默认值 | 取值与限制 | 说明 |
| :--- | :--- | :--- | :--- | :--- |
| `#<id>` / `id` | 必填 | 无 | 小写字母、数字与连字符 `^[a-z0-9]+(?:-[a-z0-9]+)*$`，篇内唯一；缺失或格式不合法报 `ui-id` 错误 | 写在围栏行末尾（如 `#reading-time`）或 YAML 头部 |
| `caption` | 必填 | 无 | 非空字符串；缺失或为空报 `ui-caption` 错误 | 图框说明，写出默认状态能看出的结论 |
| `intent` | 可选 | 无 | 字符串（非字符串报 `ui-header` 错误；改过原话但未重编译时报 `ui-stale` 警告） | 生成该块时的作者原始自然语言想法 |
| `expect` | 可选 | 无 | `{ given: {...}, <变量名>: <期望值> }[]`（非数组报 `ui-header` 错误，格式不对或断言不通过报 `ui-expect` 错误） | 数值断言列表，`npx garden ui check` 会自动验算（近似值可写 `{ value, tol }`） |
| `<State />` | 必填 | 无 | 小写字母开头的属性名配数字、字符串或布尔字面量（名字非法、重复或非字面量报 `ui-prop` 错误） | 声明可调状态变量及默认值，如 `<State words={6000} />` |
| `<Let />` | 可选 | 无 | 表达式属性（引用未知变量或禁用语法报 `ui-expr` 错误，互相依赖成环报 `ui-cycle` 错误，求值出错报 `ui-eval` 错误，全块只有一次简单乘法报 `interactive-trivial` 错误） | 由状态变量派生计算出的中间值、数组或对象 |
| `<Data />` | 可选 | 无 | `name`（合法标识符）与 `src`（同名子目录下的 `.csv` / `.json`；越界、缺失或解析失败报 `ui-data` 错误） | 引用随文数据文件 |
| `<Slider />` / `<Stepper />` / `<Toggle />` | 至少一项输入控件 | `Slider`: `scale="linear"`, `snap="none"`（对数且端点为 2 的幂时默认 `"pow2"`）；`Stepper`: `step={1}` | `bind` 必须绑定已声明且类型匹配的状态（否则报 `ui-bind` 错误）；`max <= min`、对数刻度 `min <= 0` 或默认值越界报 `ui-prop` 错误 | 绑定数字或布尔状态的输入控件 |
| `<Choice />` / `<Checklist />` / `<Button />` | 可选输入控件 | `Button`: `tone="plain"` | `<Choice>` 的 `options` 限 `2`～`8` 项（超出报 `ui-limit` 错误，默认值不在选项内报 `ui-prop` 错误）；`<Checklist>` 的 `items` 限 `1`～`30` 项（超出报 `ui-limit` 错误）；`<Button>` 必填且只能填 `set` 或 `reset` 之一（否则报 `ui-prop` 错误） | 选项切换、可勾选清单与状态重置按钮 |
| `<Stack />` / `<Columns />` / `<Tabs />` / `<Steps />` | 可选布局容器 | `Stack`: `gap={3}`, `direction="col"`；`Columns`: `gap={3}`, `min={220}`；`Steps`: `autoplay={false}` | `gap` 限 `0`～`4` 整数、`Columns.min` 限 `160`～`400`、`Steps.autoplay` 限 `false` 或 `>= 800`（违规报 `ui-prop` 错误）；`<Columns>` 最多 `4` 列、`<Tabs>` 限 `2`～`6` 个 `<Tab>`、`<Steps>` 限 `2`～`24` 个 `<Step>`（超出报 `ui-limit` 错误，子元素类型不对报 `ui-children` 错误，步骤只放散文且无状态变化报 `steps-prose` 错误） | 分栏、标签页与分步容器（`<Each>` 超过 `200` 项时只显示前 `200` 项，不报 `ui-limit`；整块展开元素上限 `200` 个，超出报 `ui-limit` 错误） |
| `<Stat />` / `<Meter />` / `<Chart />` / `<Pie />` | 至少一项输出展示 | `Stat`: `tone="plain"`, `size="md"`；`Meter`: `tone="accent"`；`Chart`: `samples={64}`, `yScale="linear"`, `height={200}` | `<Meter>` 的 `parts` 最多 `5` 段、`<Pie>` 限 `1`～`8` 个 `<Slice>`、`<Chart>` 限 `1`～`4` 个系列子元素且 `data` 模式最多 `2000` 个数据点（超出均报 `ui-limit` 错误）；`<Chart>` 的 `samples` 限 `2`～`200`、`height` 限 `120`～`480`（超出报 `ui-prop` 错误） | 实时展示随状态变化的数字、占比条、圆环图与曲线/柱状图 |
| `<Table />` / `<Grid />` / `<Image />` / `<Code />` / `<Diagram />` / `<Sandbox />` | 可选展示组件 | 无 | `<Table>` 最多 `50` 行、`<Grid>` 的 `cols` 最多 `16` 列且限 `1`～`16` 行、`<Image>` 最多 `12` 个 `<Hotspot>`、`<Code>` 最多 `60` 行、`<Sandbox>` 的 `html` 最多 `12000` 字且 `css` 与 `js` 各最多 `8000` 字（超出均报 `ui-limit` 错误；未知标签报 `ui-component` 错误；块内写 Markdown 标题、代码围栏、HTML 或图片语法报 `ui-markdown` 错误，JSX 语法错误报 `ui-syntax` 错误） | 数据表、检视格、热点图、代码走查、Mermaid 状态图与自包含沙盒 |

## 限制与报错

- 头部：`ui-id`（缺 id 或格式不对）、`ui-caption`（缺 caption）、`ui-header`（`intent` 不是字符串或 `expect` 不是列表）、`ui-expect`（断言格式不对或不通过）、`ui-stale`（警告：改过原话但没重新编译）。
- 标签：`ui-prop`、`ui-expr`、`ui-cycle`、`ui-eval`、`ui-data`、`ui-bind`、`ui-limit`、`ui-children`、`ui-component`、`ui-markdown`、`ui-syntax`，各自的触发条件见上表。
- 整块：`interactive-trivial`（只有一次简单乘法）、`steps-prose`（步骤只是散文，没有状态变化）。
- 运行 `npx garden ui check` 可以拿到修复提示词。
