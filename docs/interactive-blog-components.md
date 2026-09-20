# garden-blog 可交互组件设计

Christy Jacob 的 [KV Caching](https://www.christyjacob.dev/blog/kv-caching) 证明一件事：有些机制只靠公式和 Mermaid 讲不透，读者得自己走一步、拧一下旋钮。那三个 widget（自回归浪费动画、Prefill/Decode 步进、显存曲线）只是火花，不是产品范围。先行调研见 [kv-caching-presentation.md](./kv-caching-presentation.md)。

本文从 **garden-blog 现有文章对读者的具体限制** 出发，收成一小套原语，并规定作者怎么把图表嵌进 Typora 稿——**复杂交互不写进 Markdown**。完整例子见 [widget-kind-examples.md](./widget-kind-examples.md)；写图表时先读仓库里的 [garden-interactive-chart skill](../.agents/skills/garden-interactive-chart/SKILL.md)。

约束先说死：正文仍是 Typora 可预览的 Markdown；继续走围栏语言注册表（已有 `mermaid`、`embed`，加上 `widget`）；默认管道不加 MDX。Garden 是阅读系统（封面、主题、目录、字数、搜索、RSS、浅色纸面），不是演示站。组件跟站点走，不跟参考文的暗色电影感走。

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

搜索把围栏拆成内部文本（`toSearchableText`）；RSS、纯 HTML、关 JS 的读者、Typora 预览，都看不到 iframe 里的 SVG。若机制只活在图表里，订阅者读到空块，站内搜索也搜不到那句判断。散文必须自立；组件是放大器，不是唯一讲解。

---

## 2. 原语调色板（对局限，不对文章）

只登记 **五种** 图表类型。它们是 skill 里的模板，不是站点要注水的 YAML schema。Christy 的三个 widget 是前三种原语的组合实例，不是三种专用玩具。复刻参考文交互时，行为必须与原文 100% 一致（控件、时序、计数、悬停、末步分屏、坐标轴、系列、滑杆），允许改的只有颜色、字体和 Garden 浅色纸面；完整行为副本见 [widget-kind-examples.md 对照节](./widget-kind-examples.md#对照christy-kv-caching-的三个-widget)。新文章先问「卡在哪条局限」，再选原语；不要为 KV、Raft、浮点各做一套。

| 原语 | 文件名习惯 | 对哪条局限 | 现有稿可复用处 | Christy 实例 |
| --- | --- | --- | --- | --- |
| 步进器 | `*-stepper.html` | 1.1 过程是照片；可带 1.5 的开关 | Prefill/Decode、反向传播四步、Raft 选举、GC 三色、Mutex 状态 | A 自动播放；B 手动 1–5 步 |
| 检视格 | `*-grid.html` | 1.3 二维被压扁 | Attention 矩阵、KV 行追加、页锁 bitmap、ECB 块模式 | A 的绿/红格子；B 的 Q/K/V 行 |
| 参数台 | `*-bench.html` | 1.2 参数是死例子 | KV 显存、浮点位宽、LR warmup、GQA 压缩比 | C 的 log 轴曲线 + batch 滑杆 |
| 对照台 | `*-compare.html` | 1.4 对比靠翻页 | Naive vs cache、MHA vs GQA、ECB/CBC/GCM、三种锁 | B 末步 Without / With |
| 轨迹 | `*-trace.html` | 1.1 的图状变体 | Raft 角色、GPM 的 G/P/M、TCP 状态、RwLock 读写者 | 无（参考文用矩阵，不用图） |

组合规则，避免第五十个组件：

- 步进器的每一步可以挂一块格子（高亮行/列/单元格）。A/B 不必再做成 `autoregressive-waste.html` 这种文章私有类型。
- 对照台只并排两个已有原语，自己不长新交互。
- 故障开关是步进 / 轨迹上的布尔输入，不是第六个类型。
- 参数台的视图可以是数字、条、或折线；滑杆绑定的是写死在图表里的输入，不是任意远程脚本。

现有能力继续用，不重复造：

| 已有 | 继续承担 | 不要用 widget 替代 |
| --- | --- | --- |
| Mermaid | 静态拓扑、一次性能说清的流向 | 需要「当前步」高亮之前，先写 Mermaid |
| KaTeX | 符号与公式 | 公式旁的数字变化用参数台，不要另做公式引擎 |
| `embed` | 外部视频/卡片 | 不在图表里塞第三方 iframe |
| Callout / 脚注 / 目录 | 语义提示与跳转 | 不做测验、投票、进度条游戏 |

不做进调色板的（厨房水槽）：测验、投票、评论挂件、3D、Jupyter、实时大模型、远程 CDN 脚本、通用 tabs 组件、滚动长片。代码窗红绿灯与行号是排版，不是原语，见第 4 节。

---

## 3. 作者如何编辑和嵌入

### 3.1 心智模型

可交互图表太密，不该摊在 Markdown 里。一篇稿对应一个 **同名目录**，目录里每一份 `.html` 是一张可单独打开的图表；正文只用一段短围栏把它嵌进去。

以 `content/posts/understand-kv-cache.md` 为例：

```text
content/posts/understand-kv-cache.md
content/posts/understand-kv-cache/
  waste.html
  stepper.html
  memory.html
```

三种围栏仍然平级：

| 围栏 | 作者给什么 | 站点做什么 |
| --- | --- | --- |
| `mermaid` | 图语法 | 画图，并提供「图表 / Code」 |
| `embed` | URL + 可选摘要 | 选播放器或卡片 |
| `widget` | `src` + 必填 `caption` | 图表 HTML 放进沙箱 iframe；普通 HTML / PDF 先显示入口，展开后再加载 |

一句话：**Markdown 只声明「嵌哪张图、读者应读到哪句判断」。** 步进、格子、曲线、时序都写在 HTML 里。Typora 里 `widget` 仍是一块很短的 YAML——和今天的 `embed` 一样可读。预览交互请用 `make dev` 或直接打开那份 HTML。

外观跟 `--font-mono` 和站点强调色，跟 `embed` 一样用 `<figure>` + 说明。写 HTML 时跟 skill，不要另起一套暗色电影风。

### 3.2 语法

共用外壳，和 `embed` 同形：围栏语言 + YAML。必填只有 `src` 与 `caption`。`src` 必须指向 **与当前 Markdown 同名的目录** 里的 `.html` 或 `.pdf`。

````md
```widget
src: ./understand-kv-cache/stepper.html
caption: Prefill 一次写满 K/V；Decode 每步只追加一行；末步 21 次投影变成 7 次。
```
````

`caption` 是给搜索、RSS、无 JS、Typora 的那句话。它必须是判断，不能是「见下图」。搜索会拆围栏；没有 `caption`，这条机制从索引里蒸发。

可选 `height`：iframe 的初始高度（像素）。图表应在加载后用 `postMessage` 回报真实高度，见 skill。

构建期会把 `src` 改写成 `/media/...`，并校验：

- 文件存在，且扩展名是 `.html` 或 `.pdf`
- 路径落在 `./<markdown 文件名>/` 内，不能指到 `assets/`、别的文章或远程 URL
- `caption` 非空

未知或坏掉的围栏给出可读错误，页面上永不留空白洞。

### 3.3 怎样把复杂度压住

对作者只保留三件事：选原语、在同名目录里放 HTML、写一句 `caption`。站点负责复制文件、沙箱、主题同步和降级。

**要作者（或 AI）写的**

- 同名目录里一份自包含 HTML：样式、SVG、交互都在这一个文件里
- 步骤的标签和一句读者停在这一拍时该读的话
- 格子的行列名、哪一格是 new / waste / cached
- 滑杆的名字、范围、默认值
- 一句判断性的 `caption`

**不要写进 Markdown 的**

- 步进数组、三角格、121 个采样点、悬停 tooltip 格式
- React / MDX / 内联 SVG path / 动画时长
- 绿 `#4ade80`、Geist、`not-prose my-8`、viewBox

**不要写进图表 HTML 的**

- 远程脚本、远程 iframe、任意 CDN（字体除外，且优先系统等宽栈）
- 读写父页面、`allow-same-origin` 依赖、网络请求
- 读者/作者的通用代码执行（解释器、eval 用户输入）

图表在 `sandbox="allow-scripts"` 的 iframe 里运行，**没有** `allow-same-origin`。父页只接受 `{ source: "garden-chart", height }`。

**降级，按通道**

| 通道 | 看见什么 |
| --- | --- |
| 正常网页 | 图表：沙箱 iframe + `caption`；页面 / PDF：示意入口，展开后再加载 |
| `prefers-reduced-motion` | 图表自己停在第一步或终态，不自动播放 |
| 无 JS / 静态爬虫 | `caption` +「打开图表」链接 |
| Typora | 短 YAML，作者能改路径和说明 |
| RSS / 搜索 | `caption` 与围栏纯文本 |
| 坏掉的 `src` | `caption` + 错误句，永不空白 |

周围散文必须能单独读懂。组件坏了或被关掉，文章仍是一篇完整技术文。这与 `embed` 不抓 Open Graph、原站挂了卡片仍可读，是同一条原则。

### 3.4 为什么坚持围栏、不默认上 MDX

MDX 能嵌三个现成 React 组件，但会拆开现在这条作者链路：

- Typora 预览 JSX 是噪声，作者无法在编辑器里确认「嵌的是哪张图」
- `build-content.mjs`、`extractHeadings`、`toSearchableText`、callout 预处理都假设一份 Markdown
- Git 仓库会从「可审的短围栏 + 独立 HTML」变成「可执行的组件树」

已有注册表足够：`MarkdownArticle` 对 `language-mermaid` / `language-embed` / `language-widget` 分流。`widget` 是第三个分支，不是新架构。只有当同名目录里的 HTML 连续表达不了、并且这种文章会反复出现时，才允许 **单篇** `.mdx` 逃生口；默认语料仍是 `.md`。现在没有这个理由。

### 3.5 作者工作流

1. `make new`，Typora 写正文、公式、Mermaid，和现在一样。
2. 需要读者动手时，在稿件旁建同名目录，按 [garden-interactive-chart skill](../.agents/skills/garden-interactive-chart/SKILL.md) 写 HTML；可从 [widget-kind-examples/](./widget-kind-examples/) 抄最近的同类例子。
3. 在正文贴一段 `widget` 围栏，写 `src` 和 `caption`。
4. `CONTENT_INCLUDE_DRAFTS=1 make dev` 看嵌入结果；路径写错时看和 `embed` 同类的错误句。也可直接用浏览器打开那份 HTML。
5. 不在管理后台里可视化搭图表。后台继续只管随想与置顶；长文仍是 Typora + Git。

---

## 4. 先做、延后、永不做

### 先做：平台 + 第一篇演示

平台必须先于任何漂亮动画。没有它，每加一篇演示文都会长出一页硬编码。

1. **`widget` 围栏 + 同名目录**：构建校验 `src`/`caption`、复制 HTML、搜索保留说明、沙箱 iframe、主题查询参数。视觉跟 `embed` 的 figure，不跟参考文的暗色卡片走。
2. **skill**：五种原语的 HTML 写法、Garden 纸面 token、高度回报、减少动态。
3. **第一篇演示**用 `understand-kv-cache`：保留现有 Mermaid 总览，用三份 HTML 复现那三个效果。**不要**再登记 `autoregressive-waste` 这种文章私有类型。

### 紧接着（平台稳定、第一篇演示能读之后）

4. 更多文章复用同一批原语（ECB 检视格、GPM 轨迹），先抄例子再改数据。
5. 需要「并排看」成为常态时，再把对照台做成习惯，而不是新框架。

### 延后

- **故障开关**：先用手写两份步骤（正常 / 故障）验证需求，再收成控件。
- **代码窗装饰**（行号、红绿灯、`filename=`）：可选、默认关；复制按钮比红绿灯有用。不阻塞图表。
- **`layout: essay`**：窄栏、藏目录。CSS / front matter，不是 Markdown。全站不为此改成暗色。
- **代码对照 tabs**：对 naive vs cached 的 Python 有用，对交互原语不是前置。

### 永不做

- 默认把每篇编成 MDX，或从 Markdown 跑 JSX
- 在 Markdown 正文里摊开步进数组、格子矩阵或公式采样点
- 图表 HTML 加载远程脚本、远程 iframe，或向父页读写 cookie / DOM
- 服务端或浏览器执行读者输入的通用代码
- 移植 Christy 的组件源码、暗色皮肤、电影感封面逻辑
- 为单篇 KV 文写死一个路由或一个页面组件
- 测验、积分、游戏化、WebGL、实时推理、需要登录态的图表
- 交互作为唯一讲解：无 `caption`、无周围自立散文
- 为了「完整」预置五十个类型；新类型的门槛是「已有原语的 HTML 连续表达不了，且至少两篇真实文章要复用」

---

## 5. 怎么判断一张图表该不该写

作者（或 AI）用四问挡需求膨胀：

1. 读者卡在第 1 节的哪一条？卡不住，就写散文或 Mermaid。
2. 五种原语里哪一个装得下？装得下，就改数据，不新开类型。
3. `caption` 能否让不开 JS 的人读懂结论？不能，先改说明，再改交互。
4. 同名目录里那份 HTML 能否单独打开、单独看懂？看不懂，就还没拆够。

通过这四问，KV 文是步进器 + 参数台；浮点文是参数台；加密模式是检视格 + 对照；Raft 是步进器（日后才是轨迹）。调色板保持小，作者链路保持「一段短围栏 + 一份独立 HTML」。
