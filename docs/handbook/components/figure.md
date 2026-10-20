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
  <svg viewBox="0 0 680 110" xmlns="http://www.w3.org/2000/svg" font-family="var(--sans)">
    <rect data-p="sync" x="12" y="18" width="196" height="74" rx="10" fill="var(--card)" stroke="var(--rule-strong)" stroke-width="1.5"/>
    <text data-p="sync" x="110" y="50" text-anchor="middle" font-size="14" font-weight="600" fill="var(--ink)">1. garden sync</text>
    <text data-p="sync" x="110" y="72" text-anchor="middle" font-size="12" fill="var(--muted)">解析 Markdown 与图片尺寸</text>
    <path d="M214 55 H236" stroke="var(--muted)" stroke-width="1.5"/>
    <rect data-p="build" x="242" y="18" width="196" height="74" rx="10" fill="var(--card)" stroke="var(--rule-strong)" stroke-width="1.5"/>
    <text data-p="build" x="340" y="50" text-anchor="middle" font-size="14" font-weight="600" fill="var(--ink)">2. garden build</text>
    <text data-p="build" x="340" y="72" text-anchor="middle" font-size="12" fill="var(--muted)">生成静态页面与搜索索引</text>
    <path d="M444 55 H466" stroke="var(--muted)" stroke-width="1.5"/>
    <rect data-p="validate" x="472" y="18" width="196" height="74" rx="10" fill="var(--card)" stroke="var(--rule-strong)" stroke-width="1.5"/>
    <text data-p="validate" x="570" y="50" text-anchor="middle" font-size="14" font-weight="600" fill="var(--ink)">3. pages:validate</text>
    <text data-p="validate" x="570" y="72" text-anchor="middle" font-size="12" fill="var(--muted)">检查 index.html 与禁用文件</text>
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

可以这样对 AI 说：

````markdown
```garden
画一张静态发布流程的结构图，点到哪一步就高亮那一步并显示说明。
```
````

- **什么时候用**：一张架构图或数据流图，读者点一个区域就能看清那一部分做什么。
- **什么时候不用**：不需要分区点击说明的普通流程图或截图，直接贴图片或画 Mermaid 图。
