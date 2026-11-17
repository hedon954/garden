---
title: 内置组件
navTitle: 内置组件
description: 涵盖链接卡片、图片与 Bilibili / YouTube 视频、来源胶囊、HTML / PDF / Excalidraw 文件内嵌及智能 UI，全部组件均提供双端真实渲染与实时演练场。
section: components
order: 30
---

Garden 坚持「普通 Markdown 能说清的绝不造新语法，普通 Markdown 表达受限的用最少标记原生补齐」。全部内置能力分为 **4 类正文内联/单行增强语法** 与 **1 个统一的 `garden compose` 智能组件入口**。

下面每一类组件在本章子页面中都包含完整的 **「是什么 → 有什么用 → 逐形态怎么写与 Web/移动端双形态真实渲染 → 页尾可编辑实时演练场」**。此处先以真实例子速览五大组件家族：

---

## 1. 链接卡片（`[文字](url)` / `{card}` / 独立行网址）

在句中保留带站点图标的外链，或将重要参考网页展开为带网站名、标题、摘要和缩略图的预览卡片（详见 **[链接卡片](/garden/components/link-card/)**）：

[KaTeX 支持的函数](https://katex.org/docs/supported.html){card}

---

## 2. 图片与音视频播放器（本地媒体 / Bilibili / YouTube）

支持同名附件目录宽幅配图（自动测量宽高防抖动、点击灯箱放大）、原生本地音视频，以及单独一行自动转为站内播放器的 **Bilibili** 与 **YouTube** 视频链接（详见 **[图片视频](/garden/components/media/)**）：

https://www.bilibili.com/video/BV1GJ411x7h7

---

## 3. 来源胶囊（`[站点](url){source}`）

在陈述句末尾轻量标注数据或引文出处，不打断段落行高，自动显示站点图标并在缺失图标时回退为域名首字母（详见 **[来源胶囊](/garden/components/source/)**）：

HTTP 语义与缓存首部规范引自 IETF 正式标准文档 [rfc-editor.org](https://www.rfc-editor.org/rfc/rfc9110){source} 与维基百科词条 [wikipedia.org](https://en.wikipedia.org/wiki/Book_discussion_club){source}。

---

## 4. 文件内嵌与矢量图（HTML / PDF / Excalidraw）

在文章中直接提供可页内抽屉预览的 **HTML 小工具**、**PDF 文档**、**Markdown 附件**，或将 `.excalidraw` 手绘源文件在构建期自动内联为透明底、可选中文字的矢量图（详见 **[文件内嵌](/garden/components/file-embed/)**）：

```garden compose
<figure frame="none">
  <files title="示例附件包（可直接点击右侧「预览」拉开抽屉）">
    <file src="../assets/samples/sill-planner.html" title="窗台排盆计算小工具" note="运行在隔离沙箱抽屉内的交互 HTML" />
    <file src="../assets/samples/seed-guide.pdf" title="一页式播种指南" note="自动计算文件体积并支持页内 PDF 预览" />
  </files>
</figure>
```

---

## 5. 智能 UI（`garden compose` 与 21 种常用图示）

通过单一 `garden compose` 围栏表达静态架构关联、对比决策、分步解析、时间线、关系图，以及带滑杆和单选器的动态参数图表（详见 **[智能 UI](/garden/components/intelligent-ui/)**）：

```garden compose #components-overview-demo
caption: 拖动读写请求比例与缓存命中率，实时查看数据库回源压力与平均延迟。
---
{@body const [readPct, setReadPct] = DIL.useState(80)}
{@body const [hitPct, setHitPct] = DIL.useState(85)}
{@body const writePct = 100 - readPct}
{@body const dbLoadPct = round(writePct + (readPct * (100 - hitPct)) / 100)}
{@body const avgMs = round(((readPct * (hitPct * 1.2 + (100 - hitPct) * 18)) / 100 + writePct * 22) / 10) / 10}

<slider bind="readPct" label="读请求占比" min={10} max={95} step={5} unit="%" />
<slider bind="hitPct" label="缓存命中率" min={0} max={99} step={1} unit="%" />

<columns>
  <stat label="穿透到数据库的流量占比" value={dbLoadPct} unit="%" />
  <stat label="混合请求平均响应延迟" value={avgMs} unit="ms" hint="缓存命中 1.2ms，读库 18ms，写库 22ms" />
</columns>
```
