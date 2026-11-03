---
title: 说明图
navTitle: 说明图
description: garden compose 的最小例子。颜色走主题变量，浅色和深色都能读。
section: components
order: 36.5
badge: compose
---

一张说明图是 `garden compose`。围栏里先写一句要表达的话，编译之后变成 YAML 树。颜色只走主题变量。

完整字段见 [组件参考 · compose](/garden/reference/compose)。

```garden compose
intent: |
  最小例子：浅底标题，一根向下的箭头，再加一行脚注。
tree:
  - card:
      frame: band
      tone: accent
      align: center
      title: 先写结论
      text: 浅底只包住被强调的那一层
  - arrow: down
  - type: text
    text: "脚注用 muted。靠左就写 align: start。"
    tone: muted
    align: start
```
