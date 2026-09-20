# garden-blog 可交互组件设计

Christy Jacob 的 [KV Caching](https://www.christyjacob.dev/blog/kv-caching) 证明一件事：有些机制只靠公式和 Mermaid 讲不透，读者得自己走一步、拧一下旋钮。那三个 widget（自回归浪费动画、Prefill/Decode 步进、显存曲线）只是火花，不是产品范围。先行调研见 [kv-caching-presentation.md](./kv-caching-presentation.md)。

本文从 **garden-blog 现有文章对读者的具体限制** 出发，收成一小套原语，并规定作者在 Typora 里怎么嵌入——复杂度尽量低到「会写 `embed` 就会写」。设计，不实现。

约束先说死：内容仍是 Typora 可预览的 Markdown；继续走围栏语言注册表（已有 `mermaid`、`embed`）；默认管道不加 MDX。Garden 是阅读系统（封面、主题、目录、字数、搜索、RSS、浅色纸面），不是演示站。组件跟站点走，不跟参考文的暗色电影感走。五种 `kind` 的完整作者稿、成页示意与无脚本降级见 [widget-kind-examples.md](./widget-kind-examples.md)。

---

## 1. 传统静态 blog 对读者的具体局限

这些不是「不够互动」的口号。每一条都能在现有稿子里找到：读者必须在脑子里当虚拟机，而页面只给一张照片。

### 1.1 过程被拍成一张图

Prefill → Decode、反向传播的「从后往前分锅」、Raft 选举、Go GPM 调度循环、GC 三色标记、Mutex 获取/释放，都是 **随时间变的状态**。现有手段是一张 Mermaid、一张 OSS 截图，或一段「第一步 / 第二步」散文。读者不能停在第 3 步，也不能问「再走一格，哪一行是新算的」。

`understand-kv-cache` 里的 `Prompt → Prefill → KV Cache ⇄ Decode` 把拓扑讲清了，但讲不清「这一步 Q 缩成 1 行、K/V 只追加一行」。`back-propagation` 用流水线比喻把四步说全了，读者仍无法按步看见误差从哪一层传回。七百行的 Raft 译文尤其明显：目录能跳到「领导选举」，不能让选举发生。

### 1.2 参数是死例子

公式是活的，页面上的数字是死的。KV 显存 `2 × L × H × d_h × N × B × sizeof`、IEEE-754 的 `0.1+0.2`、学习率 warmup 步数、GQA 的 KV 头数，文章各给一组作者算好的结果。读者把 batch 改成 8、序列改成 32K，只能自己掏计算器。`guide-to-lr-warmup-cosine-annealing-gradient-clipping` 的曲线是一张图；`floating-point-number` 的 Go 输出是贴死的 `false` / `0.30000000000000004`。

### 1.3 二维结构被压成表格或图片

Attention 分数、KV cache 逐行增长、InnoDB 按页管理的锁 bitmap、ECB 重复明文块，本质是格子。Markdown 表格不能标「这一格是重复计算」；加密模式文里的「ECB 企鹅」只能靠读者去想象或另开一张图。鼠标移上去，格子不会说话。

### 1.4 对比只能上下翻

Naive vs 缓存、MHA vs GQA、Mutex vs RwLock vs SpinLock、ECB vs CBC vs GCM，现有写法是两段代码或两张图叠着。读者工作记忆装不下「左边红格是浪费、右边只有一列新投影」。Christy 文末步的分屏之所以有效，是因为它强迫同一时刻看见两边。

### 1.5 「如果」无法试

CBC「坏一块，后面全坏」、Raft leader 宕、间隙锁下的幻读，散文只能写条件句。读者不能拨一个开关看传播。静态 blog 没有故障注入，只有作者替你演过的那一次。

### 1.6 代码是照片，不是实验

高亮、语言标记、图表/Code 切换已经够用。缺的是「改一个字面量，看输出变不变」。浮点、内存序、交叉熵，读者改不了输入。这不构成「在页面上跑任意语言」的理由——任意执行会把静态站和作者心智一起炸掉。缺的是 **声明好的输入 → 声明好的输出**。

### 1.7 导航解决位置，不解决理解

站点已有：粘滞目录、搜索高亮、callout、脚注、上一篇/下一篇、专栏篇目。它们帮读者找到段落。它们不帮读者走完一个状态机。长文（Raft、GPM、锁）的失败模式不是「找不到标题」，是「读完仍无法复述第 4 拍发生了什么」。

### 1.8 无脚本通道会丢掉交互层

搜索把围栏拆成内部文本（`toSearchableText`）；RSS、纯 HTML、关 JS 的读者、Typora 预览，都看不到客户端 SVG。若机制只活在 widget 里，订阅者读到空块，站内搜索也搜不到那句判断。散文必须自立；组件是放大器，不是唯一讲解。

---

## 2. 原语调色板（对局限，不对文章）

只登记 **五种** `kind`。Christy 的三个 widget 是前三种原语的组合实例，不是三种专用玩具。复刻参考文交互时，行为必须与原文 100% 一致（控件、时序、计数、悬停、末步分屏、坐标轴、系列、滑杆），允许改的只有颜色、字体和 Garden 浅色纸面；完整行为副本见 [widget-kind-examples.md 对照节](./widget-kind-examples.md#对照christy-kv-caching-的三个-widget)。新文章先问「卡在哪条局限」，再选原语；不要为 KV、Raft、浮点各做一套。

| 原语 | `kind` | 对哪条局限 | 现有稿可复用处 | Christy 实例 |
| --- | --- | --- | --- | --- |
| 步进器 | `stepper` | 1.1 过程是照片；可带 1.5 的开关 | Prefill/Decode、反向传播四步、Raft 选举、GC 三色、Mutex 状态 | A 自动播放；B 手动 1–5 步 |
| 检视格 | `inspect-grid` | 1.3 二维被压扁 | Attention 矩阵、KV 行追加、页锁 bitmap、ECB 块模式 | A 的绿/红格子；B 的 Q/K/V 行 |
| 参数台 | `param-bench` | 1.2 参数是死例子 | KV 显存、浮点位宽、LR warmup、GQA 压缩比 | C 的 log 轴曲线 + batch 滑杆 |
| 对照台 | `compare` | 1.4 对比靠翻页 | Naive vs cache、MHA vs GQA、ECB/CBC/GCM、三种锁 | B 末步 Without / With |
| 轨迹 | `trace` | 1.1 的图状变体 | Raft 角色、GPM 的 G/P/M、TCP 状态、RwLock 读写者 | 无（参考文用矩阵，不用图） |

组合规则，避免第五十个组件：

- `stepper` 的每一步可以挂一块 `grid`（高亮行/列/单元格）。A/B 不必单独立 `autoregressive-waste`。
- `compare` 只并排两个已有原语（两个 stepper、两块 grid、两个数字读数），自己不长新交互。
- `faults` 是 stepper / trace 上的布尔输入，不是第六个 kind。拨开后走同一份 `steps` 的另一列高亮。
- `param-bench` 的视图可以是数字、条、或折线；滑杆绑定的是声明过的输入，不是任意 JS。

现有能力继续用，不重复造：

| 已有 | 继续承担 | 不要用 widget 替代 |
| --- | --- | --- |
| Mermaid | 静态拓扑、一次性能说清的流向 | 需要「当前步」高亮之前，先写 Mermaid |
| KaTeX | 符号与公式 | 公式旁的数字变化用参数台，不要另做公式引擎 |
| `embed` | 外部视频/卡片 | 不在 widget 里塞 iframe |
| Callout / 脚注 / 目录 | 语义提示与跳转 | 不做测验、投票、进度条游戏 |

不做进调色板的（厨房水槽）：测验、投票、评论挂件、3D、Jupyter、实时大模型、作者自定义 JS、通用 tabs 组件、滚动长片。代码窗红绿灯与行号是排版，不是原语，见第 4 节。

---

## 3. 作者如何编辑和嵌入

### 3.1 心智模型

三种围栏，平级，作者只声明数据：

| 围栏 | 作者给什么 | 站点做什么 |
| --- | --- | --- |
| `mermaid` | 图语法 | 画图，并提供「图表 / Code」 |
| `embed` | URL + 可选摘要 | 选播放器或卡片 |
| `widget` | `kind` + 教学数据 + 必填说明 | 选已注册原语，注水交互 |

一句话：**作者不写组件。** 不写 JSX、不写 SVG、不写动画时长、不写颜色、不写无障碍属性。外观跟 `--font-mono` 和站点强调色，跟 `embed` 一样用 `<figure>` + 说明。

Typora 里 `widget` 就是一块 YAML 代码——和今天的 `embed` 一样可读、可改、可复制。这是刻意的：预览不一致比语法漂亮更伤作者。

### 3.2 语法

共用外壳，和 `embed` 同形：围栏语言 + YAML。必填只有 `kind` 与 `caption`。

````md
```widget
kind: stepper
mode: manual
caption: Prefill 一次写满 K/V；Decode 每步只追加一行。
steps:
  - label: Prefill
    note: 提示词并行算完 Q、K、V。
    grid:
      rows: [I, love, ML, "!"]
      cols: [Q, K, V]
      cells: all-new
  - label: Decode
    note: Q 缩成 1×d，K/V 从缓存取并追加。
    grid:
      append: [It]
      cells: new-last-row
```
````

参数台同形，输入与输出都写在 YAML 里，不写脚本：

````md
```widget
kind: param-bench
caption: 70B 在长上下文下，KV 显存会先于权重撑满一张卡。
inputs:
  - id: seq
    label: 序列长度
    min: 512
    max: 131072
    default: 4096
    scale: log
  - id: batch
    label: 批量
    min: 1
    max: 32
    default: 1
outputs:
  - id: mem_gb
    label: KV 显存 (GB)
    formula: 2 * layers * heads * dim * seq * batch * 2 / (1024^3)
constants:
  layers: 80
  heads: 64
  dim: 128
view: line
series:
  - label: 70B fp16
refs:
  - { label: RTX 4090, y: 24 }
```
````

对照台只引用，不复制交互：

````md
```widget
kind: compare
caption: 无缓存每步重投影全部过去 token；有缓存只投影新 token。
left:
  kind: inspect-grid
  title: Without cache
  ...
right:
  kind: inspect-grid
  title: With cache
  ...
```
````

`caption` 是给搜索、RSS、无 JS、Typora 的那句话。它必须是判断，不能是「见下图」。搜索会拆围栏；没有 `caption`，这条机制从索引里蒸发。

### 3.3 怎样把复杂度压住

对作者只保留三件事：选 `kind`、填教学数据、写一句 `caption`。其余全是站点的事。

**要作者写的**

- 步骤的标签和一句 `note`（读者停在这一拍时读什么）
- 格子的行列名、哪一格是 new / waste / cached
- 滑杆的名字、范围、默认值
- 输出：白名单公式（`+ - * / ()`、已声明的 id 与常数）或显式点列 / 查找表
- 对照两侧的标题

**不要作者写的**

- React / MDX / 任意 JS / 内联样式 / SVG path
- 绿 `#4ade80`、300ms、Geist、`not-prose my-8`、viewBox
- `aria-*`、`prefers-reduced-motion`（站点生成）
- 降级 HTML（由 `caption` + 数据自动生成表格）
- 文件名装饰、红绿灯、行号
- 「请在这里计算 Llama 70B」这类运行时模型逻辑——常数写进 YAML

**构建期替作者挡掉的**

- 未知 `kind`、缺 `caption`、YAML 坏了：与 `embed` 一样给出可读错误，页面上永不留空白洞
- 公式只跑白名单算术；出现未知标识符则构建失败
- `steps` 过多或格子过大：给上限（建议步进 ≤ 12、单格 ≤ 32×32），超出则拒收并提示拆开

**降级，按通道**

| 通道 | 看见什么 |
| --- | --- |
| 正常网页 | 注水后的原语 |
| `prefers-reduced-motion` | 停在第一步或中间步，不自动播放 |
| 无 JS / 静态爬虫 | `caption` + 由 steps/inputs 生成的表格 |
| Typora | YAML 原文，作者能改数据 |
| RSS / 搜索 | `caption` 与 YAML 里的 label/note 纯文本 |
| 未知 `kind` | `caption` + 当代码展示的 YAML，永不空白 |

周围散文必须能单独读懂。组件坏了或被关掉，文章仍是一篇完整技术文。这与 `embed` 不抓 Open Graph、原站挂了卡片仍可读，是同一条原则。

### 3.4 为什么坚持围栏、不默认上 MDX

MDX 能嵌三个现成 React 组件，但会拆开现在这条作者链路：

- Typora 预览 JSX 是噪声，作者无法在编辑器里确认「读者将看到什么数据」
- `build-content.mjs`、`extractHeadings`、`toSearchableText`、callout 预处理都假设一份 Markdown
- Git 仓库会从「可审的 YAML」变成「可执行的组件树」，复杂度从作者侧搬到每次改稿

已有注册表足够：`MarkdownArticle` 对 `language-mermaid` / `language-embed` 分流。`widget` 是第三个分支，不是新架构。只有当 YAML + 已注册 `kind` 连续表达不了、并且这种文章会反复出现时，才允许 **单篇** `.mdx` 逃生口；默认语料仍是 `.md`。现在没有这个理由。

### 3.5 作者工作流（不改现有习惯）

1. `make new`，Typora 写正文、公式、Mermaid，和现在一样。
2. 需要读者动手时，贴一块 `widget`，从 [widget-kind-examples.md](./widget-kind-examples.md) 抄最近的同类例子，改数据。
3. `CONTENT_INCLUDE_DRAFTS=1 make dev` 看注水结果；YAML 写错时看和 `embed` 同类的错误句。
4. 不在管理后台里可视化搭 widget。后台继续只管随想与置顶；长文仍是 Typora + Git。

先做的作者文档只加一节「第三种围栏」，抄三个最小例子（步进、参数台、对照）。不写组件 API，不写主题 token。

---

## 4. 先做、延后、永不做

### 先做：平台 + 两个原语

平台必须先于任何漂亮动画。没有它，每加一篇演示文都会长出一页硬编码。

1. **`widget` 围栏**：`CodeBlock` 分流、构建校验、`caption` 必填、搜索保留说明、未知 kind 降级、无脚本表格。视觉跟 `embed` 的 figure，不跟参考文的暗色卡片。
2. **`stepper`（autoplay | manual）**，步骤可挂一层 grid。一块原语同时覆盖 Christy 的 A 与 B，以及反向传播、Raft 选举、GC。自动播放必须可关，并尊重减少动态。
3. **`param-bench`**：滑杆 + 白名单公式或点列 + 数字/折线。覆盖显存墙、LR 曲线、GQA 比例。参考线用声明的 `refs`，不要写死 4090。

第一篇演示用 garden 模板的 `understand-kv-cache`：保留现有 Mermaid 总览，用 `stepper` + `param-bench` 复现那三个效果。**不要**登记 `autoregressive-waste` 这种文章私有 kind。

### 紧接着（平台稳定、第一篇演示能读之后）

4. **独立 `inspect-grid`**：当格子不是某一步的附件，而是主角（ECB 块、锁 bitmap、权重矩阵）。
5. **`compare`**：当「并排看」成为第三、第四篇文章的常态。在此之前，用两个相邻 stepper 也能凑合。

### 延后

- **`trace`**：Mermaid 已能画拓扑。等到「当前节点 + 当前边」成为第三种刚需（GPM、Raft 角色）再做，避免和 Mermaid 抢职责。
- **`faults` 字段**：先用手写两份 steps（正常 / 故障）验证需求，再收成开关。
- **代码窗装饰**（行号、红绿灯、`filename=`）：可选、默认关；复制按钮比红绿灯有用。不阻塞 widget。
- **`layout: essay`**：窄栏、藏目录。CSS / front matter，不是 Markdown。全站不为此改成暗色。
- **代码对照 tabs**：对 naive vs cached 的 Python 有用，对交互原语不是前置。
- **字面量例题**（改一个数看输出）：仍是参数台的特化，不是解释器。

### 永不做

- 默认把每篇编成 MDX，或从 Markdown 跑 JSX
- 作者提供任意 JS、任意 iframe、任意 CDN 脚本
- 服务端或浏览器执行读者/作者的通用代码
- 移植 Christy 的组件源码、暗色皮肤、电影感封面逻辑
- 为单篇 KV 文写死一个路由或一个页面组件
- 测验、积分、游戏化、WebGL、实时推理、需要登录态的 widget
- 交互作为唯一讲解：无 `caption`、无周围自立散文
- 为了「完整」预置五十个 kind；新 kind 的门槛是「已有原语的 YAML 连续表达不了，且至少两篇真实文章要复用」

---

## 5. 怎么判断一块 widget 该不该写

作者（或日后实现者）用四问挡需求膨胀：

1. 读者卡在第 1 节的哪一条？卡不住，就写散文或 Mermaid。
2. 五种 `kind` 里哪一个装得下？装得下，就改数据，不新开 kind。
3. `caption` 能否让不开 JS 的人读懂结论？不能，先改说明，再改交互。
4. Typora 里这块 YAML 作者自己看得懂吗？看不懂，数据模型就过重。

通过这四问，KV 文是步进器 + 参数台；浮点文是参数台；加密模式是检视格 + 对照；Raft 是步进器（日后才是轨迹）。调色板保持小，作者链路保持和今天写 `embed` 一样短。
