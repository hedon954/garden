---
title: 并排对比（compare）
navTitle: 并排对比
description: 把两到三种方案左右并列，对比各自的取舍与属性。
section: components
order: 33
badge: compare
---

TODO(copy:component-compare-opener)

```garden compare
items:
  - title: TODO(copy:compare-a-title)
    text: TODO(copy:compare-a-text)
  - title: TODO(copy:compare-b-title)
    text: TODO(copy:compare-b-text)
```

````markdown
```garden compare
items:
  - title: TODO(copy:compare-a-title)
    text: TODO(copy:compare-a-text)
  - title: TODO(copy:compare-b-title)
    text: TODO(copy:compare-b-text)
```
````

- **用**：并排对比 2～3 种方案、配置方式或改动前后的行为差异时（每格文字控制在 60 字以内）。
- **别用**：对比项超过 3 个或需要横向对齐多个参数维度时，直接用 Markdown 表格。

| 字段 | 必填 | 类型 | 说明 |
| :--- | :--- | :--- | :--- |
| `items` | 是 | 数组（至少 2 项） | 对比项列表；每项也可简写为 `"标题：说明"` 单行字符串 |
| `items[].title` | 建议 | 字符串 | 该对比列的标题 |
| `items[].text` | 建议 | 字符串或字符串数组 | 该对比列的正文说明 |
| `items[].<自定义键>` | 否 | 字符串或数字 | 除 `title` / `text` 外的附加键值会渲染在卡片底部的属性标签行 |
