---
title: 并排对比（compare）
navTitle: 并排对比
description: 把两到三种方案左右并列，对比各自的取舍与属性。
section: components
order: 33
badge: compare
---

在 `garden` 想法块里写一句「用 `compare` 并排比较用一句话描述代码改动和手写 diff 两种做法」，Agent 会按 `garden-ui` skill 生成下面的 `garden compare`（手写格式附后）。

```garden compare
items:
  - title: 写一句话说明改了什么
    text: 想法块紧跟在完整代码下面，garden-ui 把它换成 diff，页面合成「代码 / 对比上一版」。
  - title: 手写 diff
    text: 完整代码下面紧跟一段 diff；前面没有完整代码时，garden check 报 diff-orphan。
```

````markdown
```garden compare
items:
  - title: 写一句话说明改了什么
    text: 想法块紧跟在完整代码下面，garden-ui 把它换成 diff，页面合成「代码 / 对比上一版」。
  - title: 手写 diff
    text: 完整代码下面紧跟一段 diff；前面没有完整代码时，garden check 报 diff-orphan。
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
