---
title: 分区结构图（figure）
navTitle: 分区结构图
description: 一张带切换按钮的结构图，点到哪个部分就高亮并显示对应说明。
section: components
order: 36
badge: figure
---

```garden figure
caption: 点击上方按钮切换高亮各步骤
svg: |
  <svg viewBox="0 0 560 194" xmlns="http://www.w3.org/2000/svg" font-family="var(--sans)" style="max-width: 380px; margin-inline: auto">
    <rect data-p="sync" x="2" y="4" width="180" height="186" rx="16" fill="var(--card)" stroke="var(--rule-strong)" stroke-width="2.5"/>
    <text data-p="sync" x="92" y="42" text-anchor="middle" font-size="24" font-weight="600" fill="var(--ink)">1. garden</text>
    <text data-p="sync" x="92" y="72" text-anchor="middle" font-size="24" font-weight="600" fill="var(--ink)">sync</text>
    <text data-p="sync" x="92" y="108" text-anchor="middle" font-size="24" fill="var(--muted)">解析</text>
    <text data-p="sync" x="92" y="137" text-anchor="middle" font-size="24" fill="var(--muted)">Markdown 与</text>
    <text data-p="sync" x="92" y="166" text-anchor="middle" font-size="24" fill="var(--muted)">图片尺寸</text>
    <path d="M183.5 97 H188.5" stroke="var(--muted)" stroke-width="2.5"/>
    <rect data-p="build" x="190" y="4" width="180" height="186" rx="16" fill="var(--card)" stroke="var(--rule-strong)" stroke-width="2.5"/>
    <text data-p="build" x="280" y="42" text-anchor="middle" font-size="24" font-weight="600" fill="var(--ink)">2. garden</text>
    <text data-p="build" x="280" y="72" text-anchor="middle" font-size="24" font-weight="600" fill="var(--ink)">build</text>
    <text data-p="build" x="280" y="108" text-anchor="middle" font-size="24" fill="var(--muted)">生成静态页面</text>
    <text data-p="build" x="280" y="137" text-anchor="middle" font-size="24" fill="var(--muted)">与搜索索引</text>
    <path d="M371.5 97 H376.5" stroke="var(--muted)" stroke-width="2.5"/>
    <rect data-p="validate" x="378" y="4" width="180" height="186" rx="16" fill="var(--card)" stroke="var(--rule-strong)" stroke-width="2.5"/>
    <text data-p="validate" x="468" y="42" text-anchor="middle" font-size="24" font-weight="600" fill="var(--ink)">3. pages:</text>
    <text data-p="validate" x="468" y="72" text-anchor="middle" font-size="24" font-weight="600" fill="var(--ink)">validate</text>
    <text data-p="validate" x="468" y="108" text-anchor="middle" font-size="24" fill="var(--muted)">检查</text>
    <text data-p="validate" x="468" y="137" text-anchor="middle" font-size="24" fill="var(--muted)">index.html 与</text>
    <text data-p="validate" x="468" y="166" text-anchor="middle" font-size="24" fill="var(--muted)">禁用文件</text>
  </svg>
parts:
  - id: sync
    label: 1. 同步内容
    text: 扫描正文与随文附件，生成站点内容数据。
  - id: build
    label: 2. 构建页面
    text: 预渲染所有页面路由，输出 RSS、sitemap 与全文搜索文件。
  - id: validate
    label: 3. 导出校验
    text: 确认导出目录里有 `index.html`，且没有混入源码或配置文件。
```

- **什么时候用**：一张架构图或数据流图，读者点一个区域就能看清那一部分做什么。
- **什么时候不用**：不需要分区点击说明的普通流程图或截图，直接贴图片或画 Mermaid 图。

可以这样对 AI 说：

````markdown
```garden
画一张静态发布流程的结构图，点到哪一步就高亮那一步并显示说明。
```
````

## 字段说明

全部字段、默认值、取值限制和报错代码见 [组件参考 · figure](/garden/reference/figure)。
