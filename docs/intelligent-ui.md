# Intelligent UI 写作层

纯 Markdown 讲不清过程、参数和结构时，作者在稿里用一段 `intent` 围栏说出想法，AI 按组件目录把它编译成 `ui` 块，站点用自己的组件把它画成可交互的图。作者不记组件名；读者拖滑杆、点格子、翻步骤都在本地完成，阅读页不调用模型。

本文是需求和技术方案，覆盖稿件格式、组件目录、状态与表达式、编译 skill、管理后台、Typora / VS Code / Obsidian 插件、提交前检查、构建与降级、实施顺序。手写 HTML 的 `widget` 仍以 [可交互组件](./interactive-blog-components.md) 为准，在这里是逃逸口。

---

## 1. 目标与边界

### 1.1 要解决的问题

- 纯 Markdown 只能给一张照片：过程被拍成一张图，参数是作者算好的死数字，二维结构被压成表格，对比只能上下翻。
- 图片缺精细度，也不能动。
- 现成的交互写法（手写 HTML、MDX、图表库）要求作者记住组件和语法，写稿时不现实。

### 1.2 目标

1. 作者在 Typora、VS Code（含 Cursor）、Obsidian 里写稿时，只用一段 `intent` 围栏写自然语言。
2. 一个 skill 扫出这些围栏，按组件目录改写成 `ui` 块；目录装不下才退回 `widget`，散文已经够用时改回正文。
3. `ui` 块由站点原生绘制：组件可以组合，状态在块内共享，句子里的数字可以跟着变。
4. 三个编辑器都能一键插入 `intent` 围栏，并预览 `intent` 与 `ui`。
5. 管理后台提供组件工作台：自然语言调用模型生成初稿；手改结构化文本时不调用模型，实时重绘。后台还提供组件清单、交互块总览、草稿预览和模型自检。
6. 作者随时能查到有哪些组件可以用：组件清单在后台、本地命令和编辑器插件里都能打开。
7. 公开站、RSS、搜索都不调用模型；未编译或有错的块挡在发布之前。

### 1.3 不做

- 阅读页上调用模型、流式生成、"继续对话"按钮（ChatGPT 的 `issueNewTurn`）。
- `ui` 里执行任意 JavaScript、写 CSS、引用远程地址。
- 跨块共享状态，或让 `ui` 块外的正文随状态变化。块外正文必须在 RSS 和 Typora 里独立成立。
- 读者状态跨刷新保存。
- 把整篇稿改成 MDX。
- 编辑器插件调用模型或保存模型密钥。
- 工作台直接改稿或提交 Git。

---

## 2. 调研

### 2.1 ChatGPT Intelligent UI

[官方说明](https://openai.com/index/gpt-6-for-everyone/)（2026-10-07）公开的是能力和原则：

- 模型按问题决定用文字、并排对比、图、表单，还是当场能用的小工具；文字够用时只给文字。
- 界面来自一套原生、可流式出现的组件库；模型决定怎么拼，外观由组件库托底。
- 编译器边生成边处理，界面渐进出现。
- 训练时评估界面是否清楚、有用、完整，以及什么时候不该上交互。

实现细节来自 Thesys 的逆向（[How ChatGPT Intelligent UI works](https://www.openui.com/blog/how-chatgpt-intelligent-ui-works)，2026-10-08），以下是观察，不是 OpenAI 的规范：

| 层 | ChatGPT 的做法 |
| --- | --- |
| 描述 | 模型写 DIL：Markdown + JSX 形态的组件标签 + `{@body}` 里的 JavaScript（状态与派生值） |
| 编译 | 服务端每隔几百毫秒整段重编译；半截输出切到最后一个完整构造；不认识的属性丢弃并记诊断；表达式包一层，抛错只去掉一个元素 |
| 执行 | 隐藏 iframe 里的 Worker，去掉网络、定时器和动态求值，输出组件树差异 |
| 绘制 | ChatGPT 自己的约 70 个原生组件，走设计 token |
| 数据 | 模型写查询或引用，服务端回填图片、商品、引用；价格不经模型复述 |
| 逃逸 | `AppBlock`：自包含 HTML，放在独立域名的 iframe |
| 降级 | `fallbackMarkdown`：散文保留，交互收成静态文字 |

同一篇也列了它的毛病，Garden 要绕开：

- 公式写错没人发现：切换一个指标，营收从 $6,930 跳到 $256,410。
- 编译诊断似乎没有回到模型，同样的错反复出现。
- fallback 丢掉了计算出的值和循环里的内容。
- 布局用固定列数和像素宽度，没有用断点。
- 刷新后状态丢失。

### 2.2 结构化格式怎么选

| 方案 | 形态 | 适合 | 放到 Garden 的问题 |
| --- | --- | --- | --- |
| ChatGPT DIL | Markdown + JSX + 任意 JS | 流式，模型熟悉 | 任意 JS 需要 Worker 沙箱 |
| [OpenUI Lang](https://www.openui.com/docs/openui-lang/specification-v05) | 每行一条 `id = Component(...)`，按 Zod 键序传位置参数；`$变量`、`@Set` | 省 token，流式 | 位置参数手改时看不出含义；键序一变旧输出全坏 |
| [A2UI](https://a2ui.org/specification/v1.0-a2ui/) | 扁平 JSON 邻接表 + JSON Pointer 数据绑定 | 代理协议，增量更新 | 手改 JSON 在 Typora 里很痛 |
| [json-render](https://json-render.dev/docs/catalog) | JSON 树，Zod 目录约束，`catalog.prompt()` 生成提示词 | 校验严格 | 同上；句子里插值不自然 |
| [Idyll](https://idyll-lang.org/) | Markdown 里写组件和响应式变量 | 交互式文章 | 语法小众，模型不熟 |
| YAML 树 | 现有 `embed` / `widget` 的写法 | 扁平配置 | 嵌套组件的缩进难读；句子里插值别扭 |

Garden 选 **"Markdown + 组件标签 + `{表达式}`"**。语法是 MDX 的一个子集；id、图注、作者原话放在围栏开头几行 YAML 里（第 5.1 节的"块头"）：

- 模型最熟 JSX 和 Markdown，写错率低；属性有名字，作者手改看得懂。
- 散文和组件在同一棵树里，`batch 为 {batch} 时要 {bytes(mem)}` 这种句子天然成立。
- 解析用 MDX 生态现成的 micromark 扩展和 acorn，得到带行列号的语法树。**不执行任何代码**，表达式按白名单解释，所以不需要 ChatGPT 那套 Worker 沙箱。
- 不需要流式和省 token：块在写作期编译，提交进 Git。

从别处拿走的：json-render 和 OpenUI 的"提示词由目录生成"，让模型看到的说明与校验器同源；ChatGPT 的宿主绘制、数据回填、逃逸口和 fallback。

### 2.3 Garden 和 ChatGPT 的对应

| ChatGPT | Garden |
| --- | --- |
| 用户提问 | 作者写 `intent` |
| 模型写 DIL | skill 或工作台写 `ui` |
| 服务端编译 + 诊断 | 提交前钩子、`garden check` 与构建校验；诊断回给模型修：工作台自动修两轮，skill 同一块最多试三次 |
| Worker 执行 JS | 白名单表达式解释器，在页面里直接跑 |
| 原生组件 + token | 站点组件，外观复刻 ChatGPT 的组件 token（[组件规格](./intelligent-ui-components.md#2-视觉基础)） |
| 数据回填 | 数据默认写在块里；作者已有数据文件时用 `Data` 引用，构建时内联 |
| `AppBlock` | `widget`：同名目录 HTML，沙箱 iframe |
| `fallbackMarkdown` | 构建期静态快照，含计算值 |
| 训练时评估清楚、有用、完整 | 设计规则 + 配方 + `expect` 断言 + 提示词回归集 |

---

## 3. 作者怎么用

以讲 KV cache 显存为例。

**第一步：写想法。** 在 Typora 里按 `Cmd+Alt+I`，或者手打：

````md
```intent kv-memory
让读者拧 batch 和序列长度，看 KV cache 占多少显存。
batch 1 到 32，默认 1；序列 1K 到 32K，默认 4K，用对数轴。
显存 = 2 × 32 层 × 8 个 KV 头 × 128 维 × 序列长度 × batch × 2 字节。
batch 1、序列 4096 时是 512 MiB。
想让读者看出：显存和 batch、序列长度都成正比，长上下文很快吃满显卡。
```
````

装了插件时，这块显示为一张"想法"卡片，角标"未编译"。

**第二步：编译。** 在 Cursor 或 Codex 里说"编译这篇：content/posts/llm-kv-cache.md"。skill 把围栏改写成：

````md
```ui
---
id: kv-memory
caption: 显存与 batch、序列长度都成正比；batch 8、序列 32K 就要 32 GiB。
intent: |
  让读者拧 batch 和序列长度，看 KV cache 占多少显存。
  batch 1 到 32，默认 1；序列 1K 到 32K，默认 4K，用对数轴。
  显存 = 2 × 32 层 × 8 个 KV 头 × 128 维 × 序列长度 × batch × 2 字节。
  batch 1、序列 4096 时是 512 MiB。
  想让读者看出：显存和 batch、序列长度都成正比，长上下文很快吃满显卡。
compiled: 9c1e04ab
expect:
  - given: { batch: 1, seq: 4096 }
    mem: 536870912
---
<State batch={1} seq={4096} />
<Let mem={2 * 32 * 8 * 128 * seq * batch * 2} />

<Columns>
  <Slider bind="batch" label="batch" min={1} max={32} />
  <Slider bind="seq" label="序列长度" min={1024} max={32768} scale="log" format="thousands" />
</Columns>

batch 为 {batch}、序列 {thousands(seq)} 时，KV cache 要 **{bytes(mem)}**。

<Chart sweep="seq" height={180}>
  <Line y={mem} label="KV 显存" format="bytes" />
</Chart>
```
````

**第三步：看和改。** 插件把这块画成两根滑杆、一句会变的话和一条带当前位置标记的曲线。想把 batch 上限改成 64，直接改 `max={64}`，预览立刻更新。想改交互本身，就改 `intent` 里的原话，再说一次"编译这篇"：`compiled` 和原话对不上的块会被重编译。

**第四步：发布。** `make update` 跑构建。构建校验所有 `ui` 块并执行 `expect`；还有 `intent` 没编译，或者 512 MiB 算不对，构建就失败。公开页上是交互组件，RSS 里是默认状态的静态快照，搜索只收 `caption` 和快照里的可见文字。

要单独打磨一块交互时，打开后台 `/admin/ui`（第 11 节）：写一句话生成初稿，再用自然语言或手改微调，满意后复制围栏或写回命令带回稿件。

不知道能做成什么样时，打开组件清单：后台的 `/admin/ui/catalog`、本地的 `npx garden ui catalog`、编辑器插件里的"查看组件清单"，是同一份内容。

---

## 4. 块和状态

| 块 | 谁写 | 进 Git | 读者看见 |
| --- | --- | --- | --- |
| `intent` | 作者 | 只在草稿期 | 公开构建拒绝；本地预览和后台草稿预览里是想法卡片 |
| `ui` | skill 或工作台，作者可以手改 | 是，这是权威副本 | 站点组件 + `caption` |
| `widget` | skill 在目录装不下时按图表 skill 写，或作者手写 | 是，同名目录 HTML | 沙箱 iframe |

`garden ui scan` 和编辑器插件给每块一个状态：

| 状态 | 条件 | "编译这篇"怎么处理 |
| --- | --- | --- |
| 未编译 | `intent` 围栏 | 编译 |
| 过期 | `ui` 的 `compiled` 不等于当前 `intent` 的哈希 | 按原话重编译 |
| 有错 | 解析、校验、求值或 `expect` 失败 | 按诊断修，不改原意 |
| 正常 | 以上都不是 | 不动 |

`compiled` 是规范化后的 `intent`（去首尾空白、统一换行）的 SHA-256 前 8 位，由 `garden ui apply` 写回时自动写入（工作台复制出来的围栏也带着），作者不用管。只改标签里的数字不会让块过期。希望这次手改在以后重编译时也保留，就顺手把原话一起改了：重编译以原话为准，skill 会在回复里列出被盖掉的手改。

`intent` 围栏的信息串可以带 id：` ```intent kv-memory `。没写时 skill 从原文取一个短 id。id 用小写字母、数字和连字符，篇内唯一。

本文说的"本地预览"指 `CONTENT_INCLUDE_DRAFTS=1 make dev`；"草稿预览"指后台的 `/admin/preview` 页面（11.6）。两者对 `intent` 和坏块的显示相同。

适用范围是 `content/` 下所有 Markdown：博文和随想都按同一套规则处理，专栏引用博文，自然包含在内。

---

## 5. `ui` 语法

### 5.1 外形

围栏语言是 `ui`，分两部分：开头 `---` 包住的几行 YAML 是**块头**，放这一块自己的信息；下面是**正文**，也就是交互本身。块头在围栏里面，和文章开头的 front matter 无关。

| 块头字段 | 必填 | 说明 |
| --- | --- | --- |
| `id` | 是 | 篇内唯一；页面锚点为 `#ui-<id>` |
| `caption` | 是 | 一句判断，不能是"见下图"。图注、搜索、RSS、关脚本都靠它 |
| `intent` | 否 | 作者原话，原样保留。只留在源稿，构建时剥离 |
| `compiled` | 否 | `intent` 的短哈希 |
| `expect` | 否 | 已知点断言，见 6.6 |

正文是 Markdown + 组件标签 + `{表达式}`：

- 组件名大写开头，必须在目录里；属性用名字传，字符串用引号，其余用 `{}`。
- 行内 `{表达式}` 插值，显示规则见 6.4。正文里的字面 `{` 写成 `\{`。
- 允许的 Markdown：段落、加粗、斜体、行内代码、列表、引用、链接（相对路径或 https）。
- 不允许：标题（会打乱文章目录）、原生 HTML、图片（用 `Image`）、围栏代码（用 `Code`）、脚注、`import` / `export`。

### 5.2 写在原位置

一块交互的全部内容都在它要讲的那一段旁边，在同一个围栏里：

- 编译时，`intent` 围栏被原地替换成 `ui` 围栏，前后正文一行不动。
- `ui` 块不拆到别的文件。skill 重编译、工作台复制粘贴、编辑器报错定位，对着的都是这一个围栏。
- 块大了，skill 优先拆成两块，各自放在讲它的那一段旁边；硬上限见 5.3。
- 长块不挡读稿：装了插件时默认显示画好的组件，源码折叠，点开才看到（第 12 节）。

只有两样东西放在同名目录：作者已有的数据文件（6.7），以及 `widget` 的 HTML。

### 5.3 上限

| 项 | 上限 |
| --- | --- |
| 元素 | 200 |
| 输入控件 | 6；超过 3 个时 skill 先考虑拆块 |
| `Steps` 的步数 | 24 |
| `Grid` | 16 × 16 |
| `Each` 迭代 / `range` 长度 | 200 / 1000 |
| 曲线取样 / 数据点 | 200 / 2000 |
| `Data` 文件 | 200 KB |
| 单个表达式 | 2000 字符 |

各组件自己的上限（`Table` 50 行、`Checklist` 30 项、`Tabs` 2–6 个、`Chart` 1–4 条系列等）见 [组件规格](./intelligent-ui-components.md)。元素数和上限都按 `Each` 展开之后计算。

---

## 6. 状态与表达式

### 6.1 状态

- `<State batch={1} seq={4096} />` 声明状态和默认值。值只能是数字、字符串或布尔。
- `<Let mem={...} />` 声明派生值。`Let` 可以引用状态、别的 `Let` 和 `Data`，按依赖排序求值；成环报 `ui-cycle`。
- 输入控件用 `bind="名字"` 双向绑定状态。名字必须在 `State` 里声明，类型要对得上，否则报 `ui-bind`。
- `Steps`、`Tabs` 不写 `bind` 时自己管状态；写了 `bind`，绑定的是从 0 开始的当前步或当前标签序号（数字），块里其他组件就能跟着变化。`Checklist` 的勾选状态只在它自己内部，不能绑定。
- `<Button set={{ step: step + 1 }}>下一步</Button>` 改状态；`<Button reset>` 回到默认值。没有别的动作。

状态只活在这一块、这一次打开里，刷新回到默认值。

### 6.2 曲线取样

`<Chart sweep="seq">` 让 `seq` 扫过它的取值范围。范围默认取绑定它的 `Slider` 的 `min`、`max`、`scale`，也可以用 `from`、`to`、`scale` 指定。每个取样点上，其余状态取当前值，重算 `Let`，再求每条线的 `y`。当前值处画一条竖线和圆点。

`<Chart data={rows} x={threads}>` 是数据模式：逐行求值，行里的字段都在作用域内，例如 `<Bar y={qps} />`。

### 6.3 表达式文法

表达式是 JavaScript 表达式语法的子集，由 acorn 解析成 ESTree，再由 `ui/core/expr.mjs` 按白名单解释。允许：

- 字面量：数字、字符串、模板字符串、`true` / `false` / `null`、数组、对象（键不能计算）。
- 运算：`+ - * / % **`、比较、`&& || ?? !`、三元。`==` 和 `!=` 按严格相等处理。
- 名字：状态、`Let`、`Data`、`Each` 的循环变量、`Chart` 数据模式下当前行的字段、常量 `PI` 和 `E`。内层名字遮住外层：行字段和循环变量优先于同名的状态和 `Let`，校验期对重名给出提醒。
- 取成员：`row.qps`、`rows[i]`、`.length`。只能读普通对象和数组，禁止 `__proto__`、`prototype`、`constructor`。
- 调用白名单函数：

| 类 | 函数 |
| --- | --- |
| 数学 | `abs` `min` `max` `floor` `ceil` `round` `trunc` `sqrt` `cbrt` `pow` `exp` `log` `log2` `log10` `sin` `cos` `tan` `atan2` `clamp` |
| 数组 | `range(a, b, step)`（不含 b）、`len`、`sum`、`avg`、`col(data, "key")`、`includes`、`join` |
| 格式 | `fixed(x, d)`、`percent(x, d)`、`bytes(x)`、`si(x)`、`thousands(x)` |
| 浮点 | `float32(x)`、`bits32(x)`、`bits64(x)` |

不允许：赋值、函数与箭头函数、`new`、`this`、正则、逗号表达式，以及调用白名单外的任何东西。

### 6.4 数值与显示

数字就是 IEEE-754 双精度，与 JavaScript 一致，所以站点、`garden check` 和编辑器预览的结果相同。`{0.1 + 0.2}` 显示 `0.30000000000000004`，这正是浮点一类文章要演示的。需要好读的数字时，用格式函数，或用组件的 `format` 属性。`format` 的取值是 `number`、`fixed:2`、`percent`、`bytes`、`si`、`thousands`，与同名函数一致。`bytes` 用二进制单位，输出 `512 MiB`、`32 GiB`。

### 6.5 出错

未知名字、不允许的语法在校验期就挡住。运行时剩下的是除以零得到非有限数、下标越界这类情况：该值显示"—"，所在组件照常绘制，其余部分不受影响。构建时用默认状态把整块试算一遍，抛错的表达式报 `ui-eval`。

### 6.6 `expect`

公式写错是生成式 UI 最难发现的错误。原话里有已知点时，skill 必须把它写成断言：

```yaml
expect:
  - given: { batch: 1, seq: 4096 }
    mem: 536870912
  - given: { batch: 8, seq: 32768 }
    mem: { value: 34359738368, tol: 0.001 }
```

`given` 覆盖状态，其余键是状态名或 `Let` 名。默认相对误差 1e-9。构建和 `garden check` 都会跑，不过就报 `ui-expect`。

### 6.7 数据

数据默认写在块里，用 `Let` 声明一个数组：

```text
<Let bench={[
  { threads: 1, qps: 1200 },
  { threads: 4, qps: 4100 },
  { threads: 16, qps: 9800 },
]} />

<Chart data={bench} x={threads}>
  <Bar y={qps} label="QPS" />
</Chart>
```

作者手里已经有数据文件（压测输出、实验记录）时，才放进同名目录引用它，免得把几百行数字抄进正文，也免得模型重抄出错：

```text
<Data name="bench" src="./redis-bench/bench.csv" />
```

`Data` 只能读本文同名目录里的 `.csv` 或 `.json`。CSV 第一行是表头，数字列自动转成数字。构建时文件内容内联进发布产物，阅读页不再请求文件；编辑器插件按同样的路径读取。skill 只在原话提到某个文件时才用 `Data`，其余情况一律写在块里。

---

## 7. 组件目录

目录是站点能画的全部组件。下表只列要点；每个组件的完整属性、子元素、外观、交互和静态快照见 [组件规格](./intelligent-ui-components.md)，`ui/core/catalog.mjs` 按它实现。

外观复刻 ChatGPT 的 Intelligent UI：圆角卡片、系统字体、全圆角按钮和滑轨、分段控件、圆形勾选框，颜色取自 ChatGPT 的组件 token，浅色深色各一套（[组件规格第 2 节](./intelligent-ui-components.md#2-视觉基础)）。作者只能用 token：`tone`（`plain` `accent` `muted` `new` `cached` `waste` `same`，映射到 ChatGPT 的语义色）、`gap`（0–4）、`size`（`sm` `md` `lg`）。没有 `style`、`className` 和颜色值。输入控件都是原生 `input` / `button`；随状态变化的数字放在 `aria-live="polite"` 区域。数值变化不做滚动动画；翻步淡入 420ms、图表第一次出现时 1.8s 画出，与 ChatGPT 实测一致，减少动态时全部取消。

| 组 | 组件 | 要点 | 阶段 |
| --- | --- | --- | --- |
| 状态与逻辑 | `State` `Let` | 见 6.1 | 1 |
| | `If test` | 条件为真时渲染子元素 | 1 |
| | `Each of as index` | 循环渲染，不超过 200 次 | 1 |
| 布局 | `Stack gap` | 纵向排列 | 1 |
| | `Columns gap min` | 自动换行的多列，默认每列至少 220px，窄屏自动叠放 | 1 |
| | `Card title tone` | 带边框的分组 | 1 |
| | `Tabs bind` > `Tab title` | 标签切换，符合 ARIA tabs 模式 | 1 |
| | `Steps bind autoplay` > `Step title` | 上一步、下一步和进度；方向键可用；`autoplay` 服从减少动态，离开视口暂停 | 1 |
| 输入 | `Slider bind label min max step scale snap format unit` | `scale` 为 `linear` 或 `log`；对数刻度端点都是 2 的幂时只停在 2 的幂上 | 1 |
| | `Choice bind label options style` | 分段按钮或下拉 | 1 |
| | `Toggle bind label` | 开关 | 1 |
| | `Button set reset tone` | 见 6.1 | 1 |
| | `Checklist items` | 可勾选清单，显示"已完成 3 / 8"；勾选状态自己管，不能绑定 | 1 |
| 展示 | `Stat label value format unit hint tone` | 大号数字 | 1 |
| | `Meter value max label format parts` | 条形占比；`parts` 画堆叠构成 | 1 |
| | `Badge tone` | 小标签 | 1 |
| | `Table columns data rowTone` > `Row label cells tones notes` | 表格；行可以来自 `Row`（可放在 `Each` 里）或 `data` | 1 |
| | `Grid cols legend` > `Row label cells tones notes` | 检视格：点一格读这格的说明；格子可聚焦；`tones` 可以给整行一个值。`Row` 与 `Table` 共用 | 1 |
| | `Chart sweep data x height yScale` > `Line` `Area` `Bar` `Point` | 自绘 SVG；悬停或触摸看值；附隐藏数据表供读屏 | 1 |
| 数据 | `Data name src` | 引用同名目录里已有的 `.csv` / `.json`，构建时内联；数据默认用 `Let` 写在块里（6.7） | 2 |
| 媒体与代码 | `Image src alt` > `Hotspot x y title` | 带热点的插图，对应 ChatGPT 的自行车结构图 | 6 |
| | `Code lang code highlight` | 代码走查，`highlight` 可以随步骤变化 | 6 |
| | `Diagram mermaid highlight` | Mermaid 负责布局，高亮的节点和边随状态变化 | 6 |

`catalog.mjs` 里每个组件除了属性和规则，还带一句用途、几句作者可能的口语说法和一个最小示例。组件清单、`garden ui prompt` 和校验器都从这里读，说明和实现不会走样。

加组件的门槛：至少两段真实的 `intent` 用现有组件写不出来，并且能写成一份配方。地图、测验、投票、游戏、3D 不进目录。

---

## 8. 配方与设计规则

### 8.1 配方

配方是给模型看的组合方式，不是组件。每份配方写清读者卡在哪、何时用和何时不用、作者可能怎么说、一个完整示例和常见错误，放在 `ui/prompt/recipes/`。

| 配方 | 文件 | 读者卡在哪 | 骨架 |
| --- | --- | --- | --- |
| 参数台 | `param-bench.md` | 参数是死例子 | `State` + `Let` + `Slider` + 会变的句子或 `Stat` + `Chart sweep` |
| 步进器 | `stepper.md` | 过程被拍成一张图 | `Steps bind` + 每步一句 + 随步变化的 `Grid` 或 `Table` |
| 检视格 | `inspect-grid.md` | 二维结构被压扁 | `Grid` + `notes` + `legend` |
| 对照 | `compare.md` | 对比只能上下翻 | `Columns` 里放两个 `Card`；需要时共用一个输入 |
| 轨迹 | `trace.md` | 看不出"现在走到哪" | `Steps bind` + `Diagram highlight`；阶段 6 前用 `Table` |
| 换算器 | `converter.md` | 一组量随一个数变化 | `Slider` + `Table`，行由 `Each` 生成 |
| 计划与清单 | `plan.md` | 步骤多，要跟着做 | `Checklist` |
| 数据图 | `data-chart.md` | 数字是贴死的截图 | `Let` 数组（或 `Data`）+ `Chart data` + `Table` |
| 代码走查 | `code-walkthrough.md` | 代码是照片 | `Steps bind` + `Code highlight`；阶段 6 前用 `Table` 列变量 |

步进器的例子：

````md
```ui
---
id: prefill-decode
caption: Prefill 一次写满 3 行 K/V；之后每步只新算 1 行，其余读缓存。
---
<State step={0} />
<Let rows={step + 3} />

<Steps bind="step">
  <Step title="Prefill">一次算完 3 个 prompt token 的 K/V，全部写进缓存。</Step>
  <Step title="Decode 1">新 token 只算自己的 K/V，追加第 4 行；前 3 行直接读缓存。</Step>
  <Step title="Decode 2">再追加一行。缓存里已有 {rows} 行，本步新算 1 行。</Step>
</Steps>

<Grid cols={["K", "V"]} legend={{ new: "本步新算", cached: "读缓存" }}>
  <Each of={range(0, rows)} as="i">
    <Row label={"t" + (i + 1)} cells={["k" + (i + 1), "v" + (i + 1)]}
         tones={step == 0 || i == rows - 1 ? "new" : "cached"} />
  </Each>
</Grid>
```
````

### 8.2 设计规则

skill 和工作台的系统提示词都带这几条；`garden check` 能查的也会查：

1. 先判断要不要上交互。一句话、一张表或一张 Mermaid 能说清，就写回正文。在工作台里，作者已经明确要一块交互，模型不改写正文，而是用一行"提醒"说明（11.3）。
2. 默认状态就要能看出结论。不碰任何控件的读者和 RSS 快照也得读到重点。
3. 每个控件都要改变看得见的东西。控件超过 3 个，先考虑拆块。
4. 块里不重复周围散文，只放散文做不到的部分。
5. 数据写在块里；原话提到已有数据文件时用 `Data` 引用，不让模型重抄。
6. 原话里有已知点，就写 `expect`。
7. 360px 宽也能读：多列用 `Columns`，不写固定宽度。
8. 块里不写标题，不写"如图所示"。

---

## 9. 降级与静态快照

结构化的 `ui` 比 iframe 里的 HTML 多一个好处：构建时能算出默认状态，渲染成静态内容。

| 通道 | `ui` | `intent` |
| --- | --- | --- |
| 网页（有脚本） | 交互组件 + `caption` | 公开构建拒绝；本地预览和草稿预览里是想法卡片 |
| 网页（无脚本） | 服务端渲染的默认状态 + `caption` | — |
| 减少动态 | 不自动播放，取消过渡 | — |
| RSS | 静态快照 + `caption` + 指向 `#ui-<id>` 的"在网页中交互"链接 | — |
| 搜索、字数 | `caption` + 快照里的可见文字；不含 `intent` 和表达式 | 不收录 |
| 分发到 CSDN、知乎、掘金 | 静态快照的 Markdown 版 + 指向 `#ui-<id>` 的原文链接 | — |
| Typora 无插件 | 围栏原文 | 围栏原文 |
| 编辑器插件 | 同一套组件 | 想法卡片 |
| 坏块 | 本地预览和草稿预览里是错误卡片（`caption` + 诊断）；公开构建失败 | 公开构建失败 |

静态快照规则（`ui/core/static.mjs`）：

- 输入控件写成"batch：1（网页中可调）"。
- `Steps` 展开成有序列表，每步按该步的状态渲染；`Tabs` 依次展开。
- `Chart` 写成 6 个取样点的表格；`Grid` 和 `Table` 保持表格，tone 用文字标注。
- `Stat`、`Meter` 和行内插值写出默认值下的计算结果。
- `Button` 省略；`If` 和 `Each` 按默认状态展开。

顺带修正 `widget`：RSS 和搜索只收它的 `caption`，不再把 YAML 当作代码块输出。

---

## 10. skill：`garden-ui`

路径是 `.agents/skills/garden-ui/SKILL.md`，随 `garden skill` 装进站点。

触发语：

- "编译这篇：<路径>"、"编译意图块"：处理未编译、过期和有错的块。
- "重编译 <id>"：只处理这一块。
- "这篇哪里适合交互"：只读的建议模式，列出候选段落和可以直接粘贴的 `intent` 草稿，不改稿。

没有给路径时只问路径，不扫全库。

流程：

1. `npx garden ui scan <稿件>`，拿到每块的 id、状态、行号、两种哈希、原话和所在小节标题（JSON）。不自己用正则找。
2. `npx garden ui prompt`，读目录说明、配方和设计规则。工作台的系统提示词用的也是这份，只是另加了自己的输出约定（11.3）。
3. 读每块的原话和所在小节，三选一：
   - 写回正文（散文、表格或 Mermaid）；
   - 写 `ui`；
   - 写 `widget`：目录表达不了的画布动画、音频、物理模拟等，按 [garden-interactive-chart](../.agents/skills/garden-interactive-chart/SKILL.md) 写同名目录 HTML，并在 `widget` 的 YAML 里加 `intent`。
4. 写 `ui` 时：原话原样进 `intent`；`caption` 摘原话里的判断，原话没有判断句就先补一句；有已知点就写 `expect`；数据写在块里，原话提到已有文件时才用 `Data`。块太大就拆成两块，不挪到别的文件。
5. 每块用 `npx garden ui apply` 写回（见下），全部写完后 `npx garden check <稿件>` 直到通过。同一块连续三次修不好，就停下来报告诊断。
6. 回复一张表：id、选择（正文 / ui / widget）、用了哪份配方、做了哪些假设、`expect` 写了什么。

禁止：直接编辑稿件文件、编造原话里没有的数字、使用远程地址。写 `widget` 时，同名目录里的 HTML 文件由 skill 直接创建；稿件本身仍只经 `apply` 改动。

写回由 `garden ui apply` 完成：

```text
npx garden ui apply <稿件> --id <id> [--file <新内容.md>]   # 不给 --file 时从标准输入读
npx garden ui apply <稿件> --at <行号> [--file <新内容.md>] # 没写 id 的 intent 围栏，行号取自 scan
npx garden ui apply <稿件> --intent-hash <哈希> [...]       # 按原话定位没写 id 的 intent，不受行号变化影响
```

- 可选的 `--base <哈希>`：目标块当前内容的哈希必须等于它，否则拒绝覆盖。工作台的写回命令会带上它，防止盖掉本地已经改过的块。
- 新内容可以是一个 `ui` 围栏、一个 `widget` 围栏，或一段普通 Markdown（写回正文时）。写之前按类型校验：`ui` 跑完整校验；`widget` 检查 `src` 和 `caption`；普通 Markdown 里不能再出现 `ui` 或 `intent` 围栏。校验不过就不写，打印诊断。
- 只替换目标围栏所在的字节范围，保留原文件的换行风格。新内容是 `ui` 时自动写 `compiled`。
- 写完后确认围栏之外的内容与原文件逐字节一致，不一致就回滚并报错。
- `--id` 找不到，或者匹配到多块时，拒绝执行。

这样，"不改周围散文"不再靠 skill 自觉，而是由命令保证。

两种哈希都取 SHA-256 的前 8 位十六进制，先把换行统一成 `\n`：`compiled` 和 `--intent-hash` 算的是 `intent` 原话（再去掉首尾空白）；`--base` 算的是整段围栏，从开头的反引号到结尾的反引号。`garden ui scan` 的输出里每块都带着这两个值。

审查 skill（[garden-post-review](../.agents/skills/garden-post-review/SKILL.md)）加一步：稿里有未编译、过期或有错的块时，先按本 skill 处理。

---

## 11. 管理后台

后台的定位不变：写作留在本地，后台只做需要服务器能力的事。它握着模型密钥和仓库读取权限，任何设备都能打开。下面这些页面都需要登录，本地运行、Docker、Cloudflare 三种后台部署都有；公开博客上没有入口。

后台只读仓库，不写稿件。改好的块由作者带回本地，经提交前钩子和构建两道检查后发布。

### 11.1 页面

| 页面 | 路由 | 作用 |
| --- | --- | --- |
| 总览 | `/admin` | 现有的随想与分发，加一张 Intelligent UI 卡片 |
| 组件工作台 | `/admin/ui` | 单独打磨一块交互 |
| 组件清单 | `/admin/ui/catalog` | 有哪些组件和配方，各能做成什么样 |
| 交互块 | `/admin/ui/blocks` | 所有稿件里的块和状态 |
| 草稿预览 | `/admin/preview/<稿件路径>` | 渲染仓库里的任意一篇稿，含草稿和 `ui` 块 |
| 模型自检 | `/admin/ui/evals` | 用回归集给当前模型和提示词打分 |

### 11.2 总览卡片

- **模型：** 是否配置、模型名、这一小时还剩几次生成。
- **交互块：** 未编译、过期、有错各有多少，点进交互块页。
- **版本：** 引擎版本（`hd-garden`）和 `CATALOG_VERSION`。编辑器插件提示"需要更新"时，在这里对照。

### 11.3 组件工作台

#### 布局

三栏，窄屏上下叠放：

| 栏 | 内容 |
| --- | --- |
| 指令 | 一个输入框和本次会话的指令历史；按钮"生成"和"修改"；每次生成的 token 用量和修复轮数 |
| 结构 | 整段围栏（块头 + 正文）的编辑器，带行号和诊断标记。这是唯一的权威副本 |
| 预览 | 用 `UiRuntime` 绘制；可以切换浅色 / 深色、桌面 / 手机宽度、交互 / 静态快照 |

#### 起点

- **空白：** 写一句话，按"生成"。
- **从配方开始：** 在组件清单里点"用它开始"，或在工作台里选一份配方，结构栏填入它的示例，再用"修改"或手改调整。
- **从稿件打开：** 在交互块列表（11.5）里选一块，或在工作台里先选稿件再选块；内容从仓库实时读取，含草稿。`ui` 块载入结构栏；`intent` 块把原话放进指令栏，按"生成"即可。
- **导入：** 把一段已有的 `ui` 围栏贴进结构栏。

#### 用自然语言

- **生成**：指令作为 `intent`，模型从零写一块。
- **修改**：指令和当前围栏一起发给模型，模型返回改过的整段围栏，并同步改写 `intent`，让原话继续描述这块交互。

接口是 `POST /api/admin/ui/draft`，请求体 `{ mode: "create" | "revise", instruction, fence? }`。服务端：

1. `requireAdminMutation()` 校验登录和同源。这个接口花模型额度，不能被跨站请求触发。
2. 按登录用户限流，默认每小时 60 次。
3. 系统提示词是 `garden ui prompt` 的内容，加上工作台的输出约定：只输出一个 `ui` 围栏；觉得这段不必上交互时，在围栏前加一行以"提醒："开头的话，仍然给出最合适的一块。调用 OpenAI 兼容的 `/chat/completions`。
4. 从回复里取出 `ui` 围栏，跑校验和 `expect`。有错时把诊断发回模型修，最多两轮。回复里没有 `ui` 围栏时，返回错误和模型原文。
5. 写好 `compiled`，返回 `{ fence, note, diagnostics, rounds, usage }`。`note` 是那行提醒，显示在指令栏；`usage` 是模型接口返回的 token 用量，只显示，不保存。

限流计数存在后台进程内存里。只有一个作者时这样够用；多实例部署（如 Cloudflare）下是近似值。

没配模型时，指令栏说明后台还没接上模型；结构栏和预览栏照常可用。

模型的结果作为一次可撤销的编辑写进结构栏，`Cmd+Z` 能回到之前的版本，所以不需要"确认覆盖"对话框。

#### 手改结构

结构栏每次输入后（防抖 150ms）在浏览器里解析、校验、求值，合法就重绘预览。这条路径没有网络请求。不合法时，预览保留上一份合法结果，诊断列在旁边，点一条就跳到对应行。

在预览里拖滑杆只改预览的本地状态，不写回结构。

#### 带回稿件

- **复制围栏：** 得到可以直接贴进 Markdown 的 `ui` 块。
- **复制写回命令：** 从稿件打开的块多一个按钮，复制一条贴进本地终端就能执行的命令，由 `garden ui apply` 精确替换那一块：

````sh
npx garden ui apply content/posts/llm-kv-cache.md --id kv-memory --base 3be07a1c <<'GARDEN_UI'
```ui
---
id: kv-memory
……
```
GARDEN_UI
````

  `--base` 是工作台打开这块时它在仓库里的内容哈希。本地这一块已经改过时，`apply` 拒绝覆盖并说明原因。原来是没写 id 的 `intent` 时，命令改用 `--intent-hash` 定位，不受行号变化影响。

结构栏和指令历史自动存在浏览器本地，"新建"会清空。

#### 以后

模型回复以流式进入结构栏，预览渐进出现。解析器已经能容忍半截输入（切到最后一个完整标签），这一步只需接上 SSE。

### 11.4 组件清单

作者不用记组件，但得知道能做成什么样，才写得出好的意图。组件清单回答"有哪些东西可以用"：

- **每个组件：** 一句话用途；作者可以怎么说（会让 skill 选到它的口语）；可交互的示例；属性表；能放在哪里（子元素规则）。
- **每份配方：** 读者卡在哪；一段示例原话；编译结果；可交互的效果；"用它开始"带进工作台。
- **怎么生成：** 整页由 `ui/core/catalog.mjs` 和 `ui/prompt/recipes/` 生成，和校验器、提示词同源，不会过期。

同一个页面还有三个入口，不登录后台也能看：

- `npx garden ui catalog`：在 `.garden/ui-catalog.html` 生成离线页面，并用浏览器打开。
- 编辑器插件的"查看组件清单"（第 12 节）。
- skill 的建议模式在回复末尾提示可以运行 `npx garden ui catalog`。

### 11.5 交互块

- 列出仓库里所有稿件（含草稿）的 `intent` / `ui` / `widget` 块：稿件、id、状态、`caption` 或原话首句、是否草稿。
- 按状态筛选，默认只看需要处理的：未编译、过期、有错。
- 每行可以：在工作台打开；复制修复提示词（与提交前钩子同一个生成器）；在草稿预览里定位到这一块；已发布的稿还可以打开公开页面。
- 数据从 GitHub 实时读：一次 git tree 请求拿到所有 Markdown 的 sha，只拉 sha 变了的文件，按 sha 缓存。不能用后台部署时打包的内容索引：它既过期又不含草稿，而未编译的 `intent` 都在草稿里。
- 看到的是 `CONTENT_BRANCH` 上已推送的内容，本地没推的改动看不到。

### 11.6 草稿预览

- 渲染仓库里任意一篇稿，含草稿和定时发布的稿，用的是和构建相同的转换：`ui` 画成组件，有错的块画成错误卡片，`intent` 画成想法卡片。手机上也能看。
- 同名目录里的图片、`widget` HTML 和 `Data` 文件经 `/api/admin/preview/asset` 代理读取：需要登录，只允许本文同名目录内的路径。HTML 带 `Content-Security-Policy: sandbox allow-scripts` 返回，放进不带 `allow-same-origin` 的 iframe，碰不到后台的 Cookie 和页面。
- 和交互块页一样，看到的是已推送的内容。
- 这页不只服务 Intelligent UI，任何草稿都能在这里看。

### 11.7 模型自检

- 用 `ui/evals/` 的 20 段原话，逐条调用和工作台相同的生成接口。其中大部分是该做成交互的，少数是一张表就够的。每条记录：校验是否通过、修了几轮、期望的组件是否出现、该提醒的样例是否给出了提醒、token 用量、耗时。最后汇总通过率和平均修复轮数。
- 写回正文还是写成 `widget` 的三选一由 skill 在编辑器里做，自检测不到；这部分靠作者看 skill 的回复表。
- 由浏览器逐条发请求，每个请求都是一次普通生成，不需要后台任务；这些请求计入限流。开始前提示预计消耗。
- 结果存在浏览器本地，可以和上一次对比。换模型或改提示词后跑一次。

### 11.8 分发

现有分发把 `source.content` 原文发给 CSDN、知乎、掘金的 webhook。`ui` 上线后，原文里是发布用的 JSON 围栏，别的平台看不懂。改为：

- 分发前把 `ui` 换成静态快照的 Markdown 版（表格、列表、算好的数），后面附"在原文中交互"，链接到 `#ui-<id>`。
- `widget` 换成 `caption` 加链接。
- 已发布的稿里不会有 `intent`。

X 只发标题和链接，"复制"只复制标题、栏目和链接，都不受影响。

### 11.9 接口与环境变量

| 接口 | 作用 |
| --- | --- |
| `POST /api/admin/ui/draft` | 生成或修改一块（11.3），`requireAdminMutation()` |
| `GET /api/admin/ui/blocks` | 交互块列表（11.5） |
| `GET /api/admin/posts/source?path=` | 读一篇稿的原文和 sha，供"从稿件打开" |
| `GET /api/admin/preview/asset?path=` | 草稿预览的同名目录文件代理（11.6） |

读接口都走 `requireAdminApi()`。读仓库沿用现有的 `CONTENT_REPOSITORY`、`CONTENT_BRANCH`、`CONTENT_GITHUB_TOKEN`；交互块总览、从稿件打开、草稿预览和同名目录代理都只读这个仓库，没有配置时页面说明缺什么，不回退到本地文件（后台跑在 Workers 上，没有站点目录可读）。可选的 `GITHUB_API_URL` 改写 GitHub API 根地址，用于 GitHub Enterprise 或本地测试替身，默认 `https://api.github.com`。仓库路径按段编码后再拼进 URL，`%2e%2e` 这类写法不会被解析成上级目录。模型另需：

| 环境变量 | 作用 |
| --- | --- |
| `UI_MODEL_BASE_URL` | 接口根地址 |
| `UI_MODEL_API_KEY` | 只存在后台进程里的密钥 |
| `UI_MODEL_NAME` | 模型名 |
| `UI_DRAFT_RATE_LIMIT` | 可选，每小时次数，默认 60 |

### 11.10 不做

- 写回稿件或提交 Git。
- 在后台写整篇长文。
- 在服务端保存生成历史或自检结果。
- 统计读者怎么操作组件。

---

## 12. 编辑器插件

### 12.1 共同能力

| 能力 | 说明 |
| --- | --- |
| 插入意图块 | 命令、右键菜单；VS Code 默认快捷键 `Cmd/Ctrl+Alt+I`，Obsidian 和 macOS 上的 Typora 不预设（见各节）。弹出口语起步语："让读者拧一个数""让读者一步步走完""并排对比两种做法""让读者点格子看解释""沿着流程走""给一张可勾选的清单""用这份数据画图"，选中后插入带空位「」的句子。菜单里不出现组件名 |
| 预览 `intent` | 想法卡片：原文、"未编译"角标、"复制编译提示词"按钮 |
| 预览 `ui` | 与站点同一套组件，可以交互；显示状态（正常 / 有错 / 过期）和诊断。默认显示组件、折叠源码，长块不挡读稿 |
| 复制编译提示词 | 把"编译这篇：<路径>"放进剪贴板；VS Code 有聊天命令时多给一个"发到聊天"按钮，由作者决定是否发送 |
| 查看组件清单 | 在编辑器里打开组件清单（11.4），内容与后台一致；"用它开始"把配方插到光标处 |

插件不调用模型，也不保存密钥。编译走 skill 或工作台。起步语定义在 `ui/core/starters.mjs`，三个插件共用。

### 12.2 预览包

`ui/preview/` 打成一个浏览器包（IIFE + ESM），内含解析器、校验器、表达式、React 组件和样式。`npm run ui:build` 生成 `ui/preview/dist/`（约 650 KB）；这个目录不进 Git，`npm pack` 前由 `prepack` 自动构建，随 `hd-garden` 发布，`garden ui catalog` 用的就是它。

```ts
GardenUI.render(el, source, {
  theme: "light" | "dark",
  mode: "interactive" | "static",
  readFile: (relativePath: string) => Promise<string | undefined> | string | undefined, // 读 Data 引用的文件
  resolveAsset: (relativePath: string) => string, // 把 Image 的同名目录路径换成宿主能显示的地址
  isolateEvents: boolean, // 控件上的点击和按键不冒泡到编辑器，免得一点滑杆就跳进源码
  fenceLine: number, // 围栏开头在文件里的行号，诊断按文件行号报
}); // 返回 { update(source, options?), destroy() }
GardenUI.renderIntent(el, text, { id, theme, onCopyPrompt, isolateEvents }); // 返回 { update, destroy }
GardenUI.renderCatalog(el, { recipes, theme, onStart }); // 组件清单
GardenUI.catalogVersion;
GardenUI.starters; GardenUI.intentFence(text);
```

- `source` 可以是围栏正文，也可以是包括反引号的整段围栏；编辑器交给插件的通常是正文。
- 块里有预览包不认识的组件、并且目录里没有拼写相近的名字时（引擎比插件新），在错误卡片上方加一句"预览需要更新 Garden 插件"。拼错的名字（`<Slidr>`）只显示诊断和"是不是 `<Slider>`"。块本身不写版本号。
- 预览包不打包 Mermaid（否则要多 3 MB）。`Diagram` 用宿主页面上的 `window.mermaid`：Obsidian 和 Typora 自带，VS Code 预览里没有，这时显示 Mermaid 源码。预览包也不调用宿主 Mermaid 的 `initialize()`，免得改掉宿主自己的图表样式。

### 12.3 VS Code 与 Cursor

用 Markdown 预览的官方扩展点，Cursor 打开同一个仓库时同样生效。

- `markdown.markdownItPlugins` + `extendMarkdownIt`：把 `ui` / `intent` 围栏渲染成占位元素，里面先放静态快照。渲染时 `env.currentDocument` 给出当前文件，扩展进程读取 `Data` 引用的文件，内联进占位元素，预览 webview 不需要自己读文件。占位元素带上围栏的文件行号，诊断和编辑器行号一致；也保留 `code-line` / `data-line`，滚动同步不受影响。
- `markdown.previewScripts`：加载预览包，把占位元素渲染成交互组件。预览更新时 VS Code 会改写或替换 DOM，挂载逻辑按"占位元素 + 内容 + 主题"去重：内容没变就不动，元素被替换就卸载旧的、挂新的。主题切换时重挂。
- `markdown.previewStyles`：组件样式，按 `body` 上的 `vscode-dark` / `vscode-light` 跟随编辑器主题。
- 诊断：扩展进程对 `ui` 围栏跑校验，错误进"问题"面板，并在源码里画波浪线。
- CodeLens：每个围栏上方显示"Garden ui · id · 状态"；不是"正常"时加"复制编译提示词"；另有"组件清单"。状态是"有错"时点它打开"问题"面板。
- 折叠：打开稿件时把 `ui` 块从块头结束的 `---` 折到正文最后一行，只露出块头。设置 `garden.foldUiBodies` 可以关掉。
- 语法高亮：TextMate 注入让 `ui` 围栏的正文按 Markdown 高亮，组件标签按 HTML 标签着色。不按 JSX 高亮：正文里的行内代码有反引号，JSX 语法会把它当模板字符串，一路染到块尾。
- 片段（`intent`）、命令、快捷键插入 `intent`。
- 目录是 `editors/vscode/`。`npm run package` 打出 `.vsix`，可以直接装进 VS Code 或 Cursor；之后再发布到 VS Code Marketplace 和 Open VSX（Cursor 从 Open VSX 安装）。

### 12.4 Obsidian

- `registerMarkdownCodeBlockProcessor("ui" | "intent")`：阅读视图和实时预览都会渲染。实时预览里，光标在围栏内时显示源码，离开时显示组件，这正好是"默认显示组件、折叠源码"。用 `MarkdownRenderChild` 挂载和卸载 React。
- `Data` 引用的文件用 `app.vault.adapter.read()` 从 `ctx.sourcePath` 所在目录读取；路径越出同名目录时显示 `caption` 和错误句。`Image` 用 `getResourcePath()` 显示同名目录里的图。
- 诊断行号取 `ctx.getSectionInfo(el).lineStart`，和编辑器行号一致。
- `addCommand` + `editorCallback` 插入 `intent`，编辑器右键菜单里也有。Obsidian 的插件规范不建议预设快捷键，所以不预设，作者在"设置 → 快捷键"里自己绑。
- 主题跟随 `body.theme-dark`；切换主题（`css-change`）时已渲染的块重画。
- `Diagram` 用 `loadMermaid()` 拿到 Obsidian 自带的 Mermaid。
- 目录是 `editors/obsidian/`，`node editors/obsidian/build.mjs` 生成 `main.js`、`manifest.json`、`styles.css`。先手动或用 BRAT 分发，稳定后提交社区商店。

### 12.5 Typora

Typora 没有官方插件 API，只能靠社区框架注入。两个候选：

| 框架 | 自定义代码块 | macOS |
| --- | --- | --- |
| [obgnail/typora_plugin](https://github.com/obgnail/typora_plugin) | `diagramParser.register()` | 维护者没有 Mac，未测试。它依赖 Node，而 macOS 版 Typora 是 Swift + WKWebView，没有 Node |
| [typora-community-plugin](https://github.com/typora-community-plugin/typora-community-plugin) | `codeblock.registerMode({ lang, mode, render })` 把语言接进 Typora 原生的图表引擎；另有 `CodeblockPostProcessor` | 官方在 macOS 10.13–26 上测试过；提供跨平台的 `fs` / `path` |

选 **typora-community-plugin**。作者在 macOS 上写稿，typora_plugin 在 Mac 上基本用不了。

接口取自它 2026-10-09 的源码（提交 `18d3769`）：

- 插件里用 `this.app.features.markdownEditor.codeblock.registerMode({ lang: "ui", mode, render })` 注册，返回的卸载函数交给 `this.register()`。`intent` 同样注册一次。
- `render(code)` 返回一个 DOM 元素。Typora 把它当作 Mermaid 那样的图表：光标离开围栏时显示 `render` 的结果，点进去编辑源码。默认显示组件、折叠源码，不需要自己做切换按钮。
- `mode` 是 CodeMirror 的高亮模式，返回 Typora 自带的 Markdown 模式（理由同 VS Code，不用 JSX），让 `ui` 出现在围栏语言的自动补全里。
- `render` 每次编辑后都会被重新调用，但它只收到代码，拿不到围栏的 `cid`，没法按块复用句柄。所以每次都新建一个 React 根节点；之后再调用 `render` 时，把已经离开页面超过 2 秒的旧根节点卸载掉。编辑源码时组件状态本来就要重置，这样做没有可见差别。
- 插件的 `main.js` 是 ES 模块，默认导出插件类。框架的核心挂在 `window[Symbol.for("typora-plugin-core@v2")]` 上（它自己的构建插件也是把 import 改写成这个查找），插件直接从这里取 `Plugin`、`fs`、`Notice`、`openQuickPick`，不需要它的构建工具。
- 用它提供的 `fs.readText()` 读 `Data` 引用的文件；macOS 版 Typora 没有 Node，不能用 `require("fs")`。
- 主题：Typora 主题是任意 CSS，从 `#write`、`body`、`html` 里第一个不透明的背景色判断深浅。
- 打开 `isolateEvents`：点滑杆、按钮不会让 Typora 进入源码编辑；点组件的空白处照常进入。
- 插入意图块用 `editor.UserOp.pasteHandler(editor, markdown, true)` 粘贴一段 Markdown。快捷键：Windows / Linux 默认 `Ctrl+Alt+I`；macOS 不预设，因为 Option 会改写 `event.key`（Option+I 是"ˆ"），框架按 `event.key` 匹配快捷键，`Cmd+Alt+I` 永远匹配不上。作者在设置页里录一个即可。
- 预览里拿不到 `intent` 围栏信息串里的 id，想法卡片只显示"想法"。
- `manifest.json` 要求 typora-community-plugin ≥ 2.10.52，这个版本的 `registerMode` 带 `render`。`CodeblockPostProcessor` 只在真机验证（16 节）发现 `render` 接管不生效时再接。
- 目录是 `editors/typora/`，`node editors/typora/build.mjs` 生成 `main.js`、`manifest.json`、`style.css`。`README` 写清安装顺序：先装 typora-community-plugin（需要修改 `Typora.app/Contents/Resources/TypeMark/index.html`），再把构建结果放进 `~/.typora/community-plugins/plugins/` 并启用。

只承诺上面这些。Typora 升级会覆盖 `index.html`，插件随之失效，但围栏原文还在，预览可以退回 `make dev` 或工作台。插件不执行 `widget` 的 HTML。

---

## 13. 提交前检查

`ui` 块写在稿件里，手改时最容易打错组件名、漏掉括号，或在公式里引用不存在的名字。等到 `make update` 构建失败才发现，已经离改动很远了。提交前钩子在 `git commit` 时就拦下来，并给出一段可以直接发给 AI 的修复提示词。

### 13.1 安装

`garden sync` 或 `garden dev` 第一次运行时，和补齐 Makefile、skill 同一时机（`ensureSiteKit`），在 `.git/hooks/pre-commit` 写入：

```sh
#!/bin/sh
# garden: ui check
if [ ! -d node_modules/hd-garden ]; then
  echo "garden 还没安装（先运行 npm install），这次跳过 ui 检查。" >&2
  exit 0
fi
exec npx --no-install garden ui check --staged --quiet
```

- `--quiet`：全部通过时不输出，提交过程保持安静；有问题时照常输出。
- 检查逻辑在引擎里，钩子只负责调用。升级 `hd-garden` 不用重装钩子。
- 刚克隆、还没装依赖时跳过检查并提示，不挡住提交；构建仍会把关。
- 已经有 pre-commit 钩子（自己写的或 husky 等）时不覆盖，只打印一行说明，请作者把 `npx --no-install garden ui check --staged --quiet` 加进现有钩子。
- `garden hooks` 手动重装；设置 `GARDEN_SKIP_HOOKS=1` 时不安装。

### 13.2 检查什么

| 对象 | 处理 |
| --- | --- |
| 范围 | 暂存区里的 `content/**/*.md`。读的是暂存版本（`git show :<路径>`），部分暂存时检查的正是要提交的内容；`Data` 引用的文件也读暂存版本 |
| `ui` 块 | 解析、目录校验、默认状态试算、`expect`，与构建用同一套函数 |
| 非草稿稿件里的 `intent` | 报错：推上去会让构建失败 |
| 草稿里的 `intent` | 放行。写稿途中提交想法是正常的。草稿指 `draft: true` 或发布时间在未来，与构建的判断一致 |
| `ui-stale` | 只提醒，不拦 |

不联网，不调用模型，通常一秒内结束。`garden ui check <稿件>...` 查指定文件；`garden ui check --all` 扫全部稿件，手动或在 CI 里用。

`garden ui check` 只查 `ui` 和 `intent`，给钩子和修复提示词用；`garden check <稿件>` 是整篇检查，包含同样的 `ui` 诊断，再加上标题、图片等其他结构检查。

### 13.3 失败时的输出

1. 诊断列表，一行一条：

   ```text
   content/posts/llm-kv-cache.md:51  kv-memory  ui-component  未知组件 <Slidr>
   content/posts/llm-kv-cache.md:47  kv-memory  ui-expr       未知名字 seqq
   ```

2. 一段修复提示词，夹在两行分隔线之间。同一份内容写入 `.garden/ui-fix-prompt.md`（站点模板已经忽略 `.garden/`）；系统有 `pbcopy`、`wl-copy` 或 `clip` 时自动复制到剪贴板，并提示"已复制"。在 VS Code 源代码管理面板里提交时，钩子输出藏在弹窗里不好复制，剪贴板和文件就是为这种情况准备的。不想让钩子动剪贴板，设置环境变量 `GARDEN_UI_NO_COPY=1`（命令行里也可以加 `--no-copy`）。
3. 退出码 1。确实要先提交，用 `git commit --no-verify`。

修复提示词长这样：

````text
请修复下面 Garden 博文里有错误的 ui 块。

要求：
- 先运行 npx garden ui prompt，读组件目录和规则；仓库里有 garden-ui skill 时按它的流程做。
- 只改列出的块，用 npx garden ui apply <稿件> --id <id> 写回，不要直接编辑稿件。
- 不改 intent 的原意。修好后运行 npx garden ui check <稿件>，直到通过。
- 如果你不能访问这个仓库，就只回复每块修好后的完整围栏。

1. content/posts/llm-kv-cache.md，第 42–63 行，id: kv-memory
   - 第 51 行 ui-component：未知组件 <Slidr>
   - 第 47 行 ui-expr：未知名字 seqq

当前围栏：

```ui
---
id: kv-memory
caption: 显存与 batch、序列长度都成正比；batch 8、序列 32K 就要 32 GiB。
……
```
````

- 提示词默认面向能读仓库的编码代理（Cursor、Codex），所以写得短，组件目录让它自己运行 `garden ui prompt` 去读。要贴进不能访问仓库的聊天窗口时，运行 `npx garden ui check --staged --standalone`，提示词末尾会附上 `garden ui prompt` 的全文。
- 一次最多附 10 块的围栏原文，其余只列 id 和诊断。
- 未编译的 `intent` 也写进同一份提示词，要求编译。

### 13.4 和构建的关系

钩子负责提早反馈，不是唯一关口。`--no-verify` 提交、别的机器上的提交、通过 GitHub 网页或 API 的改动都绕得过它。挡住发布的仍然是构建：`make update` 在本地先跑 `garden build`，CI 再跑一次。

---

## 14. 引擎实现

### 14.1 模块

`ui/` 放在仓库根目录，站点、后台、CLI 和编辑器预览包共用。解析器只出现在构建、CLI、后台和编辑器里；公开页面拿到的是构建好的语法树，客户端包里只有求值器和组件。

| 文件 | 职责 |
| --- | --- |
| `ui/core/fence.mjs` | 在 Markdown 里找 `intent` / `ui` 围栏，拆块头，算 `intent` 哈希，给出状态 |
| `ui/core/parse.mjs` | 正文转语法树：micromark + `micromark-extension-mdx-jsx` + `micromark-extension-mdx-expression` + acorn；带行列号；能容忍半截输入 |
| `ui/core/catalog.mjs` | 组件、属性类型、枚举、子元素规则、上限和 `CATALOG_VERSION` |
| `ui/core/validate.mjs` | 用目录校验语法树，输出诊断 |
| `ui/core/expr.mjs` | 白名单表达式解释器、函数表、格式化 |
| `ui/core/state.mjs` | `State` / `Let` 依赖排序、成环检测、`sweep` 取样、`expect` |
| `ui/core/compile.mjs` | 校验、内联 `Data` 文件、剥离 `intent` 等字段，输出发布用的 JSON |
| `ui/core/apply.mjs` | 按 id 或行号替换一块，校验新内容，确认围栏之外逐字节不变 |
| `ui/core/static.mjs` | 发布 JSON 转静态 HTML、Markdown（分发用）和纯文本 |
| `ui/core/transform.mjs` | 按公开构建 / 本地预览改写整篇稿的围栏；搜索文字、RSS 和分发用的派生内容 |
| `ui/core/scan.mjs` | `garden ui scan`、钩子、后台和编辑器共用的逐块信息：状态、行号、两种哈希、原话、小节标题、诊断 |
| `ui/core/fix-prompt.mjs` | 提交前检查失败时的修复提示词 |
| `ui/core/starters.mjs` | 插入意图块时的口语起步语，三个编辑器插件共用 |
| `ui/core/demos.mjs` | 组件清单里每个组件的演示块 |
| `ui/react/` | `UiRuntime`、各组件和 `ui.css`（ChatGPT 组件 token 的浅色、深色两套） |
| `ui/react/CatalogPage.tsx` | 组件清单。后台页面、`garden ui catalog` 的离线页面和编辑器插件共用 |
| `ui/prompt/rules.md` | skill 和工作台共用的提示词：格式、状态与表达式、何时上交互、设计规则、`expect`、常见错误 |
| `ui/prompt/studio.md` | 工作台额外的输出约定：只回一个围栏、可选的"提醒"、修改模式的规则 |
| `ui/prompt/recipes/` | 9 份配方，见 8.1 |
| `ui/prompt/build.mjs` | 拼出 `garden ui prompt` 的输出：`rules.md` + 从 `catalog.mjs` 生成的组件参考 + 全部配方。工作台在此之后再接上 `studio.md` |
| `ui/preview/` | 编辑器预览包入口（12.2）；`scripts/build-ui-preview.mjs` 用 esbuild 打包 |
| `editors/vscode/`、`editors/obsidian/`、`editors/typora/` | 三个编辑器插件，各自有 `build.mjs`、`tsconfig.json` 和安装说明；根目录的 `tsconfig.json` 排除 `editors/`，它们按各自宿主的类型检查。`npm run editors:build` 一次构建三个 |
| `.agents/skills/garden-ui/` | 编译 skill（第 10 节），随 `garden skill` 装进站点 |
| `ui/evals/cases.yaml` | 提示词回归集：20 段 `intent`，每段写明期望出现的组件、是否必须写 `expect`，或期望给出"提醒" |

### 14.2 站点接入

| 文件 | 改动 |
| --- | --- |
| `scripts/build-content.mjs` | 公开构建遇到 `intent` 报 `intent-uncompiled`；`ui` 校验失败则构建失败，本地预览（含草稿）时改为错误卡片；`ui` 围栏改写成发布 JSON |
| `scripts/check-post.mjs` | 接入 `ui` 诊断和 `ui-stale` 提醒 |
| `app/components/MarkdownArticle.tsx` | `language-ui` 交给 `UiBlock`；`language-intent` 交给 `IntentCard`（只在本地预览和草稿预览出现） |
| `app/components/UiBlock.tsx` | `<figure id="ui-<id>">` + 客户端 `UiRuntime` + `figcaption` |
| `app/lib/content.ts` | `toSearchableText` 与字数统计：`ui` 只取 `caption` 和快照文字，`widget` 只取 `caption` |
| `app/rss.xml/route.ts` | 交给 `marked` 之前，把 `ui` 换成静态快照，把 `widget` 换成 `caption` 加链接 |
| `bin/garden.mjs` | 新增 `garden ui scan` / `check` / `apply` / `prompt` / `schema` / `catalog` 和 `garden hooks`；`ensureSiteKit` 安装提交前钩子 |
| `scripts/ui-cli.mjs` | `garden ui` 子命令的实现；`check` 负责读暂存区、汇总诊断、生成修复提示词、写文件和剪贴板 |
| `vite.config.ts` | `garden dev` 的内容监听按本地预览模式重建，坏块显示错误卡片而不是中断开发服务器 |
| `package.json` | 新依赖；`files` 带上 `ui/`；脚本 `ui:build`、`editors:build`，`prepack` 构建预览包 |

`intent-uncompiled` 必须在构建里挡：站点的 `make update` 跑的是 `garden sync && garden build`，不会跑单篇的 `garden check`。

### 14.3 后台

| 文件 | 职责 |
| --- | --- |
| `app/components/AdminDashboard.tsx` | 总览加 Intelligent UI 卡片和各页入口 |
| `app/admin/ui/page.tsx` | 组件工作台，沿用后台登录 |
| `app/components/UiStudio.tsx` | 三栏布局、四种起点、本地保存、复制围栏和写回命令；结构栏用 CodeMirror 6（行号、撤销、错误行标记，不做语法着色：块头是 YAML、正文是 Markdown 加标签，套 JS 着色反而满屏红） |
| `app/admin/ui/catalog/page.tsx` | 组件清单，渲染 `CatalogPage` |
| `app/admin/ui/blocks/page.tsx` | 交互块总览 |
| `app/admin/preview/[...path]/page.tsx` | 草稿预览 |
| `app/admin/ui/evals/page.tsx` | 模型自检，浏览器逐条调用生成接口 |
| `app/api/admin/ui/draft/route.ts` | 校验登录与同源、限流、调用模型、修复循环 |
| `app/api/admin/ui/blocks/route.ts` | 扫描仓库里的块，按 sha 缓存 |
| `app/api/admin/posts/source/route.ts` | 读一篇稿的原文和 sha |
| `app/api/admin/preview/asset/route.ts` | 同名目录文件代理；HTML 带 sandbox CSP |
| `app/api/admin/distribution/route.ts` | 分发前把 `ui` 换成静态快照 Markdown，`widget` 换成 `caption` 加链接 |
| `app/lib/ui-model.ts` | OpenAI 兼容客户端、提示词拼装（含工作台输出约定）、从回复里取出围栏和提醒 |
| `app/lib/github-content.ts` | 增加读 tree、按 sha 读 blob、按路径读原文；`GITHUB_API_URL` 可改 API 根地址；路径按段编码后再拼 URL |
| `app/lib/ui-content.ts` | 后台读仓库稿件和同名目录文件的统一入口，扫描结果按 blob sha 缓存 |
| `app/lib/repository-path.mjs` | `repositoryContentPath()`：后台只读 `content/posts`、`content/thoughts` 下的 `.md`，拒绝越界和编码绕过 |

### 14.4 诊断码

| code | 级别 | 条件 |
| --- | --- | --- |
| `intent-uncompiled` | 错误（公开构建） | 还有 `intent` 围栏 |
| `ui-header` | 错误 | 块头缺 `---`，或 YAML 不是对象 |
| `ui-id` / `ui-caption` | 错误 | 缺字段、重复或字符不合法 |
| `ui-syntax` | 错误 | 正文解析失败，带行列号 |
| `ui-markdown` | 错误 | 用了不允许的 Markdown：标题、HTML、图片、围栏代码等 |
| `ui-component` | 错误 | 组件不在目录里 |
| `ui-prop` | 错误 | 未知属性、类型或枚举不对、缺必填属性 |
| `ui-children` | 错误 | 子元素不允许，例如 `Step` 不在 `Steps` 里 |
| `ui-bind` | 错误 | `bind` 指向未声明的状态，或类型不符 |
| `ui-expr` | 错误 | 不允许的语法、未知名字或函数 |
| `ui-cycle` | 错误 | `Let` 成环 |
| `ui-eval` | 错误 | 默认状态下求值抛错 |
| `ui-expect` | 错误 | 断言不符 |
| `ui-limit` | 错误 | 超出 5.3 的上限 |
| `ui-data` | 错误 | `Data` 路径越出同名目录、文件不存在或格式不对 |
| `ui-stale` | 提醒 | `compiled` 与 `intent` 对不上 |

---

## 15. 安全

- **不执行代码。** 表达式只走白名单解释器，没有 `eval`、`new Function` 和 Worker。成员访问挡住原型链；`range`、`Each` 和取样都有上限；单次渲染的求值步数有预算，超出时这次的结果显示"—"。
- **不出现任意标记和样式。** 文字由 React 转义；正文里的原生 HTML 在校验期拒绝；样式只有 token，没有 `style`。
- **不引用外部资源。** `Data`、`Image` 只能读本文同名目录；链接只允许相对路径和 https，外链加 `rel="noopener noreferrer"`。
- **密钥。** `UI_MODEL_API_KEY` 只放在后台环境变量里，和现有的 OAuth、PAT、OSS 凭据同一边界。公开构建、编辑器插件和预览包都不读取它。
- **后台接口。** 生成接口用 `requireAdminMutation()`，按用户限流；请求体只有指令和围栏文本，响应不含密钥。读接口用 `requireAdminApi()`。
- **草稿预览的文件代理。** 只允许本文同名目录内的路径，拒绝 `..` 和绝对路径；带 `X-Content-Type-Options: nosniff`；HTML 带 `Content-Security-Policy: sandbox allow-scripts`，嵌在不带 `allow-same-origin` 的 iframe 里，读不到后台的 Cookie 和页面。
- **后台不写稿件。** 工作台只复制围栏和写回命令，仓库写权限仍只用于现有的随想和置顶。
- **作者笔记不外泄。** `intent` 在构建时剥离，不进公开产物、搜索和 RSS。源码仓库是私有的时候，这一点尤其重要。

---

## 16. 测试

只给纯逻辑写单元测试，不 mock：

| 测试 | 覆盖 |
| --- | --- |
| `tests/ui-expr.test.mjs` | 优先级、白名单拒绝、原型链访问、除零与非有限数、函数表、浮点函数 |
| `tests/ui-state.test.mjs` | `Let` 排序与成环、`sweep` 取样、`expect` 容差 |
| `tests/ui-validate.test.mjs` | 属性类型与枚举、子元素规则、`bind` 类型、上限、Markdown 限制 |
| `tests/ui-static.test.mjs` | `Steps` 展开、`Each` 按默认状态展开、计算值写入快照；HTML 与 Markdown 两种输出 |
| `tests/ui-apply.test.mjs` | 只替换目标块、围栏外逐字节不变、id 缺失或重复时拒绝、`--base` 不符时拒绝、按 `--intent-hash` 定位、保留 CRLF |
| `tests/ui-transform.test.mjs` | 公开构建遇到 `intent` 和坏块时报错并给出文件行号；发布内容内联 `Data`、不含 `intent`；本地预览把坏块变成错误卡片；搜索文字、RSS 和分发内容里没有作者原话和原始围栏 |
| `tests/preview-asset-path.test.mjs` | 草稿预览代理的路径判断：越出同名目录、`..`、绝对路径一律拒绝；后台只读 `content/posts`、`content/thoughts` 下的 `.md`，`%2e%2e`、`%2f` 等编码绕过也拒绝 |

`tests/content-pipeline.test.mjs` 的真实文件夹具里链接了 `ui/`，构建脚本照常跑通。

提交前检查在临时 git 仓库里做端到端测试（`tests/ui-hook.test.mjs`）：用 `garden hooks` 装钩子，暂存一篇有坏块的稿，`git commit` 被拒；只在工作区修好、没有重新暂存时，提交仍然被拒，因为检查读的是暂存版本；暂存修好的版本后提交成功。测试设置 `GARDEN_UI_NO_COPY=1`，不碰剪贴板。修复提示词的措辞不做断言。

React 组件、后台和插件靠预览和手动验收，不写快照测试。插件在发布前至少在浏览器里用替身宿主跑一次：VS Code 扩展用假的 `vscode` 模块跑 markdown-it 钩子、诊断、CodeLens 和折叠，再在页面里加载预览脚本；Obsidian 和 Typora 插件用假的 `obsidian` 模块和假的框架核心加载构建产物，渲染一块读 CSV 的图。替身只验证接线，真机验收见阶段 0 第 2 条和阶段 3、4。

改了提示词或目录之后，在后台的模型自检（11.7）里跑一遍 `ui/evals/`，看校验通过率、两轮内修好的比例、期望组件是否出现、该提醒时是否提醒。这是改提示词时的回归检查，不是单元测试。

---

## 17. 实施顺序

### 阶段 0：验证

组件规格、提示词、配方和回归集已经有初稿（[组件规格](./intelligent-ui-components.md)、`ui/prompt/`、`ui/evals/cases.yaml`）。动手实现之前，先把三处只能实测的地方跑通：

1. 解析器和解释器能处理 9 份配方里的全部示例，并按组件规格算出正确的默认值。
2. 在作者的 Typora 版本（macOS）上，typora-community-plugin 的 `registerMode` 能用 `render` 挂上一个 React 包，交互正常，编辑后能刷新。不行就改用 `CodeblockPostProcessor`。
3. 选定的模型配上 `rules.md` + 组件参考 + 配方 + `studio.md`，对 `cases.yaml` 两轮内校验通过率不低于 80%。这一步用一次性脚本跑，后台的模型自检在阶段 2 才有。

实测结果和规格不符时，先改规格和提示词，再进入阶段 1。

### 阶段 1：引擎与站点

1. `ui/core` 全部模块和单元测试。
2. 第 7 节标为阶段 1 的组件和 `ui.css`。
3. 接入构建、检查、搜索、字数和 RSS；静态快照。
4. 分发改用静态快照的 Markdown 版（11.8）。`ui` 一上线，已发布的稿就可能被分发，所以和站点一起做。
5. `garden ui scan` / `check` / `apply` / `prompt` / `schema` 和提交前钩子。`prompt` 放在这一阶段，是因为钩子的修复提示词要用到它。
6. 在引擎里放一篇示范稿：参数台、步进器、对照各一块。

验收：

- 只含 `intent` 的稿，公开构建失败并报 `intent-uncompiled`；本地预览显示想法卡片。
- 第 3 节的块在页面上拖动后读数正确；把 `expect` 里的数字改错，构建失败。
- 关掉脚本能看到默认状态和 `caption`；RSS 里是静态快照，没有 YAML 和 `intent`；搜索搜不到 `intent` 里的词。
- 360px 宽下 `Columns` 叠放，`Grid` 横向滚动。
- 暂存一篇有坏块的稿，`git commit` 被拦下，输出诊断和修复提示词；`.garden/ui-fix-prompt.md` 和剪贴板里是同一份内容。草稿里的 `intent` 不拦。
- `garden ui apply` 写回后，围栏之外的内容与原文件逐字节一致。
- 分发到知乎的 webhook 收到的 Markdown 里没有 `ui` 围栏，只有快照和原文链接。
- 已有的 `widget` 稿渲染不变。

### 阶段 2：写作链路

1. `garden-ui` skill 和配方；审查 skill 接入。
2. `Data` 组件。
3. 组件清单：`CatalogPage`、后台 `/admin/ui/catalog`、`garden ui catalog`。
4. 组件工作台：四种起点、生成、修改、修复循环、手改实时重绘、预览切换、本地保存、复制围栏和写回命令；总览卡片。"从稿件打开"要用到 `GET /api/admin/ui/blocks` 和 `GET /api/admin/posts/source`，这两个接口在这一阶段做。
5. 模型自检。它复用工作台的生成接口，和工作台一起做，之后改提示词都靠它回归。

验收：

- 对 skill 说"编译这篇"，所有未编译和过期的块都变成通过检查的 `ui`，`intent` 与原文一致，回复里列出每块的选择；稿件只经 `garden ui apply` 改动。
- 把提交前钩子给出的修复提示词原样贴给 Cursor，它能修好并让下一次提交通过。
- 在工作台里改结构栏，预览在没有网络请求的情况下更新；写错时保留上一份合法预览，并能定位到行。
- 没配模型时，导入已有的块仍能预览和手改。
- 组件清单里每个组件和配方都有能交互的示例；点"用它开始"后，工作台的结构栏里是这份示例。`garden ui catalog` 不登录后台也能打开同样的内容。
- 从稿件打开一块、改完复制写回命令，在本地终端贴一次就替换成功；本地这一块事先改过时，命令拒绝覆盖。
- 模型自检跑完 20 条，显示通过率、平均修复轮数和 token 用量，并能和上一次对比。

### 阶段 3：VS Code / Cursor 与 Obsidian

1. `ui/preview` 预览包，含 `renderCatalog`。
2. VS Code 扩展：预览、诊断、CodeLens、插入、查看组件清单。
3. Obsidian 插件：阅读视图与实时预览、插入、查看组件清单。

验收：同一块在网页、VS Code、Obsidian 里默认读数一致，拖动交互一致；有错的块在 VS Code 的"问题"面板里能定位到行。

### 阶段 4：Typora

做 typora-community-plugin 插件，macOS 先行。验收：能插入 `intent`，能预览想法卡片和 `ui`，能查看组件清单；卸载插件后围栏原文完整。

### 阶段 5：后台运营

1. 交互块总览页面（接口在阶段 2 已有）。
2. 草稿预览与文件代理。

验收：

- 在一篇草稿里推上去一段 `intent`，交互块页在下一次刷新时列出它，状态为未编译；点"在工作台打开"，原话出现在指令栏。
- 草稿预览里 `ui` 能交互，坏块显示错误卡片，同名目录的图片和 `widget` 正常显示；代理拒绝越出同名目录的路径。

### 阶段 6：目录扩展

`Image` + `Hotspot`、`Code`、`Diagram`；工作台流式生成。验收：官方文章里的自行车结构图和烤羊排计划都能用目录写出来。

---

## 18. 风险

- **模型的设计判断不稳。** 用设计规则、配方、校验、`expect` 和回归集兜底；校验错误回给模型修，不靠"再试一次"。
- **目录膨胀。** 加组件按第 7 节的门槛。配方可以多，组件要少。
- **Typora 注入脆弱。** 插件是增强，围栏才是正文。Typora 升级后插件失效，源稿照样能编译、能发布。
- **依赖 MDX 的解析层。** 只用 micromark 扩展和 acorn，不引入 MDX 编译器，并锁定版本。
- **客户端体积。** 公开页只带求值器和组件，预算是 gzip 后 40 KB（不含 React）。阶段 1 结束时量一次，超出就改成只在有 `ui` 块的页面按需加载。
- **作者分不清 `ui` 和 `widget`。** 作者只写 `intent`，写成哪种由 skill 决定。
- **逆向细节过时。** 第 2.1 节的实现细节若与以后的公开文档不一致，以公开文档为准。Garden 的语法和目录不依赖与 DIL 兼容。

---

## 19. 与现有文档的关系

- [可交互组件](./interactive-blog-components.md) 的五种原语在这里是第 8.1 节的配方。它的同名目录 HTML 是 `widget` 逃逸口，规则不变。
- 管理后台原先只管随想、置顶和分发，现在多了组件工作台、组件清单、交互块总览、草稿预览和模型自检（[独立管理后台](./admin-service.md)）。后台仍然不写稿件，长文仍是本地编辑器 + Git。
