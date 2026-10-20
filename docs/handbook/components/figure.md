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

- **什么时候用**：一张架构图或数据流图，读者点一个区域就能看清那一部分做什么。
- **什么时候不用**：不需要分区点击说明的普通流程图或截图，直接贴图片或画 Mermaid 图。

可以这样对 AI 说：

````markdown
```garden
画一张静态发布流程的结构图，点到哪一步就高亮那一步并显示说明。
```
````

## 字段说明

围栏写 ` ```garden figure `。

| 字段 | 是否必填 | 取值与限制 | 说明 |
| :--- | :--- | :--- | :--- |
| `svg` | 与 `image`、`mermaid` 三选一 | 多行 `<svg>` 字符串 | 内联 SVG 源码；在需要随按钮高亮的图形元素上标注 `data-p="<id>"`（颜色建议使用 `var(--card)`、`var(--ink)`、`var(--muted)` 等主题变量以适配深色模式） |
| `image` | 与 `svg`、`mermaid` 三选一 | 图片路径字符串 | 静态结构图路径 |
| `alt` | 可选 | 字符串 | `image` 的替代文本 |
| `mermaid` | 与 `svg`、`image` 三选一 | 多行字符串 | Mermaid 图内容 |
| `parts` | 可选 | 对象数组 | 图上方的切换按钮与图下方的对应说明 |
| `parts[].id` | 建议填写 | 字符串 | 对应 SVG 元素上的 `data-p` 标识（未填时取 `name` 或 `label`；写 `"all"` 或 `"全部"` 时高亮全部区域） |
| `parts[].label` | 必填（或写 `name`） | 字符串 | 切换按钮上显示的文字 |
| `parts[].text` | 必填 | 字符串 | 选中该按钮时在图下方显示的说明文字 |
| `caption` | 可选 | 字符串 | 图框底部的图注 |
