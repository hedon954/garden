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

可以这样对 AI 说：

````markdown
```garden
把选书、共读、讨论、复盘这四个环节的循环关系画出来，再标出讨论影响选书、共读影响复盘。
```
````

## 中心节点与外圈要素

当其中一个要素居中、其余要素围在外圈时，AI 会在 `items` 与 `links` 之间写 `center: <序号或标题>`（不会自动猜测中心节点；那个要素放在正中，其余要素从正上方起顺时针均布在外圈）：

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

窄屏下不画圆环与连线，各要素排成一列；连线上的文字标签不会丢掉，而是移到每张卡片下方的关系行末尾（例如「`→ 场地 限制`」「`⇠⇢ 书单 提名`」）。

- **什么时候用**：三到六个关键要素，读者需要看清谁影响谁、哪些是双向的；首尾相接的循环或单中心向外辐射的关系都用它。
- **什么时候不用**：要素更多、有条件分支时用 Mermaid 流程图；只走一遍的步骤用[图标列表](/garden/components/list)。
