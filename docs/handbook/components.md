---
title: 组件总览
navTitle: 组件总览
description: 9 个内置 garden 组件的用途、围栏名称与使用约束。
section: components
order: 30
---

这 9 个组件都可以先在 `garden` 想法块里用一句话描述，交给 Agent 按 `garden-ui` skill 生成（详见 [用 AI 写作](/garden/ai-writing)）。手写时使用 ```` ```garden <name> ```` 代码块插入，组件名固定为英文（`card`、`stat`、`compare`、`timeline`、`chart`、`figure`、`html`、`interactive`、`file`），参数采用 YAML 格式，`interactive` 则在 `---` 下方编写声明式标签。

## 9 个组件速查表

| 组件名 | 代码块围栏 | 适用场景 | 必填字段或下限 |
| :--- | :--- | :--- | :--- |
| [知识卡片](/garden/components/card) | ```` ```garden card ```` | 介绍论文、开源项目或模块要点 | 至少填 `description` 或 `points` |
| [数字指标](/garden/components/stat) | ```` ```garden stat ```` | 并排展示 2～4 组关键数值与单位 | 每项必填 `label` 与 `value` |
| [并排对比](/garden/components/compare) | ```` ```garden compare ```` | 左右并列对比 2～3 种方案或改动前后差异 | `items` 至少 2 项，每格不超过约 60 字 |
| [时间线](/garden/components/timeline) | ```` ```garden timeline ```` | 按先后顺序串联排查记录或演进阶段 | `items` 至少 2 项 |
| [条形图表](/garden/components/chart) | ```` ```garden chart ```` | 用数据绘制比例条形图（自带可展开数据表） | `data` 至少 2 行 |
| [分区结构图](/garden/components/figure) | ```` ```garden figure ```` | 带分区按钮高亮与说明的 SVG / 图片结构图 | `svg` 或 `image` 二选一 |
| [嵌入网页片段](/garden/components/html) | ```` ```garden html ```` | 在沙盒 `iframe` 中运行独立 HTML/JS 演示 | `src` 或 `code` 二选一 |
| [可调公式与参数](/garden/components/interactive) | ```` ```garden interactive ```` | 提供滑杆或单选控件实时计算非平凡公式 | 含输入控件且公式不能是单次乘法 |
| [文件下载与预览](/garden/components/file) | ```` ```garden file ```` | 提供本地或远程文件下载与页内预览 | `src` 或 `files` 二选一 |

## 编写与检查规则

1. **优先使用标准 Markdown**：普通文字说明、有序列表和常规对比表格直接用 Markdown 编写，只有结构化组件能明显提升可读性时才用 `garden` 围栏。
2. **不要重复展示同一组数据**：`chart` 组件下方自带「查看数据表」折叠区，同一小节内不需要再重复手写一张相同数据的 Markdown 表格。
3. **支持行内格式**：各组件的 `text`、`description`、`caption`、`points` 等文本字段均支持行内 `**加粗**`、`` `行内代码` `` 和 `<u>荧光笔下划线</u>`。
4. **本地预览全部组件样式**：运行 `npx garden ui catalog` 会在 `.garden/ui-catalog.html` 生成组件画廊页面，可在浏览器中直接打开查看。
