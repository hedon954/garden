---
title: 组件参考 · figure
navTitle: figure
description: 一张带切换按钮的结构图，点到哪个部分就高亮并显示对应说明。
section: reference
order: 6
badge: figure
---

[← 组件参考](/garden/reference) · [用法：分区结构图](/garden/components/figure)

## 示例

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

## 字段写法

````markdown
```garden figure
svg: |      # 三选一，内联 SVG
image:      # 三选一，图片路径
mermaid: |  # 三选一，Mermaid 源码
alt:        # 可选，图片替代文本
parts:      # 可选，切换按钮
  - id:     # 对应 data-p
    label:  # 必填，按钮文字（或 name）
    text:   # 必填，说明
caption:    # 可选，图注
```
````

## 字段

围栏写 ` ```garden figure `（编辑器代码片段触发词 `;gfigure`）。YAML 语法错误或顶层含未知键名时整块报 `garden-yaml` 错误。

| 字段 | 是否必填 | 默认值 | 取值与限制 | 说明 |
| :--- | :--- | :--- | :--- | :--- |
| `svg` | 与 `image`、`mermaid` 三选一 | `---` 分隔线下的 `<svg>` 正文或 `""` | 多行 `<svg>` 字符串 | 内联 SVG 源码；在需要随按钮高亮的图形元素上标注 `data-p="<id>"`（颜色建议使用 `var(--card)`、`var(--ink)`、`var(--muted)` 等主题变量以适配深色模式） |
| `image` | 与 `svg`、`mermaid` 三选一 | 无 | 图片路径字符串 | 静态结构图路径 |
| `alt` | 可选 | 同 `caption`（再回退为 `""`） | 字符串 | `image` 的替代文本 |
| `mermaid` | 与 `svg`、`image` 三选一 | 无 | 多行字符串 | Mermaid 图源码 |
| `parts` | 可选 | `[]`（初始选中项默认 `parts[0].id` 或 `"all"`） | 对象数组 | 图上方的切换按钮与图下方的对应说明 |
| `parts[].id` | 建议填写 | 同 `parts[].name` 或 `parts[].label` | 字符串 | 对应 SVG 元素上的 `data-p` 标识（写 `"all"` 或 `"全部"` 时高亮全部区域） |
| `parts[].label` | 必填（或写 `name`） | `"部分 N"`（按序号生成） | 字符串 | 切换按钮上显示的文字 |
| `parts[].text` | 必填 | `""` | 字符串 | 选中该按钮时在图下方显示的说明文字 |
| `caption` | 可选 | 无 | 字符串 | 图框底部的图注 |

## 限制与报错

- 除通用的 `garden-yaml` 外，本组件没有专属报错代码；表里写「不做校验」的建议值不会报错。
