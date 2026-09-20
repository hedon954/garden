---
name: garden-interactive-chart
description: >-
  Writes Garden interactive charts as self-contained HTML in a same-name
  sidecar directory and embeds them with a short widget fence. Use when adding
  or editing garden-blog widgets, steppers, inspect grids, param benches,
  compare views, traces, KV cache charts, or any 可交互图表 / 同名目录 HTML.
---

# Garden 可交互图表

复杂交互不写进 Markdown。一篇稿对应一个同名目录，目录里每一份 `.html` 是一张可单独打开的图表；正文只嵌一段短围栏。

设计背景：[docs/interactive-blog-components.md](../../../docs/interactive-blog-components.md)。可抄的成品：[docs/widget-kind-examples/](../../../docs/widget-kind-examples/)。

## 何时画、何时停

先问：读者是不是卡在过程被拍成照片、参数是死例子、二维被压扁、对比只能上下翻、或「如果」无法试？卡不住，就写散文或 Mermaid。

五种原语，先选再画：

| 要让读者做什么 | 原语 | 抄谁 |
| --- | --- | --- |
| 停在某一拍 | 步进器 | [stepper.html](../../../docs/widget-kind-examples/stepper.html)、[waste.html](../../../docs/widget-kind-examples/waste.html) |
| 盯着格子说话 | 检视格 | [inspect-grid.html](../../../docs/widget-kind-examples/inspect-grid.html) |
| 拧旋钮看数字/曲线 | 参数台 | [param-bench.html](../../../docs/widget-kind-examples/param-bench.html) |
| 同一时刻看两边 | 对照台 | [compare.html](../../../docs/widget-kind-examples/compare.html) |
| 看当前节点和当前边 | 轨迹 | [trace.html](../../../docs/widget-kind-examples/trace.html) |

装得下就改数据，不新开类型。超过约 9 个节点 / 12 步，拆成两张图。

## 文件约定

Markdown 在 `content/posts/<dir>/<slug>.md` 时，图表只能放在 `content/posts/<dir>/<slug>/`：

```text
content/posts/understand-kv-cache.md
content/posts/understand-kv-cache/waste.html
```

正文：

````md
```widget
src: ./understand-kv-cache/waste.html
caption: 朴素 decode 每步重算全部过去 token；6 个 token 共 21 次计算，其中 15 次是浪费。
```
````

规则：

- `src` 必须是该同名目录里的本地 `.html` 或 `.pdf`，不能指到 `assets/`、别的文章或 `https://`
- 带 `garden-chart` 高度回报的 HTML 是图表，直接铺开；普通 HTML 和 PDF 默认收成示意入口，读者展开后再加载
- `caption` 必须是判断，不能是「见下图」
- 一份 HTML 一张图；文件名用 `waste.html`、`stepper.html` 这种短 kebab
- HTML 自包含：CSS、SVG、脚本都在这一个文件里
- 先写 HTML，再写围栏；围栏里不要再摊步进数组或采样点

构建会校验路径并复制到 `/media/...`。路径写错时构建直接失败。

## 怎么写 HTML

1. 复制 [references/shell.html](references/shell.html)，或从最像的例子改。
2. 颜色和字体只用 [references/style.md](references/style.md) 里的 token，不要另起暗色电影风。
3. 必须调用 shell 里的启动脚本：读 `?theme=light|dark`，用 `ResizeObserver` 向父页发送 `{ source: "garden-chart", height }`。
4. 尊重 `prefers-reduced-motion: reduce`：自动播放停在第一步或终态。
5. 控件用原生 `button` / `input`。滑杆绑定写死的输入，不要 `eval` 读者输入，不要发网络请求。
6. 在浏览器里打开这份 HTML，走一遍主路径和空态；再 `CONTENT_INCLUDE_DRAFTS=1 make dev` 看嵌入。

## 禁止

- 把步进、格子、公式采样点写进 Markdown
- 远程脚本、远程 iframe、任意 CDN（系统等宽栈即可）
- 读写父页面 DOM / cookie；不要依赖 `allow-same-origin`
- MDX、JSX、文章私有类型名（例如 `autoregressive-waste`）
- 交互当唯一讲解：周围散文必须能单独读懂

## 交稿前

- [ ] 文件在同名目录内，围栏只有 `src` + `caption`
- [ ] 单独打开 HTML 就能用；iframe 能撑开高度
- [ ] 浅色 / 深色主题都跟 Garden 纸面
- [ ] 减少动态时不自动循环
- [ ] `caption` 让关 JS 的人也能读到结论
