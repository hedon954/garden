---
title: 分区结构图（figure）
navTitle: figure
description: 已废弃。新的说明图写 compose。旧的 garden figure 围栏仍会渲染。
section: components
order: 47
badge: figure
---

`garden figure` 已废弃。新的说明图写 [compose](/garden/components/compose)。旧稿里的围栏仍会渲染，不要再写新的。

原来的三步发布流程现在是一张 compose：

```garden compose
title: 静态发布
caption: 点一步，看这一步做什么
intent: |
  画一张静态发布流程，点到哪一步就显示那一步的说明。
steps:
  - id: sync
    title: 同步内容
    text: 扫描正文与随文附件
  - id: build
    title: 构建页面
    text: 预渲染路由，输出 RSS 与搜索
  - id: validate
    title: 导出校验
    text: 确认导出目录里有 index.html
notes:
  - for: sync
    text: 扫描正文与随文附件，生成站点内容数据。
  - for: build
    text: 预渲染所有页面路由，输出 RSS、sitemap 与全文搜索文件。
  - for: validate
    text: 确认导出目录里有 index.html，且没有混入源码或配置文件。
```

旧字段仍见 [组件参考 · figure](/garden/reference/figure)。
