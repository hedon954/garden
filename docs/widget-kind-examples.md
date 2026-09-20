# 五种图表原语的完整例子

给作者和 AI 抄。每种原语一份可打开的 HTML，以及正文里那段短 `widget` 围栏。语法与约束见 [interactive-blog-components.md](./interactive-blog-components.md)。写新图时跟 [garden-interactive-chart skill](../.agents/skills/garden-interactive-chart/SKILL.md)。

图表文件都在 [widget-kind-examples/](./widget-kind-examples/)：与本文同名的目录，目录里每一份 HTML 是一张可交互图表。对照 [Christy 原文](https://www.christyjacob.dev/blog/kv-caching) 三个 widget 的行为副本见文末；复刻规则：行为 100% 一致，只换颜色与 Garden 浅色纸面。

---

## 共用约定

- 第三种围栏，和 `mermaid` / `embed` 平级。围栏语言是 `widget`，正文只写 `src` 与 `caption`。
- 图表放在与 Markdown **同名的目录**里，例如本文对应 `docs/widget-kind-examples/`，博文 `foo.md` 对应 `foo/`。
- `caption` 必须是判断，不能是「见下图」；搜索、RSS、无 JS、Typora 都靠它。
- Typora 里 `widget` **就是一段短 YAML**。要看交互，打开旁边的 HTML，或 `make dev`。
- 成页跟 Garden 浅色纸面走（`--paper` / `--font-mono` / 强调色），不跟参考文的暗色电影感走。

---

## 1. 步进器：从逐词生成理解 KV Cache

### 何时用

读者卡在「过程被拍成一张图」（局限 1.1）：Prefill → Decode、Raft 选举、反向传播四步，必须停在某一拍才能复述发生了什么。

### 正文里嵌什么

图表：[stepper.html](./widget-kind-examples/stepper.html)

````md
```widget
src: ./widget-kind-examples/stepper.html
caption: Prefill 一次写满 K/V；Decode 每步只追加一行；末步 21 次投影变成 7 次。
```
````

同一原语也可改数据讲 Raft 选举或反向传播「从后往前分锅」，不必新开类型。

### Typora / 成页 / 降级

Typora 看见短 YAML。成页是 `<figure>` 里的手动步进器：Prev / 1–5 / Next，当前步说明，以及随步变化的 Q/K/V 格子。第 5 步是 Without / With 分屏。自动播放若打开，必须可关，并尊重减少动态。

![步进器成页示意](../media/widget-kinds/stepper.png)

无 JS / RSS 至少读到 `caption`，再按行看每一拍：

| 步 | 标签 | 读者停在这一拍时读什么 |
| --- | --- | --- |
| 1 | Prefill | 提示词 I love ML ! 并行算完全部 Q、K、V。 |
| 2 | Decode · It | Q 缩成 1×d。K、V 从缓存取出，只为新 token 追加一行。 |
| 3 | Decode · is | Q 仍是 1 行。K/V 缓存再长一行。 |
| 4 | Decode · great | 缓存继续增长；过去 token 不再投影。 |
| 5 | Without / With | 21 次投影变成 7 次。 |

---

## 2. 检视格：从 ECB 到 GCM

### 何时用

读者卡在「二维结构被压成表格或图片」（局限 1.3）：ECB 企鹅、Attention 分数、KV 行追加、页锁 bitmap。格子本身是主角，不是某一步的附件。

### 正文里嵌什么

图表：[inspect-grid.html](./widget-kind-examples/inspect-grid.html)

````md
```widget
src: ./widget-kind-examples/inspect-grid.html
caption: 相同明文块在 ECB 下会打出相同密文块，企鹅轮廓因此还在。
```
````

### Typora / 成页 / 降级

Typora 看见路径和判断句。成页是一张可悬停的检视格：重复密文用站点强调色标出。移到一格，格子说话。

![检视格成页示意](../media/widget-kinds/inspect-grid.png)

| 行 | 块 0 | 块 1 | 块 2 | 块 3 |
| --- | --- | --- | --- | --- |
| 第 0 行 | C天空（重复） | C天空（重复） | C天空（重复） | C天空（重复） |
| 第 1 行 | C天空（重复） | C眼睛 | C眼睛 | C天空（重复） |
| 第 2 行 | C身体 | C身体 | C身体 | C身体 |
| 第 3 行 | C脚 | C脚 | C脚 | C脚 |

---

## 3. 参数台：KV 显存墙（也可换浮点死例子）

### 何时用

读者卡在「参数是死例子」（局限 1.2）：KV 显存公式、`0.1+0.2`、学习率 warmup 步数。页面上的数字是作者算好的；读者改 batch 或序列只能自己掏计算器。

### 正文里嵌什么

图表：[param-bench.html](./widget-kind-examples/param-bench.html)

````md
```widget
src: ./widget-kind-examples/param-bench.html
caption: 70B 在长上下文下，KV 显存会先于权重撑满一张卡；batch 8 × 32K 时连 7B 也超过消费卡。
```
````

公式写在 HTML 里，不要摊进 Markdown。默认 `batch=1`、悬停在 4K：7B = 2.0 GB，13B = 3.1 GB，70B = 10 GB。`batch=8`、`seq=32768` 时 70B 到 640 GB。

### Typora / 成页 / 降级

成页是对数横轴折线、batch 滑杆、三条 GPU 参考线、十字悬停。序列长度是坐标轴，不是第二根滑杆。

![参数台成页示意](../media/widget-kinds/param-bench.png)

| 输入 / 输出 | 默认值 |
| --- | --- |
| 序列长度 | 4096（横轴，不是滑杆） |
| 批量 | 1 |
| 7B / 13B / 70B KV | 2.0 / 3.1 / 10 GB |
| 参考线 | 4090 = 24 · A100 = 40 / 80 GB |

---

## 4. 对照台：无缓存 vs 有缓存

### 何时用

读者卡在「对比只能上下翻」（局限 1.4）：Naive vs 缓存、ECB vs CBC、Mutex vs RwLock。工作记忆装不下两张分开放的图，必须同一时刻并排看。

### 正文里嵌什么

图表：[compare.html](./widget-kind-examples/compare.html)

````md
```widget
src: ./widget-kind-examples/compare.html
caption: 无缓存每步重投影全部过去 token；有缓存只投影新 token。
```
````

对照台只并排两个已有原语，自己不长新交互。

### Typora / 成页 / 降级

![对照台成页示意](../media/widget-kinds/compare.png)

**无缓存 · 21 次投影**

| token | Q | K | V |
| --- | --- | --- | --- |
| I / love / ML / ! | 重算 | 重算 | 重算 |
| It | new | new | new |

**有缓存 · 7 次投影**

| token | Q | K | V |
| --- | --- | --- | --- |
| I / love / ML / ! | · | cached | cached |
| It | new | append | append |

---

## 5. 轨迹：Go GPM 调度

### 何时用

读者卡在「过程是照片」的图状变体（局限 1.1）：G/P/M 绑定、Raft 角色、TCP 状态。Mermaid 能画一次拓扑；读者需要看见**当前节点和当前边**时，才用轨迹，避免和 Mermaid 抢职责。

### 正文里嵌什么

图表：[trace.html](./widget-kind-examples/trace.html)

````md
```widget
src: ./widget-kind-examples/trace.html
caption: P 只从本地或全局队列取 G；G 必须绑在某个 P 上，P 必须绑在某个 M 上才能跑。
```
````

### Typora / 成页 / 降级

成页是浅纸底上的轨迹图：当前节点用强调色描边。手动步控与步进器同形。静态总览仍先写 Mermaid。

![轨迹成页示意](../media/widget-kinds/trace.png)

| 步 | 标签 | 当前节点 | 当前边 | 读者停在这一拍时读什么 |
| --- | --- | --- | --- | --- |
| 1 | 新建 G | G0, P0 | G0 → P0 | 新 Goroutine 优先进 P0 本地队列，不超过 256 个。 |
| 2 | 执行 | G0, P0, M0 | G0 → P0，P0 → M0 | P0 已绑到系统线程 M0。G0 从本地队列取出，在 M0 上运行。 |
| 3 | 偷取 | 全局队列, P0 | 全局队列 → P0 | 本地空了，P0 从全局队列一次偷一批，减少锁竞争。 |

---

## 对照：Christy KV Caching 的三个 widget

原文：<https://www.christyjacob.dev/blog/kv-caching>。下面三份 HTML 是那三个 client SVG 的 **行为副本**，给作者对照「我们的图对不对得上原文」。不新开类型。颜色、字体、Garden 浅色纸面可以换；控件、时序、计数、悬停、末步分屏、坐标轴、系列、滑杆必须对上。

上面 §1 步进器、§3 参数台、§4 对照台是同一种原语的简稿或切片；**对原文的完整作者稿以本节的 HTML 为准**。

| 原文 | 用哪份 HTML | 不要写成 |
| --- | --- | --- |
| A 浪费自动播放 | [waste.html](./widget-kind-examples/waste.html) | `autoregressive-waste` 私有类型 |
| B Prefill/Decode | [stepper.html](./widget-kind-examples/stepper.html) | 专用 QKV 类型 |
| C KV 显存墙 | [param-bench.html](./widget-kind-examples/param-bench.html) | 只画一张死图 |

博文演示在 `content/posts/understand-kv-cache.md`，图表在同名目录 `content/posts/understand-kv-cache/`。

---

### A. 浪费自动播放（`The cat sat on the mat`）

插在「Token 1 will be recomputed *N* times…」之后。600×350 量级，**没有任何 Prev / Next / 暂停**。

- 顶栏 6 个 token 从左亮到右。未到的灰，已过的实，当前步强调。
- 其下 6 行三角格：第 *n* 行恰好 *n* 个圆角格。该行最后一格是新算，前面的格是重算过去 token。
- 播放中：`Compute: X / Y redundant`。`X = n(n+1)/2`，`Y = X − n`。
- 播完第 6 步后等 300ms，计数换成 `Total: 21` / `New work: 6` / `Redundant: 15`。停 2000ms，清空，再等 400ms 循环。步与步之间 800ms；开场先空 800ms。
- `prefers-reduced-motion` 时直接停在终态。

````md
```widget
src: ./widget-kind-examples/waste.html
caption: 朴素 decode 每步重算全部过去 token；6 个 token 共 21 次计算，其中 15 次是浪费。
```
````

![浪费自动播放成页示意](../media/widget-kinds/christy-waste.png)

---

### B. Prefill / Decode 步进器

插在「Step through the visualization below…」之后。底栏 `Prev` | 药丸 `1 2 3 4 5` | `Next`。第 1 步 `Prev` 禁用，第 5 步 `Next` 禁用。药丸是指示。

- 第 1 步 Prefill：`I love ML !`。Q / K / V 各 4 行全亮。
- 第 2–4 步 Decode `It` / `is` / `great`：Q 缩成 1 行，K / V cache 每步多一行。
- 第 5 步分屏：左 Without cache 前 6 行变暗，右 With cache；`21 projections → 7 projections`。
- 无自动播放。无格子悬停。

````md
```widget
src: ./widget-kind-examples/stepper.html
caption: Prefill 一次写满 K/V；Decode 每步只追加一行；末步 21 次投影变成 7 次。
```
````

![Prefill/Decode 步进成页示意](../media/widget-kinds/christy-stepper.png)

---

### C. KV 显存墙（曲线 + batch 滑杆）

插在「scale up the sequence length or batch size…」之后。

- **页上只有一根滑杆**：Batch size 1–32，默认 1。序列长度是对数横轴，不是滑杆。
- 横轴 512 → 128K，纵轴 0–160 GB，超出裁掉。
- 三条 fp16 曲线：`2 × L × H × d_h × N × B × 2 / 1024³`（7B / 13B / 70B）。
- 虚线 GPU 顶：4090 24 GB、A100 40 / 80 GB。交点画实心点。
- 鼠标移动：竖十字线 + `Seq: 4K | 7B: 2.0 GB | …`。

````md
```widget
src: ./widget-kind-examples/param-bench.html
caption: 70B 在长上下文下，KV 显存会先于权重撑满一张卡；batch 8 × 32K 时连 7B 也超过消费卡。
```
````

![KV 显存墙成页示意](../media/widget-kinds/christy-memory.png)
