---
title: 选择卡（choice）
navTitle: 选择卡
description: 给出两三个具体选项卡片，读者点选后看到对应的回应。
section: components
order: 42
badge: choice
---

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

可以这样对 AI 说：

````markdown
```garden
放一组选择卡让读者在街角咖啡馆（40 元含饮料，重氛围）和社区图书馆（免费，重安静）之间选一个，底部加一个「都不合适」按钮。
```
````

窄屏下卡片会排成一列；用键盘方向键也能在选项之间切换。

- **什么时候用**：给读者两三个具体选项让他选一个，每个选项带图标、一个醒目的数字或价格和一句说明。
- **什么时候不用**：选项会改变后面的公式或图表计算结果时，用[可调公式与参数](/garden/components/interactive)。
