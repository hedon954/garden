# Intelligent UI 写作层

作者在 Typora、VS Code 或 Obsidian 里写 Markdown 时，用一段自然语言说出「这里读者自己动手会更清楚」。一个 skill 扫出这些段落，按组件目录里的模板改写成可渲染的组件块。编辑器插件负责插入这段包裹，并在编译后给出预览。

这篇是需求和技术方案。读者侧的五种图表原语、同名目录和 `widget` 围栏仍以 [可交互组件](./interactive-blog-components.md) 为准。本文在那条链路前面加一层写作入口，并规定什么时候停在散文、Mermaid 或现有 `widget`。

参考实现来自 2026-10 的 ChatGPT Intelligent UI。[官方说明](https://openai.com/index/gpt-6-for-everyone/) 只公开了能力边界。下文第 2 节里的 DIL、编译器和沙箱细节来自 Thesys 对 ChatGPT 网页端的逆向（[OpenUI 技术笔记](https://www.openui.com/blog/how-chatgpt-intelligent-ui-works)，2026-10-08），标为观察，不是 OpenAI 的公开规范。

---

## 1. 作者侧要变成什么样

写 KV 显存时，作者留下这一段，然后对 AI 说「编译这篇的意图块」：

````md
```intent memory
读者现在只能看见一组算好的数字。让他们拧 batch 和序列长度。
batch 从 1 到 32，默认 1。序列长度从 1024 到 32768，默认 4096，用对数轴。
显存字节 = 2 × 32 层 × 8 个 KV 头 × 128 维 × 序列长度 × batch × 2 字节。
判断：batch 线性放大显存，序列长度才是大头。
```
````

skill 把它收成目录里的参数台，原文留在 `intent` 里，方便以后按原话重编译：

````md
```ui
id: memory
kind: param-bench
caption: batch 线性放大显存；序列长度才是大头。
intent: |
  读者现在只能看见一组算好的数字。让他们拧 batch 和序列长度。
  batch 从 1 到 32，默认 1。序列长度从 1024 到 32768，默认 4096，用对数轴。
  显存字节 = 2 × 32 层 × 8 个 KV 头 × 128 维 × 序列长度 × batch × 2 字节。
  判断：batch 线性放大显存，序列长度才是大头。
controls:
  - { id: batch, label: batch, min: 1, max: 32, step: 1, default: 1 }
  - { id: seq, label: 序列长度, min: 1024, max: 32768, default: 4096, scale: log }
readout:
  - { id: mem, label: KV 显存, unit: MiB, expr: "(2 * 32 * 8 * 128 * seq * batch * 2) / 1048576" }
```
````

作者不记组件名。组件名、字段和表达式是 skill 对照模板写出来的。作者要改交互时，改 `intent` 里的原话，再说一次「按意图重编译 memory」。

插包裹块由编辑器完成：光标处插入空的 `intent` 围栏，可选五句起步语。编译前，插件把围栏画成一张「想法」卡片。编译后，插件用同一套目录渲染器预览；站点发布的是这份已经落在 Git 里的 `ui` 块，阅读页不再调用模型。

要单独打磨一块交互时，打开管理后台的组件工作台。工作台一次只放一块：左边写自然语言，按一次生成，由后台调用模型得到结构化 YAML；右边改这份 YAML，预览随输入更新，这次不再调用模型。满意后把围栏复制进稿件。工作台和阅读页用同一套 `UiBlock`。

---

## 2. ChatGPT Intelligent UI 里值得拿走的结构

官方文章里的机制可以收成四句话：

1. 模型按问题决定这段用文字、并排对比、图、表单还是一个当场能用的小工具。文字已经够用时，就只给文字。
2. 界面来自一套原生、可流式出现的组件库。模型决定组件怎么拼，外观由组件库托底。
3. 编译器边生成边处理，完整回答结束前界面就可以出现。
4. 训练目标包含界面是否清楚、有用、完整，以及什么时候不该上交互。

Thesys 在网页端观察到的流水线是：

| 层 | 谁来做 | 产物 |
| --- | --- | --- |
| 描述 | 模型写 DIL：Markdown、JSX 形态的组件标签、`{@body}` 里的 JavaScript | 半截也能切到最后一个完整构造 |
| 编译 | 服务端整段重编译 | 一份 JS 程序 + 一份 JSON 常量表；未知属性被丢掉并记下诊断 |
| 执行 | 隐藏 iframe 里的 Worker。去掉网络、定时器和动态求值，函数不离开沙箱 | 组件树差异，编成 `CREATE` / `SET` 操作 |
| 绘制 | ChatGPT 自己的原生组件 | 约 70 个注册组件，观察样本里出现约 39 个。间距、颜色走设计 token |
| 数据 | 模型写查询或字段引用，服务端回填 | `AsyncImage`、商品芯片、引用。价格不经过模型复述 |
| 逃逸 | `AppBlock` | 自包含 HTML，放进另一个域名的 iframe，编译器不把它译成原生组件 |
| 降级 | `fallbackMarkdown` | 散文留下，交互收成静态文字 |

本地交互（拖滑杆改价格）在 Worker 里算完，不再请求模型。按钮若要继续对话，走 `GenUI.issueNewTurn`，发出的是一条普通用户消息。

这些观察对 Garden 的含义：

- 模型挑选目录，宿主绘制。任意 HTML/CSS 是逃逸口，是少数。
- 描述、编译、绘制分开。读者页面只拿编译结果。
- 每个交互都要有一句离开脚本还能读懂的话。ChatGPT 用 `fallbackMarkdown`，Garden 用 `caption` 加周围散文。
- 滑杆背后是写死的算式，算式在本地跑。
- 目录要有 schema。写错的字段在编译期丢掉或直接失败，并留下诊断。
- 组件库再大，模型也不现造组件。Garden 的目录更小，门槛沿用现有规则：已有原语的实例表达不了，且至少两篇真实文章要复用，才加种类。

Garden 是静态阅读站，下面这些留在 ChatGPT 里：

- 阅读页上的流式重编译、SSE patch、边想边答。
- 模型在页面里执行任意 JavaScript。
- `issueNewTurn`、会发请求的按钮、图像搜索、商品芯片、地图、游戏。
- 约 70 个通用组件，以及 ChatGPT 的视觉语言。
- 读者拖过的滑杆位置跨刷新保留。静态页每次打开都从 `default` 开始。

`AppBlock` 对上 Garden 已经有的 `widget`：同名目录里的自包含 HTML，`sandbox="allow-scripts"`，没有 `allow-same-origin`。目录装得下的交互走 `ui`，装不下的才走这条逃逸口。

---

## 3. 和现在写作方式的差距

现在一条交互要作者或 AI 同时做完三件事：选中五种原语之一、按 [garden-interactive-chart](../.agents/skills/garden-interactive-chart/SKILL.md) 写同名目录里的 HTML、在正文放一段 `widget` 围栏。Typora 里只能看见短 YAML，预览要另开 HTML 或 `make dev`。

这套对「KV 文那种必须手写时序的图」是对的，对日常写作太重。作者记得住「这里想让人拧一下」，记不住 `param-bench` 的文件名和 shell 约定。

缺的是写作入口，是编译步骤，是编辑器里的插入和预览。渲染原语、沙箱和「散文必须自立」继续有效。

---

## 4. 范围

### 要做成

- 正文里可以用 `intent` 围栏写下自然语言想法。围栏里允许列表、数字和公式，不要求组件名。
- skill `garden-intent` 扫描指定稿件里的 `intent`，以及 `ui` 上仍保留的 `intent` 字段。它只做三选一：收成目录模板、收成现有 `widget`、或判断这里散文 / 表格 / Mermaid 已经够用并改回正文。
- 编译结果提交进 Git。阅读页、RSS、搜索都不调用模型。
- `ui` 由站点用原生组件绘制。字段由 schema 约束，算式用第 8 节的表达式语言。
- 未编译的 `intent` 在 `make dev` 里显示成一张想法卡片。`garden check` 和发布把它当成错误，公开站上不出现未编译块。
- Typora、VS Code、Obsidian 各有一个插入入口。三处都能预览未编译的想法卡片；编译后的 `ui` 用同一份预览包绘制。
- 管理后台提供组件工作台：自然语言经一次模型调用变成结构化 YAML；之后只编辑这份 YAML，由同一套渲染器即时绘制。模型密钥只留在后台服务。
- 已有 `widget` 稿件原样可读，不迁移。

### 不做

- 把整篇正文改成 DIL 或 JSX。
- 让模型在 Markdown 或阅读页里写任意 JavaScript、CSS、远程 URL。
- 为单篇文章增加目录种类。
- 阅读页上的对话按钮、测验、投票、登录态、实时推理。
- 要求作者记忆组件清单。插件里的五个入口是口语起步语，菜单上不出现 `param-bench` 这种内部名。
- 把编辑器插件做成发布前提。没有插件时，手打围栏，编译仍由 skill 完成。
- 在阅读页或编辑器插件里调用模型。模型只出现在写作 skill 和后台工作台的「生成初稿」。
- 让工作台自动改稿、自动提交。稿件仍由作者把围栏放进 Markdown。

---

## 5. 三种块

| 块 | 谁写 | 提交进 Git | 读者看见 |
| --- | --- | --- | --- |
| `intent` | 作者 | 只在草稿期 | 本地预览为一张想法卡片；公开构建失败 |
| `ui` | skill 按模板写，作者可改 `caption` 和个别数字 | 是，这是组件的权威副本 | 原生组件 + `caption` |
| `widget` | skill 仅在目录装不下时，按现有图表 skill 写 | 是，同名目录 HTML | 现有沙箱 iframe |

一次编译会删掉对应的 `intent` 围栏，写成一个 `ui` 或一个 `widget`。`intent` 字段把作者的原话原样留下。

重编译规则：

- 「编译这篇的意图块」只处理还没编译的 `intent` 围栏。已经是 `ui` 的块不动。
- 「按意图重编译 `<id>`」以该块 `intent` 字段为唯一输入，重写结构化字段，保留 `id`。
- 作者若只改了滑杆范围或 `caption`，没有要求重编译，skill 不覆盖这些手改。
- 作者同时改了原话和结构化字段，又要求重编译时，以原话为准，并在回复里列出被盖掉的字段。

`id` 在一篇稿内唯一，用小写字母、数字和连字符。`intent` 围栏写在信息串上：` ```intent memory `。漏写时 skill 从判断句取一个短 id，并在回复里说明。

---

## 6. `ui` 语法

围栏语言是 `ui`，正文是 YAML。必填：`id`、`kind`、`caption`、`intent`。`caption` 是一句判断，规则与 `widget` 相同。`intent` 是作者原话，可多行。

体积超出第 7 节上限时，结构化字段挪到同名目录的 `.ui.yaml`，围栏只留指针：

````md
```ui
id: election
kind: stepper
src: ./raft/election.ui.yaml
caption: 任期加一之后，超时的跟随者才会开始拉票。
intent: |
  ……作者原话……
```
````

`src` 的路径规则与 `widget` 相同：只能指向本文同名目录里的 `.ui.yaml`，不能是远程地址，不能指向 `assets/` 或其他文章。`src` 与内联字段同时出现时，`garden check` 报 `ui-src-mixed`。

构建期校验 schema 和表达式，不把 `ui` 改写成 HTML 文件。同名目录里的 `.ui.yaml` 会复制到 `/media/...`，围栏里的 `src` 改成公开路径。`intent` 留在源文件里，阅读页的图注只显示 `caption`。

未知 `kind`、未知字段、类型不对的值，检查失败，页面用 `caption` 加一句错误说明，不留白洞。

---

## 7. 目录

skill 先问 [可交互组件](./interactive-blog-components.md) 第 1 节的那几条局限。对不上，就写成散文、表格、公式或 Mermaid，并删掉意图块。对得上，再选下表。装得下就填数据，不新开种类。

| kind | 作者起步语 | 读者能做什么 | 内联上限，超出则用 `src` |
| --- | --- | --- | --- |
| `stepper` | 让读者停在某一拍 | 上一步 / 下一步，看这一拍的句子 | ≤ 12 步，每步正文 ≤ 280 字 |
| `inspect-grid` | 让读者盯着格子 | 悬停或点一格，读这格的话 | ≤ 8×8 |
| `param-bench` | 让读者拧一个数 | 拖滑杆，看读数或一条曲线 | ≤ 4 个控件，≤ 2 条读数 |
| `compare` | 让读者同时看见两边 | 左右各一块已有原语，或两列静态要点 | 左右各 ≤ 6 条要点；嵌套块只能引用同一篇里的 `id` |
| `trace` | 让读者看现在走到哪 | 高亮当前节点和当前边 | ≤ 9 个节点，≤ 12 条边 |

内联围栏正文超过 80 行时，同样改走 `src`。采样点不进稿件：曲线由渲染器对表达式取样，默认 48 点，上限 96 点。

### 7.1 `param-bench`

```yaml
id: memory
kind: param-bench
caption: ……
intent: |
  ……
controls:
  - id: batch
    label: batch
    min: 1
    max: 32
    step: 1
    default: 1
  - id: seq
    label: 序列长度
    min: 1024
    max: 32768
    default: 4096
    scale: log          # linear 或 log，默认 linear
readout:
  - id: mem
    label: KV 显存
    unit: MiB
    expr: "(2 * 32 * 8 * 128 * seq * batch * 2) / 1048576"
    axis: y             # 省略则只显示数字；y 表示随第一个 scale 无关的控件画线
x: seq                  # 画线时的横轴，必须是某个 control id
```

`min`、`max`、`step`、`default` 是有限数字，`min < max`，`default` 落在闭区间内。`scale: log` 时 `min > 0`。`expr` 里出现的名字必须是本块的 control id。

### 7.2 `stepper`

```yaml
id: prefill
kind: stepper
caption: Prefill 一次写满 K/V；Decode 每步只追加一行。
intent: |
  ……
steps:
  - id: prefill
    title: Prefill
    body: 一次写下全部 K/V。
  - id: decode
    title: Decode
    body: 这一拍只追加一行。
autoplay: false         # 默认 false。true 时仍服从 prefers-reduced-motion
```

每步的 `id` 在块内唯一。需要高亮格子时，步上加可选 `marks`：`{ row, col, tone }`，`tone` 只允许 `new`、`cached`、`waste`。格子本身仍用 `inspect-grid` 的字段写在步里的 `grid` 上；`grid` 超过 8×8 时整块改走 `src`。

### 7.3 `inspect-grid`

```yaml
id: ecb
kind: inspect-grid
caption: ECB 下相同的明文块得到相同的密文块。
intent: |
  ……
columns: [块1, 块2, 块3]
rows:
  - label: 明文
    cells: [A, B, A]
  - label: 密文
    cells: [X, Y, X]
tones:                  # 可选，与 cells 对齐
  - [same, plain, same]
  - [same, plain, same]
note: 重复的 A 加密后仍是重复的 X。
```

`tones` 只允许 `plain`、`same`、`new`、`waste`、`cached`。渲染器负责颜色，稿件里不写色值。

### 7.4 `compare`

```yaml
id: locks
kind: compare
caption: 读多写少时 RwLock 让读者并行；Mutex 始终互斥。
intent: |
  ……
left: { title: Mutex, points: ["同一时刻一个持有者", "写和读都互斥"] }
right: { title: RwLock, points: ["多个读者", "写者独占"] }
```

左右也可以写成 `{ ref: 另一块的 id }`，用来并排两个已经编译的 `ui`。禁止环状引用。`compare` 自己不再长出第三套控件。

### 7.5 `trace`

```yaml
id: tcp
kind: trace
caption: 收到 SYN+ACK 才离开 SYN-SENT。
intent: |
  ……
nodes:
  - { id: closed, label: CLOSED }
  - { id: syn-sent, label: SYN-SENT }
  - { id: established, label: ESTABLISHED }
edges:
  - { id: e1, from: closed, to: syn-sent, label: 主动打开 }
  - { id: e2, from: syn-sent, to: established, label: SYN+ACK }
start: closed
```

节点和边的 `id` 在块内唯一。`from` / `to` / `start` 必须指向已声明的节点。

### 7.6 什么时候改走 `widget`

出现下面任一情况，skill 停用 `ui`，改读图表 skill，写同名目录 HTML 和 `widget` 围栏，并在 `widget` 的 YAML 里加上 `intent` 字段：

- 时序、悬停或动画无法用上述字段表达（例如 KV 文那种逐格浪费动画）。
- 需要 `prefers-reduced-motion` 之外的播放控制，而步进器的上一步 / 下一步不够。
- 作者明确要求「按图表 skill 做成独立 HTML」。

`widget` 构建今天会丢掉未知字段。实现时要让源文件保留 `intent`，阅读页继续只显示 `caption`。搜索已经把围栏正文放进 `toSearchableText`，因此源文件里的 `intent` 和 `caption` 都会进索引。

---

## 8. 表达式

`expr` 是渲染器执行的全部逻辑。文法：

```text
expr     = term (("+" | "-") term)*
term     = unary (("*" | "/") unary)*
unary    = "-" unary | primary
primary  = number | ident | "(" expr ")" | "min" "(" expr "," expr ")" | "max" "(" expr "," expr ")"
ident    = 本块 control id
number   = 十进制有限数字
```

求值用整数或十进制运算，不用 `eval`，不访问属性，不调用除此之外的函数。除以 0、非有限结果，该读数显示「—」，组件其余部分照常绘制。标识符只从当前滑杆取值。

这份求值器是纯函数，放在 `app/lib/ui/expr.mjs`。站点、`garden check` 和编辑器预览包共用它。检查器在构建期用默认值试算一遍，表达式语法错误报 `ui-expr`。

---

## 9. skill

路径：`.agents/skills/garden-intent/SKILL.md`，随现有 `garden skill` 装进站点的 `.agents/skills/`。模板放在该 skill 的 `templates/`，每种 kind 一份：何时使用、字段表、一段意图原文、一份对照 `ui`。模板是说明，schema 以 `app/lib/ui/catalog.mjs` 为准。

触发语：`编译意图`、`编译这篇的意图块`、`按意图重编译 <id>`、`扫描特殊块`。用户必须给出稿件路径。没有路径时只问路径，不扫全库。

对每一个待处理块，按这个顺序：

1. 读 `intent` 原文和周围两个标题的正文，用来判断这件事是否必须动手。
2. 对不上第 7 节的局限：把判断写进正文（散文、表或 Mermaid），删掉意图块，在回复里说明理由。
3. 对得上且字段装得下：按模板写 `ui`。表达式只使用第 8 节的文法。`caption` 摘作者原文里的判断；原文没有判断句时，skill 先补一句给作者看，再写入。
4. 装不下：改走第 7.6 节的 `widget`，并遵守图表 skill 的禁则（无远程脚本、无父页 DOM、无 `allow-same-origin`）。
5. 跑 `npx garden check <稿件>`。失败就改到 `ok` 为 true。schema 报错不靠「再试一次」糊过去。

skill 的回复里列出每块的 `id`、选了哪种 kind、或为什么留在正文里。不顺手改周围散文，除了第 2 步把判断写回去所必需的那几句。

审查 skill 增加一步：稿里有未编译 `intent` 或 `ui` 时，先按本 skill 处理，再进入图表 skill。没有这两类块则跳过。

工作台的模型提示词使用同一份 `templates/`。skill 管一整篇稿里的多块，工作台一次只生成一块。两边的输出都要过 `check-ui.mjs`。

---

## 10. 后台组件工作台

工作台挂在独立管理后台，路由 `/admin/ui`。后台本身需要登录，且已经是服务器，适合调用模型。公开博客仍是 GitHub Pages，页面上没有这个入口。

一块屏幕三栏：自然语言、结构化 YAML、实时预览。窄屏改成上下叠放。三栏都只服务当前这一块，不打开整篇稿。

### 10.1 自然语言生成初稿

作者在左栏写下和第 1 节相同的话，按「生成初稿」。浏览器把这段文字 `POST` 到 `/api/admin/ui/draft`。路由先走现有的 `requireAdminApi()`。

服务端用 OpenAI 兼容接口调用模型。密钥和地址放在后台环境变量，不进浏览器、不进公开构建：

| 变量 | 作用 |
| --- | --- |
| `UI_MODEL_BASE_URL` | 接口根地址 |
| `UI_MODEL_API_KEY` | 只存在后台进程里的密钥 |
| `UI_MODEL_NAME` | 模型名 |

系统提示词带上目录 schema 和 `templates/`，要求模型只输出一块 `ui` YAML，`intent` 原样抄回作者的话。返回体先过 `check-ui.mjs`。通过后，中栏填入 YAML，右栏用 `UiBlock` 画出来。没通过时，中栏仍放入模型原文，右栏停在上一份合法预览，并列出 `ui-kind`、`ui-expr` 这些错误码。作者接着在中栏改，改的过程不再请求模型。

未配置上述变量时，左栏按钮说明后台还没接上模型。中栏和右栏继续可用，作者可以贴入已有 YAML 直接看。

再次生成会盖住中栏。中栏在上次生成之后有手改时，先确认再覆盖。左栏原文一直留着，生成不会改它。

### 10.2 手改结构化语言

中栏是这份 YAML 的编辑器。每次输入后在浏览器里解析、跑同一套 schema 和表达式检查，合法就立刻重绘右栏。这条路径没有网络请求。

YAML 还没写完或检查失败时，右栏保持上一份合法组件，旁边显示错误码和字段路径。不把半截输入画成空白。

作者在中栏改的是 `kind`、控件、步骤、表达式和 `caption`。`intent` 以左栏为准：复制围栏时由工作台写入，避免两处各改各的。左栏在上次生成之后有改动、中栏还是旧结果时，顶上提示「自然语言已改，当前结构化结果来自上次生成」。

右栏拖滑杆只改变预览里的本地状态，不写回 YAML，也不调用模型。刷新工作台后滑杆回到 `default`。

### 10.3 放回稿件

工作台不读写 Git。作者点「复制围栏」，得到一段可直接贴进 Markdown 的 `ui` 块：结构化字段来自中栏，`intent` 来自左栏当前文字。粘贴之后的发布路径与第 5 节相同，阅读页使用同一套 `UiBlock`。

工作台会话停在浏览器里。刷新即丢失。需要留底时，以稿件里的围栏为准。

### 10.4 实现位置

| 文件 | 职责 |
| --- | --- |
| `app/admin/ui/page.tsx` | 三栏工作台页面，沿用后台登录 |
| `app/components/UiStudio.tsx` | 左栏、中栏、复制和覆盖确认 |
| `app/api/admin/ui/draft/route.ts` | 校验登录、调用模型、用 `check-ui` 过滤返回 |
| `app/components/UiBlock.tsx` | 右栏和阅读页共用的绘制 |

草稿接口按会话限流。请求体只有自然语言字符串，响应体是 YAML 文本和错误码列表，不含密钥。

---

## 11. 站点实现

目录和求值器放在引擎里，检查脚本用 Node 直接 import，避免和 React 组件缠在一起。

| 文件 | 职责 |
| --- | --- |
| `app/lib/ui/catalog.mjs` | kind、必填字段、上限、tone 枚举。导出可被 `garden ui-schema` 打成 JSON |
| `app/lib/ui/expr.mjs` | 解析与求值 |
| `app/lib/ui/check-ui.mjs` | 给 `check-post.mjs` 和构建脚本共用的校验 |
| `app/components/UiBlock.tsx` | 按 `kind` 绘制。控件用原生 `input` / `button` |
| `app/components/MarkdownArticle.tsx` | `language-ui` 分流到 `UiBlock`，与 mermaid / embed / widget 并列 |
| `scripts/check-post.mjs` | 识别 `intent` 与 `ui` |
| `scripts/build-content.mjs` | 校验 `ui`，复制 `.ui.yaml`，改写 `src` |
| `bin/garden.mjs` | `garden ui-schema` 把目录 JSON 打到 stdout，供插件固定 schema |
| `tests/ui-expr.test.mjs` | 表达式的优先级、除零、非法标识符、`min` / `max` |
| `tests/ui-catalog.test.mjs` | 上限、`default` 越界、环状 `compare`、`src` 路径 |

测试只覆盖求值器和 schema。它们是纯逻辑。React 组件和编辑器插件靠预览和现有渲染测试，不为组件快照补单测。

检查错误码：

| code | 条件 |
| --- | --- |
| `intent-uncompiled` | 公开检查时仍有 `intent` 围栏 |
| `ui-yaml` | 围栏不是 YAML 对象 |
| `ui-kind` | `kind` 不在目录中 |
| `ui-caption` / `ui-intent` / `ui-id` | 缺字段，或 `id` 重复、字符不合法 |
| `ui-expr` | 表达式语法错、名字不是控件、试算得到非有限数以外的异常 |
| `ui-limit` | 超出第 7 节上限且没有合法 `src` |
| `ui-src` | 路径越出同名目录，或不是 `.ui.yaml` |
| `ui-src-mixed` | 指针和内联字段同时存在 |
| `ui-ref` | `compare` 引用了不存在的 `id` 或成环 |

`CONTENT_INCLUDE_DRAFTS=1 make dev` 仍渲染未编译 `intent`：卡片标题用「想法」，正文是围栏原文，角标写「未编译」。发布用的 `garden check` 对同一块返回 `intent-uncompiled`。`make update` 已经会先检查，因此这条错误挡得住公开构建。

降级：

| 通道 | `ui` | 未编译 `intent` |
| --- | --- | --- |
| 正常网页 | 原生组件 + `caption` | 不进入公开构建 |
| `prefers-reduced-motion` | `autoplay` 无效，停在第一步或默认值 | — |
| 无脚本 / RSS | `caption` | — |
| 搜索 | 围栏正文，含 `caption` 与 `intent` | 草稿索引含原文 |
| 坏掉的块 | `caption` + 错误句 | 想法卡片 + 错误句 |

视觉用站点现有纸面 token，和 `embed` 的 figure 对齐。组件不引入第二套颜色。

---

## 12. 编辑器插件

三端共用一个预览包 `editors/preview/`：读 `garden ui-schema` 的 JSON，内嵌同一份 `expr.mjs` 的浏览器构建，只绘制目录内的 kind。`widget` 在插件里显示文件名和 `caption`，并提供「在浏览器中打开」；插件不执行任意 HTML。

插入命令在光标处写入：

````md
```intent
```
````

可选起步语五条，对应第 7 节的五行，写进围栏正文的第一句。作者可以整段删掉重写。快捷键三端都用可改的默认值，文档里写 `Ctrl+Alt+I` / `Cmd+Alt+I`。

预览分两档：

1. `intent`：想法卡片，原文可复制，角标「未编译」。
2. `ui`：预览包绘制。拖滑杆只在本地求值。

插件不内置模型 API，也不替作者调用补全。编译仍然是作者在 Cursor / Codex 里触发 skill。VS Code 命令「Garden: 编译意图」只把固定提示词和当前文件路径放进剪贴板或编辑器的 AI 聊天（若宿主提供这种入口），请求文本是：「编译这篇的意图块：`<path>`」。

### 12.1 Obsidian

官方 API 足够完成两档预览。

- `registerMarkdownCodeBlockProcessor("intent")` 画想法卡片。
- `registerMarkdownCodeBlockProcessor("ui")` 把围栏交给预览包。阅读视图和实时预览都会走到这里；源码模式仍是 YAML。
- 命令与快捷键插入围栏。
- 插件 id：`garden-intent`。随 Garden 仓库放在 `editors/obsidian/`，用 BRAT 或手动安装。先不发社区商店。

本地 `.ui.yaml` 由插件按 `src` 读取后交给预览包。路径越出笔记所在目录时，显示 `caption` 和错误句。

### 12.2 VS Code

用官方扩展点，Cursor 打开同一仓库时同样生效。

- `contributes.snippets` 插入 `intent` 围栏。
- `contributes.commands` 提供插入和「复制编译提示词」。
- `contributes.markdown.markdownItPlugins` 在内置 Markdown 预览里渲染两档。预览包打成扩展内的单个脚本。
- 扩展目录：`editors/vscode/`。发布可以晚于引擎；本地用工作区推荐扩展即可。

内置预览对本地文件 iframe 限制多，所以 `ui` 不走 iframe，直接跑预览包。

### 12.3 Typora

Typora 没有官方插件 API。中文作者实际使用的是 [obgnail/typora_plugin](https://github.com/obgnail/typora_plugin)（截至 2026-10-09，仍在更新，星数远高于 typora-community-plugin）。Garden 的 Typora 插件做成它的 custom plugin：一个可复制进 `plugin/custom/plugins/` 的目录，外加一段 TOML 说明。

能稳定做到的：

- 右键和快捷键插入 `intent` 围栏。
- 用它的 Markdown postprocessor，在预览里把 `intent` 画成想法卡片。
- 围栏按钮调用预览包，绘制已编译的 `ui`。数据来自围栏 YAML；`src` 指向的文件用 Typora 在桌面端提供的文件读取能力打开。

做不到、也不承诺的：

- 不修改 Typora 安装包，不依赖未文档化的内部渲染器版本。
- Typora 升级导致 custom plugin 失效时，作者仍能看见围栏原文。预览退回 `make dev` 或直接打开站点。
- 不在 Typora 里执行 `widget` HTML。

安装文档写进 `editors/typora/README.md`：先装 typora_plugin，再把 Garden 的 custom plugin 拷进去，重载。macOS 上 typora_plugin 的 Node 能力比 Windows / Linux 窄；文件读取失败时，`src` 形式的块只显示 `caption` 和路径。

### 12.4 插件和引擎的版本

`editors/preview/schema.json` 由 `garden ui-schema` 生成并提交。预览包拒绝绘制 schema 版本高于自己的 `ui`。引擎给目录加字段时升 schema 版本；插件未更新则显示 `caption` 加「预览需要更新 Garden 编辑器插件」。阅读页仍按新引擎渲染，避免插件把发布卡住。

---

## 13. 实现顺序

### 阶段 1：稿件格式和站点

先让一条 `intent` 能在站点里变成可交互的参数台，并被检查挡住未编译发布。

1. `catalog.mjs`、`expr.mjs`、`check-ui.mjs` 和两组测试。
2. `check-post.mjs`、`build-content.mjs` 接入。`widget` 源文件保留 `intent` 字段。
3. `UiBlock` 先做 `param-bench` 和 `stepper`。另外三种 kind 在检查器里接受，渲染上先显示 `caption` 加「这一类即将绘出」，避免半套 schema。
4. skill 和五份模板。这一阶段 skill 可以写出全部五种 YAML；页面上尚未绘制的三种，skill 在回复里告诉作者去 `make dev` 只能看见说明。
5. 用 `understand-kv-cache` 的显存曲线做一篇示范：意图原文、编译结果、`caption` 与无脚本降级。不改那篇已经存在的 `widget` 演示，新段落用 `ui`。
6. `/admin/ui` 工作台：中栏手改 YAML 即时重绘；配置了模型变量后，左栏可以生成初稿。右栏使用步骤 3 的 `UiBlock`。

阶段 1 结束时，作者用手打围栏、或在工作台里生成并复制围栏，都能走完流程。工作台是打磨单块组件的地方，所以和第一种可绘制的 kind 一起落地。

### 阶段 2：目录补齐

7. 绘出 `inspect-grid`、`compare`、`trace`。工作台右栏随之能画这三种。
8. 超限数据走 `.ui.yaml`。
9. 审查 skill 接入第 9 节的顺序。
10. 文档入口写进 [内容编写](./content-authoring.md) 和 [文档目录](./README.md)。

### 阶段 3：编辑器

schema 在阶段 2 冻结后再做插件，避免预览包跟着字段变。

11. `editors/preview/` 与 `schema.json`。
12. Obsidian、VS Code。这两端用官方 API，先于 Typora。
13. Typora custom plugin，范围只包括第 12.3 节写明能稳定做到的部分。

每一阶段都先提交可检查的稿件格式，再补预览。插件缺失时，阶段 1 的写法仍然成立。

---

## 14. 验收

阶段 1：

- 一篇稿只含第 1 节那种 `intent`。`garden check` 返回 `intent-uncompiled`。
- `make dev` 把该块画成想法卡片，周围正文照常。
- 对 skill 说「编译这篇的意图块」后，围栏变成合法 `param-bench`，`intent` 字段与原文一致，`garden check` 通过。
- 页面上拖 batch，读数按表达式变化。关脚本时看得到 `caption`。
- 表达式写成 `eval(...)` 或未声明的名字时，检查失败，页面不是白块。
- 旧的 `widget` 稿检查和渲染与改动前一致。
- 工作台中栏改 `default` 或表达式后，右栏在不发网络请求的情况下更新读数。YAML 不合法时右栏留着上一份合法组件，并显示错误码。
- 配置了模型变量时，左栏一段自然语言生成一份能过 `check-ui` 的 YAML，右栏画出对应组件。未配置时，中栏贴入 YAML 仍能预览。
- 复制出的围栏贴进稿件后，阅读页和工作台右栏的默认读数一致。

阶段 3 再加：

- 三端都能插入空 `intent`，未装模型也能看见想法卡片。
- Obsidian 与 VS Code 对同一份 `param-bench` 的默认读数一致，并与网页一致。
- Typora 在 typora_plugin 可用时能插入并预览 `ui`；插件失效时围栏原文仍在。

---

## 15. 风险

- **skill 选错 kind。** 用模板里的「何时使用」和检查器上限挡住。选错时作者改 `intent` 再重编译，手改过的字段会在回复里被点名。
- **YAML 对作者变吵。** 内联上限和 `src` 就是为了把长数据请出正文。作者日常看的是 `intent` 原文和 `caption`。
- **Typora 插件随宿主升级失效。** 插件是增强，围栏是正文。失效后退回卡片无法绘制，源稿仍可编译、仍可发布。
- **目录膨胀。** 新 kind 的门槛写在第 2 节末尾，和现有图表文档同一条。地图、测验、自由绘图不进目录。
- **逆向细节过时。** 第 2 节的 DIL 结构若与以后的公开文档不一致，以公开文档修正描述。Garden 的围栏、目录和表达式不依赖 DIL 兼容。
- **模型密钥。** `UI_MODEL_API_KEY` 只放在后台环境变量里，和现有的 OAuth、PAT、OSS 密钥同一边界。公开构建和编辑器插件都不读取它。
- **生成结果和手改互相覆盖。** 再次生成前，中栏有手改就必须确认。复制围栏时 `intent` 取左栏当前文字，结构化字段取中栏，两边以复制出去的那一版为准。
