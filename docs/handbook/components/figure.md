---
title: 分区结构图（figure）
navTitle: 分区结构图
description: 为 SVG 结构图加上分区高亮按钮，点击切换对应区域与文字说明。
section: components
order: 36
badge: figure
---

```garden figure
caption: 点击上方按钮切换高亮各步骤
svg: |
  <svg viewBox="0 0 680 110" xmlns="http://www.w3.org/2000/svg" font-family="var(--sans)">
    <g data-p="sync">
      <rect x="12" y="18" width="196" height="74" rx="10" fill="var(--well)" stroke="var(--rule-strong)" stroke-width="1.5"/>
      <text x="110" y="50" text-anchor="middle" font-size="14" font-weight="600" fill="var(--ink)">1. garden sync</text>
      <text x="110" y="72" text-anchor="middle" font-size="12" fill="var(--muted)">解析 Markdown 与图片尺寸</text>
    </g>
    <path d="M214 55 H236" stroke="var(--muted)" stroke-width="1.5"/>
    <g data-p="build">
      <rect x="242" y="18" width="196" height="74" rx="10" fill="var(--well)" stroke="var(--rule-strong)" stroke-width="1.5"/>
      <text x="340" y="50" text-anchor="middle" font-size="14" font-weight="600" fill="var(--ink)">2. garden build</text>
      <text x="340" y="72" text-anchor="middle" font-size="12" fill="var(--muted)">生成静态页面与搜索索引</text>
    </g>
    <path d="M444 55 H466" stroke="var(--muted)" stroke-width="1.5"/>
    <g data-p="validate">
      <rect x="472" y="18" width="196" height="74" rx="10" fill="var(--well)" stroke="var(--rule-strong)" stroke-width="1.5"/>
      <text x="570" y="50" text-anchor="middle" font-size="14" font-weight="600" fill="var(--ink)">3. pages:validate</text>
      <text x="570" y="72" text-anchor="middle" font-size="12" fill="var(--muted)">检查导出路由与静态资源</text>
    </g>
  </svg>
parts:
  - id: sync
    label: 1. 同步内容
    text: 扫描 `content/` 与 `docs/handbook/`，复制随文附件并生成 `.garden/generated-content.ts`。
  - id: build
    label: 2. 构建页面
    text: 根据 `STATIC_EXPORT=1` 预渲染所有页面路由，输出 RSS、sitemap 与全文搜索文件。
  - id: validate
    label: 3. 导出校验
    text: 检查静态导出目录中的内部链接、资源路径和页面结构是否完整。
```

```markdown
```garden figure
caption: 点击上方按钮切换高亮各步骤
svg: |
  <svg viewBox="0 0 680 110" xmlns="http://www.w3.org/2000/svg" font-family="var(--sans)">
    <g data-p="sync">
      <rect x="12" y="18" width="196" height="74" rx="10" fill="var(--well)" stroke="var(--rule-strong)" stroke-width="1.5"/>
      <text x="110" y="50" text-anchor="middle" font-size="14" font-weight="600" fill="var(--ink)">1. garden sync</text>
      <text x="110" y="72" text-anchor="middle" font-size="12" fill="var(--muted)">解析 Markdown 与图片尺寸</text>
    </g>
    <g data-p="build">...</g>
    <g data-p="validate">...</g>
  </svg>
parts:
  - id: sync
    label: 1. 同步内容
    text: 扫描 `content/` 与 `docs/handbook/`，复制随文附件并生成 `.garden/generated-content.ts`。
  - id: build
    label: 2. 构建页面
    text: 根据 `STATIC_EXPORT=1` 预渲染所有页面路由，输出 RSS、sitemap 与全文搜索文件。
  - id: validate
    label: 3. 导出校验
    text: 检查静态导出目录中的内部链接、资源路径和页面结构是否完整。
```
```

- **用**：展示模块架构或数据流向，需要读者点击按钮逐块查看对应区域职责时（SVG 内优先使用 `var(--well)`、`var(--ink)`、`var(--muted)` 等主题变量以兼容深色模式）。
- **别用**：不需要分区点击说明的普通流程图或截图，直接用标准 Markdown 图片或 `mermaid` 代码块。

| 字段 | 必填 | 类型 | 说明 |
| :--- | :--- | :--- | :--- |
| `svg` | 与 `image` 二选一 | 多行字符串 | 内联 `<svg>` 源码；在需要高亮的分组上标注 `data-p="<id>"` |
| `image` | 与 `svg` 二选一 | 路径字符串 | 普通图片路径（可写成 `{ src, alt }`） |
| `parts` | 否 | `{ id, label, text }[]` | 顶部分区切换按钮及底部对应的说明文字 |
| `caption` | 否 | 字符串 | 图框下方的图注说明 |
