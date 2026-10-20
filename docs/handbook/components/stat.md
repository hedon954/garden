---
title: 数字指标（stat）
navTitle: 数字指标
description: 把 2～4 个关键数字、单位与一句说明并排摆出来。
section: components
order: 32
badge: stat
---

```garden stat
items:
  - label: 正文列宽
    value: "740"
    unit: px
    caption: 默认阅读列宽度
  - label: 宽图上限
    value: "1040"
    unit: px
    caption: 左右各最多向外延伸 150px
  - label: 宽表上限
    value: "1340"
    unit: px
    caption: 左右各最多向外延伸 300px
```

可以这样对 AI 说：

````markdown
```garden
把正文列宽 740px、宽图上限 1040px 和宽表上限 1340px 三个数字并排摆出来。
```
````

- **什么时候用**：把分散在段落里的两到四个关键数字、阈值或规格并排展示。
- **什么时候不用**：只有一个数字时留在正文句子里；数字会随读者选择变化时让 AI 做成[可调公式与参数](/garden/components/interactive)；有多行多列维度时直接用表格。
