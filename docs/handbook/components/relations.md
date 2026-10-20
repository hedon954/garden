---
title: 关系图（relations）
navTitle: 关系图
description: 把三到六个要素排成环或中心辐射结构，画出谁影响谁、哪些是双向的。
section: components
order: 40
badge: relations
---

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

- **什么时候用**：三到六个关键要素，读者需要看清谁影响谁、哪些是双向的；首尾相接的循环或单中心向外辐射的关系都用它。
- **什么时候不用**：要素更多、有条件分支时用 Mermaid 流程图；只走一遍的步骤用[图标列表](/garden/components/list)。

可以这样对 AI 说：

````markdown
```garden
把选书、共读、讨论、复盘这四个环节的循环关系画出来，再标出讨论影响选书、共读影响复盘。
```
````

## 中心节点与外圈要素（`center`）

当其中一个要素居中、其余要素围在外圈时，在 `items` 与 `links` 之间写 `center: <序号或标题>`（不会自动猜测中心节点；指定的要素放在正中，其余要素从正上方起顺时针均布在外圈）：

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
center: 组织者
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
caption: 组织者放在正中，连着外圈的其余三个；成员和书单互相影响。
```

可以这样对 AI 说：

````markdown
```garden
把组织者放在正中间，外圈放成员、场地、书单：组织者分别邀请成员、预约场地、汇总书单，成员和书单之间双向提名。
```
````

各要素按椭圆均布（不设 `center` 时从正上方 12 点钟方向起顺时针排列；设了 `center` 时中心节点居于正中，其余要素在外圈从正上方起顺时针均布），外圈相邻要素之间的连线向外轻弧弯曲，跨节点或连向中心的连线从中间直穿而过。

## 字段说明

全部字段、默认值、取值限制和报错代码见 [组件参考 · relations](/garden/reference/relations)。
