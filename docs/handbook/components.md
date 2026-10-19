---
title: 内置组件总览：什么时候用、怎么选
description: 9 个英文名组件（card、stat、compare、timeline、chart、figure、html、interactive、file）的用途对比与写法速查。
section: components
order: 1
---

## 先判断需不需要用组件

Garden 内置了 9 个展示组件，都在代码块开头写 ````garden <组件英文名>`，里面按 YAML 格式填内容。

动笔之前可以先看一眼这条简单的经验：**如果普通段落、列表或表格已经能说清楚，就直接写普通 Markdown。** 只有当普通文字排出来不好看、或者读者确实需要点按交互时，再用下面这些组件。

```garden compare
items:
  - title: 直接写普通 Markdown
    text: 几句话能讲清的结论写段落；多列参数写表格；改代码用 diff。
    写法: 段落 / 表格 / diff
  - title: 适合用内置组件
    text: 并排摆实验数字、左右对比方案、点选结构图分区或放文件下载。
    写法: stat / compare / figure
```

## 9 个内置组件速查表

所有组件名都是简短的英文单词：

| 组件名（英文） | 怎么写开头 | 用来干什么 | 常用字段 |
| :--- | :--- | :--- | :--- |
| [`card`](/garden/components/card) | ````garden card` | 介绍一篇论文、一个开源项目或某个模块，下方可列编号要点 | `title`、`url`、`meta`、`description`、`points`、`source` |
| [`stat`](/garden/components/stat) | ````garden stat` | 把 2–6 个关键数字、耗时或百分比并排摆出来 | `items`、`label`、`value`、`unit`、`caption`、`source` |
| [`compare`](/garden/components/compare) | ````garden compare` | 两到三栏并排对比不同做法的优劣 | `items`（每项可写 `"标题：说明"` 或 `{ title, text, ... }`） |
| [`timeline`](/garden/components/timeline) | ````garden timeline` | 按时间或步骤顺序串起故障复盘或演进过程 | `title`、`items`（含 `date`、`title`、`text`、`source`） |
| [`chart`](/garden/components/chart) | ````garden chart` | 画比例条形图，下方自带可展开的完整数字表格 | `title`、`x`、`series`、`data`、`unit`、`caption` |
| [`figure`](/garden/components/figure) | ````garden figure` | 给 SVG 结构图或配图加上可点选的分区按钮和说明 | `svg`、`image`、`parts`、`caption` |
| [`html`](/garden/components/html) | ````garden html` | 嵌入自己写的 HTML/SVG 片段、选项卡、小测验或画布动画 | `src`、`code`、`title`、`height` |
| [`interactive`](/garden/components/interactive) | ````garden interactive` | 放滑杆、开关或步骤条，让读者自己改参数看计算结果和曲线 | `id`、`caption`、`intent`、`expect` + 下方控件 |
| [`file`](/garden/components/file) | ````garden file` | 放单个或多个附件供下载，支持 PDF、表格和文档在页内拉开预览 | `src`、`title`、`note`、`files` |

## 写组件时的三个小提醒

1. **写错名字会有提示**：如果你不小心把组件名或字段名拼错了（比如把 `garden card` 写成 `garden car`），运行 `make check` 时会直接告诉你哪一行写错了、正确的名字叫什么。
2. **文字里带英文冒号记得加引号**：因为组件里面用的是 YAML 格式，如果某一行文字里刚好有「英文冒号 + 空格」（`: `），请用双引号把整句包起来（比如 `caption: "P99: 降低 42%"`）。
3. **写草稿时可以先留白记想法**：如果你正在写长文，不想停下来查组件字段，可以先写一个不带名字的 ````garden` 代码块，在里面随手记一句「这里后面放个对比表」，等写完初稿再补全。
