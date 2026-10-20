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

- **用**：并排对比 2～3 种方案、配置方式或改动前后的行为差异时（并排每格文字控制在 60 字以内）；或给条目加上 `verdict: good` / `bad` 上下对照正反做法。
- **别用**：对比项超过 3 个或需要横向对齐多个参数维度时，直接用 Markdown 表格。

## 正反做法对照（`verdict: good | bad`）

当对比的是「不好的写法 vs 更好的写法」时，给条目加上 `verdict: bad` 或 `verdict: good`。带 `verdict` 的对比项会改为上下堆叠的卡片，标题左侧自动显示红叉或绿勾图标，且不受并排格约 60 字的 `compare-long` 长度限制：

```garden compare
items:
  - title: 不好的提问
    verdict: bad
    text: 「你读过这位作者的其他作品吗？能分享一段书评吗？」
  - title: 更好的提问
    verdict: good
    text: 「你平时喜欢在什么时间读书？想先旁听一次吗？」
```

````markdown
```garden compare
items:
  - title: 不好的提问
    verdict: bad
    text: 「你读过这位作者的其他作品吗？能分享一段书评吗？」
  - title: 更好的提问
    verdict: good
    text: 「你平时喜欢在什么时间读书？想先旁听一次吗？」
```
````

| 字段 | 必填 | 类型 | 说明 |
| :--- | :--- | :--- | :--- |
| `items` | 是 | 数组（至少 2 项） | 对比项列表；每项也可简写为 `"标题：说明"` 单行字符串 |
| `items[].title` | 建议 | 字符串 | 该对比项的标题 |
| `items[].text` | 建议 | 字符串或字符串数组 | 该对比项的正文说明 |
| `items[].verdict` | 否 | `"good"` 或 `"bad"` | 标为正向（绿勾）或反向（红叉）做法；启用后改为上下堆叠排版 |
| `items[].<自定义键>` | 否 | 字符串或数字 | 并排模式下，除 `title` / `text` 外的附加键值会渲染在卡片底部的属性标签行 |
