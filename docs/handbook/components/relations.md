---
title: 关系图（relations）
navTitle: 关系图
description: 把 3～6 个要素排在圆周上，用显式的实线、虚线、单双向箭头和标签画出谁影响谁；窄屏下改为逐项列出连线。
section: components
order: 40
badge: relations
---

`garden relations` 把 3～6 个要素按顺时针排在圆周上（第 1 项在正上方），只绘制 `links` 里显式写出的连线：首尾相接的循环写成 `1 → 2 → 3 → 4 → 1`，中心牵引或多向互动则直接列出对应节点之间的连线。节点没有强调色（`accent` / `highlight`）选项，所有要素权重相同。

在 `garden` 想法块里写一句「用 `relations` 画出选书、共读、讨论、复盘四个环节的闭环，并加两条跨环节虚线」，Agent 会按 `garden-ui` skill 生成下面的闭环关系图（手写格式附后）。

```garden relations
items:
  - title: 选书
    text: 定下这个月读什么
  - title: 共读
    text: 每周读完约定的章节
  - title: 讨论
    text: 见面聊各自的看法
  - title: 复盘
    text: 记下下次要改的地方
links:
  - from: 1
    to: 2
  - from: 2
    to: 3
  - from: 3
    to: 4
  - from: 4
    to: 1
  - from: 3
    to: 1
    style: dashed
    label: 影响选书
  - from: 2
    to: 4
    style: dashed
caption: 四个环节互相提供信息，而不是按固定顺序走一遍。
```

````markdown
```garden relations
items:
  - title: 选书
    text: 定下这个月读什么
  - title: 共读
    text: 每周读完约定的章节
  - title: 讨论
    text: 见面聊各自的看法
  - title: 复盘
    text: 记下下次要改的地方
links:
  - from: 1
    to: 2
  - from: 2
    to: 3
  - from: 3
    to: 4
  - from: 4
    to: 1
  - from: 3
    to: 1
    style: dashed
    label: 影响选书
  - from: 2
    to: 4
    style: dashed
caption: 四个环节互相提供信息，而不是按固定顺序走一遍。
```
````

不成圈的关系同样用 `links` 表达，`direction: both` 会在两端都加上箭头，`label` 会在连线上画出短标签：

```garden relations
items:
  - title: 组织者
    text: 每月发一次通知
  - title: 成员
    text: 八到十个邻居
  - title: 场地
    text: 咖啡馆或图书馆
  - title: 书单
    text: 大家轮流提名
links:
  - from: 1
    to: 2
    label: 邀请
  - from: 1
    to: 3
    label: 预约
  - from: 1
    to: 4
    label: 汇总
  - from: 2
    to: 4
    style: dashed
    direction: both
    label: 提名
caption: 组织者连着其余三个；成员和书单互相影响。
```

````markdown
```garden relations
items:
  - title: 组织者
    text: 每月发一次通知
  - title: 成员
    text: 八到十个邻居
  - title: 场地
    text: 咖啡馆或图书馆
  - title: 书单
    text: 大家轮流提名
links:
  - from: 1
    to: 2
    label: 邀请
  - from: 1
    to: 3
    label: 预约
  - from: 1
    to: 4
    label: 汇总
  - from: 2
    to: 4
    style: dashed
    direction: both
    label: 提名
caption: 组织者连着其余三个；成员和书单互相影响。
```
````

容器宽度不超过 `560px` 的窄屏下，组件不会绘制圆环和 SVG 连线，而是把节点改为单列纵向排列，并在每个节点下方用文字逐条列出它发出的连线（实线单向为 `→`，虚线单向为 `⇢`，实线双向为 `↔`，虚线双向为 `⇠⇢`，后面紧跟目标节点标题与 `label`；`direction: both` 的连线会同时出现在两端节点下方）。

- **用**：三到六个关键要素，读者需要看清谁影响谁、哪些是双向的；首尾相接的循环也用它，把每一步写成一条 `link`。
- **别用**：要素更多、有分支或先后顺序时，用 ```` ```mermaid ```` 流程图；只走一遍的步骤用 `garden list`。要素数量不在 3～6 个之间或 `links` 配置有误时，`npx garden check` 会报 `garden-relations` 错误。

| 字段 | 必填 | 类型 | 说明 |
| :--- | :--- | :--- | :--- |
| `title` | 否 | 字符串 | 关系图顶部的标题 |
| `items` | 是 | 数组（3～6 项） | 排在圆周上的要素节点，按顺时针从正上方开始排列 |
| `items[].title` | 建议 | 字符串 | 节点名称（与 `text` 至少填一项） |
| `items[].text` | 建议 | 字符串 | 节点下方的简短说明 |
| `links` | 否 | 数组 | 节点之间的有向或双向连线 |
| `links[].from` | 是 | 序号（`1..N`）或节点 `title` | 起点节点（从 `1` 开始计数，不能与 `to` 相同） |
| `links[].to` | 是 | 序号（`1..N`）或节点 `title` | 终点节点（从 `1` 开始计数，不能与 `from` 相同） |
| `links[].style` | 否 | `"solid"` \| `"dashed"` | 实线（默认）或虚线 |
| `links[].direction` | 否 | `"one"` \| `"both"` | 单向箭头（默认）或双向箭头 |
| `links[].label` | 否 | 字符串 | 标在连线中段的短说明 |
| `caption` | 否 | 字符串 | 关系图底部的说明小字 |
