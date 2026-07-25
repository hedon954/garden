---
title: Markdown 复杂语法实验场
slug: markdown-lab
description: 用一篇真实文章验证 Typora 常用语法、数学公式、Mermaid、脚注、表格与原生 HTML。
date: 2026-07-25
topic: 写作系统
tags:
  - Markdown
  - Typora
  - Mermaid
  - KaTeX
pinned: false
readingTime: 7 分钟
cover: https://images.unsplash.com/photo-1761414500824-e280de5a1b37?auto=format&fit=crop&w=1600&q=84
coverAlt: 彩色阳台构成的现代建筑立面
---

这篇文章不是功能清单，而是一份可以长期保留的**渲染验收样本**。我会在 Typora 中常用的语法和网页输出之间建立一条可重复验证的路径。

> 写作格式的价值，不在于语法多，而在于文件离开编辑器之后仍能完整表达。

## 基础排版与 GFM

一段文字可以同时包含**粗体**、*斜体*、~~删除线~~、`inline code` 和 [外部链接](https://typora.io/)。

- 第一层列表
  - 第二层列表
    - 第三层列表
- 列表之后仍然保持稳定的段落节奏

1. 写作
2. 本地预览
3. 发布与验证

- [x] 标题、引用、列表和代码
- [x] 表格、删除线与任务列表
- [x] 数学公式与 Mermaid
- [ ] 用新的真实文章继续回归测试

| 能力 | 写法 | 网页表现 |
| --- | :---: | ---: |
| GFM | `remark-gfm` | 已验证 |
| 数学公式 | `$...$` / `$$...$$` | KaTeX |
| 图表 | Mermaid fenced code | SVG |

## 数学公式

行内公式会和文字一起流动，例如注意力的缩放项 $\frac{QK^\top}{\sqrt{d_k}}$。

块级公式支持多行对齐：

$$
\begin{aligned}
\operatorname{Attention}(Q,K,V)
  &= \operatorname{softmax}\left(\frac{QK^\top}{\sqrt{d_k}}\right)V \\
K_{\text{cache}}^{(t)}
  &= [K_{\text{cache}}^{(t-1)}; K_t] \\
V_{\text{cache}}^{(t)}
  &= [V_{\text{cache}}^{(t-1)}; V_t]
\end{aligned}
$$

矩阵也能正常显示：

$$
X =
\begin{bmatrix}
1 & 0 & 1 \\
0 & 1 & 0 \\
1 & 1 & 1
\end{bmatrix}
$$

## Mermaid 流程与时序

下面的流程图描述本地写作到发布的闭环：

```mermaid
flowchart LR
  A[Typora 写作] --> B{本地验证}
  B -->|通过| C[生成内容索引]
  B -->|失败| A
  C --> D[构建网站]
  D --> E[浏览器验收]
  E --> F[发布]
```

同一篇文章里可以继续放更复杂的时序图：

```mermaid
sequenceDiagram
  autonumber
  participant W as Writer
  participant M as Markdown
  participant S as Site
  participant R as Reader
  W->>M: 保存 .md 与媒体
  M->>S: 构建内容与目录
  S-->>W: 返回预览
  W->>S: 发布已验证版本
  R->>S: 阅读文章
  S-->>R: HTML + KaTeX + Mermaid
```

## 代码、图片与原生 HTML

```diff
- const publishing = "copy and paste";
+ const publishing = "content as source";
```

![木桌上的笔记本与钢笔](https://images.unsplash.com/photo-1501525771695-688643efeea4?auto=format&fit=crop&w=1400&q=82)

<details>
  <summary>展开原生 HTML 内容</summary>
  <p>Typora 文件中的 details / summary 会保留为可交互的折叠区域。</p>
</details>

---

最后用一个脚注说明这篇文章的角色：它既是示例，也是未来升级 Markdown 依赖时的回归测试。[^regression]

[^regression]: 页面构建测试会检查公式与示例内容，浏览器验收会检查 Mermaid 是否被转换为 SVG。
