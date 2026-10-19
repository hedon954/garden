---
title: 并排对比（compare）
navTitle: 并排对比
description: 把两到三种方案左右并列，直观对比各自的取舍与属性。
section: components
order: 33
badge: compare
---

```garden compare
items:
  - title: 单个公开仓库
    text: 源文件与构建产物都在同一个仓库，直接开启 Actions 部署。
    草稿可见性: 公开可见
    额外密钥: 无需配置
  - title: 私有源码仓 + 公开页面仓
    text: 在私仓写作，构建后把静态页面推到公开的 github.io 仓库。
    草稿可见性: 仅自己可见
    额外密钥: PAGES_DEPLOY_KEY
```

```markdown
```garden compare
items:
  - title: 单个公开仓库
    text: 源文件与构建产物都在同一个仓库，直接开启 Actions 部署。
    草稿可见性: 公开可见
    额外密钥: 无需配置
  - title: 私有源码仓 + 公开页面仓
    text: 在私仓写作，构建后把静态页面推到公开的 github.io 仓库。
    草稿可见性: 仅自己可见
    额外密钥: PAGES_DEPLOY_KEY
```
```

- **用**：并排对比 2～3 种方案、配置方式或改动前后的行为差异时（每格文字控制在 60 字以内）。
- **别用**：对比项超过 3 个或需要横向对齐多个参数维度时，直接用 Markdown 表格。

| 字段 | 必填 | 类型 | 说明 |
| :--- | :--- | :--- | :--- |
| `items` | 是 | 数组（至少 2 项） | 对比项列表；每项也可简写为 `"标题：说明"` 单行字符串 |
| `items[].title` | 建议 | 字符串 | 该对比列的标题 |
| `items[].text` | 建议 | 字符串或字符串数组 | 该对比列的正文说明 |
| `items[].<自定义键>` | 否 | 字符串或数字 | 除 `title` / `text` 外的附加键值会渲染在卡片底部的属性标签行 |
