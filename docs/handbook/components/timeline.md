---
title: 时间线（timeline）
navTitle: 时间线
description: 按时间或步骤顺序排列版本演进、排查过程与关键节点。
section: components
order: 34
badge: timeline
---

不用记下面的写法：在 `garden` 想法块里写一句「按顺序列出静态发布流水线的几个步骤」，Agent 会按 `garden-ui` skill 生成这样的 `garden timeline`。手写格式放在后面，供核对。

```garden timeline
title: 静态发布流水线执行步骤
items:
  - date: 步骤 1
    title: 同步内容与静态资源
    text: 运行 `npx garden sync`，校验 Front Matter、复制图片附件并生成搜索索引与 RSS。
  - date: 步骤 2
    title: 构建静态站点产物
    text: 运行 `STATIC_EXPORT=1 npx garden build`，把全部路由预渲染到 `dist/client/`。
  - date: 步骤 3
    title: 校验静态页面并部署
    text: 运行 `npm run pages:validate` 确认有 `index.html`，且没有混入 `.env`、源码目录、`.map` 或 `.md` 文件和软链接，通过后发布到 GitHub Pages。
```

````markdown
```garden timeline
title: 静态发布流水线执行步骤
items:
  - date: 步骤 1
    title: 同步内容与静态资源
    text: 运行 `npx garden sync`，校验 Front Matter、复制图片附件并生成搜索索引与 RSS。
  - date: 步骤 2
    title: 构建静态站点产物
    text: 运行 `STATIC_EXPORT=1 npx garden build`，把全部路由预渲染到 `dist/client/`。
  - date: 步骤 3
    title: 校验静态页面并部署
    text: 运行 `npm run pages:validate` 确认有 `index.html`，且没有混入 `.env`、源码目录、`.map` 或 `.md` 文件和软链接，通过后发布到 GitHub Pages。
```
````

- **用**：按先后顺序记录故障排查时间点、演进阶段或构建流水线步骤（至少 2 个节点）时。
- **别用**：没有时间或先后顺序的并列要点，直接用无序列表。

| 字段 | 必填 | 类型 | 说明 |
| :--- | :--- | :--- | :--- |
| `title` | 否 | 字符串 | 时间线顶部的总标题 |
| `items` | 是 | 对象数组（至少 2 项） | 按顺序排列的节点列表 |
| `items[].date` | 否 | 字符串 | 时间、阶段或步骤编号（显示在节点标题上方） |
| `items[].title` | 是 | 字符串 | 节点标题 |
| `items[].text` | 否 | 字符串 | 节点详细说明 |
| `items[].source` | 否 | 字符串或 `{ title, url }` | 节点出处角标 |
