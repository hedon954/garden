---
title: 数字指标（stat）
navTitle: 数字指标
description: 将 2～4 组关键数字、单位与简短说明并排展示。
section: components
order: 32
badge: stat
---

TODO(copy:component-stat-opener)

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

````markdown
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
````

- **用**：把分散在段落里的 2～4 个核心数字、阈值或规格并排摆出来时。
- **别用**：只有一个数字时直接写在正文句子里；有多行多列维度时改用 Markdown 表格。

| 字段 | 必填 | 类型 | 说明 |
| :--- | :--- | :--- | :--- |
| `items` | 否 | 对象数组 | 展示多项指标时使用；单卡可直接把字段写在顶层 |
| `label` | 是 | 字符串 | 指标名称（显示在数字上方） |
| `value` | 是 | 字符串或数字 | 核心数值（等宽大字号显示） |
| `unit` | 否 | 字符串 | 紧跟在数值右侧的单位 |
| `caption` | 否 | 字符串 | 数值下方的简短说明 |
| `text` | 否 | 字符串 | 补充说明文字 |
| `source` | 否 | 字符串或 `{ title, url }` | 数据出处角标 |
