---
title: html · 嵌入网页片段与交互演示
description: 用 garden html 在文章里嵌入自己写的 HTML/SVG 片段、选项卡、自测题，或者带脚本的独立网页演示。
section: components
order: 8
---

## 什么时候用

当内置的静态组件不够用，你想在文章里放一段自己写的 HTML/SVG 示意图、一组切换选项卡、一道给读者自测的小题目，或者一个带 `<script>` 脚本的画布动画时，用 `garden html`。

Garden 会根据你写的 HTML 内容自动决定怎么展示：
- 如果是不带脚本的普通 HTML/SVG，或者用了内置的轻量交互标记（比如 `data-g="tabs"` 选项卡、`data-g="quiz"` 自测题、`data-g="stepper"` 步骤条），会直接嵌在页面里渲染；
- 如果里面包含 `<script>` 脚本，会自动放进安全的隔离沙盒窗口（`iframe`）里运行，并自动同步当前页面的浅色/深色主题和高度。

## 效果与写法

### 写法一：直接在代码块里写 HTML（轻量选项卡示例）

在 YAML 标题下面加一行 `---`，后面直接写 HTML 即可：

```garden html
title: 三种缓存淘汰策略的命中率对比
---
<div class="g-tabs" data-g="tabs">
  <div class="g-tab-bar">
    <button type="button" data-on="1">LRU（最近最少使用）</button>
    <button type="button">LFU（最不经常使用）</button>
    <button type="button">W-TinyLFU</button>
  </div>
  <div class="g-tab-panes">
    <div data-on="1">
      <p><strong>特点：</strong>用双向链表维护访问顺序，实现最简单；但遇到全表扫描请求时，容易把真正的热点数据一次性全冲掉。</p>
    </div>
    <div>
      <p><strong>特点：</strong>按历史访问频次淘汰，不怕偶发的全表扫描；但以前访问极多、现在已经不再访问的旧数据会长期占着内存不走。</p>
    </div>
    <div>
      <p><strong>特点：</strong>前面放一个 1% 大小的窗口缓存吸收突发流量，后面用 Count-Min Sketch 统计频率并定期衰减，兼顾突发流量与扫描保护。</p>
    </div>
  </div>
</div>
```

对应的 Markdown 写法：

```html
<!-- 代码块开头写：```garden html -->
title: 三种缓存淘汰策略的命中率对比
---
<div class="g-tabs" data-g="tabs">
  <div class="g-tab-bar">
    <button type="button" data-on="1">LRU（最近最少使用）</button>
    <button type="button">LFU（最不经常使用）</button>
    <button type="button">W-TinyLFU</button>
  </div>
  <div class="g-tab-panes">
    <div data-on="1"><p>LRU 说明……</p></div>
    <div><p>LFU 说明……</p></div>
    <div><p>W-TinyLFU 说明……</p></div>
  </div>
</div>
```

### 写法二：引用同目录下的独立 `.html` 文件

如果 HTML 比较长（比如包含完整的 Canvas 动画和样式），可以把它存放在文章同名文件夹下（例如写 `content/posts/raft.md` 时，把网页存成 `content/posts/raft/election-sim.html`），然后在文章里用 `src` 引用：

```yaml
# 代码块开头写：```garden html
src: ./raft/election-sim.html
title: Raft 节点超时与选主过程模拟
height: 420
```

## 可用字段一览

| 字段名 | 必填 | 说明 |
| :--- | :--- | :--- |
| `title` | 否 | 标题说明（全屏查看和无障碍阅读器会用到）。 |
| `src` | 否 | 引用文章同名文件夹下的 `.html` 文件路径（如 `./post-slug/demo.html`）。 |
| `code` | 否 | 内联 HTML 字符串（也可以更方便地直接写在 `---` 分隔线下面）。 |
| `height` | 否 | 当 HTML 包含 `<script>` 在沙盒窗口运行时，指定的初始高度（单位 `px`，默认 `360`，运行后会自动按内容高度撑开）。 |
