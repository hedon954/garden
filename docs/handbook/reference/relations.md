---
title: 组件参考 · relations
navTitle: relations
description: 把三到六个要素排成环或中心辐射结构，画出谁影响谁、哪些是双向的。
section: reference
order: 10
badge: relations
---

[← 组件参考](/garden/reference) · [用法：关系图](/garden/components/relations)

## 示例

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

## 字段写法

````markdown
```garden relations
title:          # 可选，无障碍标签
items:          # 必填，3–6 项
  - title:      # 必填，要素名
    text:       # 可选，一句说明
center:         # 可选，序号或标题
links:          # 可选，连线列表
  - from:       # 必填，序号或标题
    to:         # 必填，不能同 from
    style:      # solid | dashed
    direction:  # one | both
    label:      # 可选，短标签
caption:        # 可选，图注
```
````

## 字段

围栏写 ` ```garden relations `（编辑器代码片段触发词 `;grel`）。节点没有强调色选项，所有要素视觉权重相同；其他图形直接写 ` ```mermaid ` 围栏，只走一遍的步骤用 `garden list`。YAML 语法错误或顶层含未知键名时整块报 `garden-yaml` 错误。

| 字段 | 是否必填 | 默认值 | 取值与限制 | 说明 |
| :--- | :--- | :--- | :--- | :--- |
| `title` | 可选 | 无障碍标签默认 `"关系图"`（不渲染可视标题） | 字符串 | 关系图上方的标题 |
| `items` | 必填 | 无 | 对象数组，严格 `3`～`6` 项（少于 `3` 项或多于 `6` 项报 `garden-relations` 错误） | 要素列表；未设 `center` 时从正上方（12 点钟方向）起顺时针均布在椭圆上 |
| `items[].title` | 必填 | `""` | 字符串 | 节点标题（`links` 与 `center` 按序号或完整标题引用节点） |
| `items[].text` | 可选 | `""` | 字符串 | 节点标题下方的一句短说明 |
| `center` | 可选 | 无（全部要素排在外圈椭圆上） | `1..N` 序号（从 `1` 开始）或节点完整 `title`（找不到对应要素时报 `garden-relations` 错误） | 写在 `items` 与 `links` 之间：把该要素放在正中间，其余要素从正上方起顺时针均布在外圈；不做自动识别 |
| `links` | 可选 | `[]` | 对象数组（非数组或条目含未知键名时报 `garden-relations` 错误） | 节点之间的连线；外圈相邻要素连线向外轻弧弯曲，其余连线从中间直穿；首尾相接的循环把每一步写成一条 `link`（如 `1->2`、`2->3`、`3->4`、`4->1`） |
| `links[].from` | 必填 | 无 | `1..N` 序号或节点完整 `title`，且不能与 `to` 相同（缺失、找不到要素或与 `to` 相同时报 `garden-relations` 错误） | 起点要素 |
| `links[].to` | 必填 | 无 | `1..N` 序号或节点完整 `title`，且不能与 `from` 相同（缺失、找不到要素或与 `from` 相同时报 `garden-relations` 错误） | 终点要素 |
| `links[].style` | 可选 | `"solid"` | `"solid"` \| `"dashed"`（其他取值报 `garden-relations` 错误） | 实线（`→` / `↔`）或虚线（`⇢` / `⇠⇢`） |
| `links[].direction` | 可选 | `"one"` | `"one"` \| `"both"`（其他取值报 `garden-relations` 错误） | 单向箭头（指向 `to`）或两端双箭头 |
| `links[].label` | 可选 | `""` | 短字符串（非字符串类型报 `garden-relations` 错误） | 连线上的短标签（带底色衬垫并自动避开线条交叉点；在连线上放不下时改为圆圈序号，并在图下列出，如「`① 限制：预算 → 场地`」） |
| `caption` | 可选 | 无 | 字符串 | 关系图底部的图注 |

## 限制与报错

- `garden-relations`：`items` 少于 3 项或多于 6 项；`center` 找不到要素；`links` 不是列表或条目含未知键名；`from` / `to` 缺失、找不到或相同；`style`、`direction` 取值不对；`label` 不是字符串。
- 要素更多、有分支时改用 ```` ```mermaid ```` 流程图；只走一遍的步骤用 `garden list`。
