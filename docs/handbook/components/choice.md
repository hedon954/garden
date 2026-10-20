---
title: 选择卡（choice）
navTitle: 选择卡
description: 给出两三个带图标、醒目数值和标签的选项卡片，支持底部单行兜底按钮与点选回应。
section: components
order: 42
badge: choice
---

在 `garden` 想法块里写一句「用 `choice` 让读者在咖啡馆和社区图书馆两个场地之间选一个，带价格、倾向标签、选中回应和都不合适按钮」，Agent 会按 `garden-ui` skill 生成下面的 `garden choice`（手写格式附后）。

```garden choice
title: 下个月在哪里见面？
items:
  - icon: idea
    value: ¥40 / 人
    text: 街角咖啡馆，含一杯饮料
    label: 更看重氛围
    reply: 选了咖啡馆。我们会提前订好靠窗的长桌。
  - icon: book
    value: 免费
    text: 社区图书馆活动室，需提前预约
    label: 更看重安静
    reply: 选了图书馆。我们会在月初提交预约。
none:
  label: 都不合适 / 说不清
  reply: 没关系，我们会在群里再列几个场地。
caption: 示意交互，场地和价格均为虚构。
```

````markdown
```garden choice
title: 下个月在哪里见面？
items:
  - icon: idea
    value: ¥40 / 人
    text: 街角咖啡馆，含一杯饮料
    label: 更看重氛围
    reply: 选了咖啡馆。我们会提前订好靠窗的长桌。
  - icon: book
    value: 免费
    text: 社区图书馆活动室，需提前预约
    label: 更看重安静
    reply: 选了图书馆。我们会在月初提交预约。
none:
  label: 都不合适 / 说不清
  reply: 没关系，我们会在群里再列几个场地。
caption: 示意交互，场地和价格均为虚构。
```
````

整组选项按 `role="radiogroup"` 渲染，支持键盘聚焦与方向键（`ArrowLeft` / `ArrowRight` / `ArrowUp` / `ArrowDown`）在各张卡片及底部 `none` 按钮之间循环切换。桌面端按两列或三列并排；窄屏下选项卡片自动改为单列纵向堆叠（不会挤成两列）。可选的 `none: { label, reply }` 固定在卡片下方显示为单行文字按钮，点选任一卡片或 `none` 后会在下方展开对应的 `reply`。

- **用**：给读者两三个具体选项让他选一个，每个选项有图标、一个醒目的数字和一句说明。
- **别用**：选项会改变后面的公式或计算结果时，写成想法，编译成 `interactive`。

| 字段 | 必填 | 类型 | 说明 |
| :--- | :--- | :--- | :--- |
| `title` | 否 | 字符串 | 选择卡顶部的提问或标题 |
| `items` | 是 | 数组（2～3 项） | 选项卡片列表 |
| `items[].icon` | 否 | 字符串 | 选项顶部的线条图标名（与 `garden list` 共用 23 个图标名） |
| `items[].value` | 建议 | 字符串或数字 | 卡片上醒目展示的价格、数字或短结论 |
| `items[].text` | 建议 | 字符串 | 对该选项的一句具体说明 |
| `items[].label` | 否 | 字符串 | 卡片底部带圆点的倾向标签 |
| `items[].reply` | 否 | 字符串 | 读者点选该卡片后在下方显示的回应文字 |
| `none` | 否 | `{ label, reply? }` | 卡片下方占满一行的兜底文字按钮（如「都不合适」）及点选后的回应 |
| `caption` | 否 | 字符串 | 组件底部的说明小字 |
