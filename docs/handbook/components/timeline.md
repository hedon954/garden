---
title: 时间线（timeline）
navTitle: 时间线
description: 按时间或阶段顺序排开版本演进、排查经过或关键节点。
section: components
order: 34
badge: timeline
---

```garden timeline
title: 静态发布流水线执行步骤
items:
  - date: 步骤 1
    title: 同步内容与静态资源
    text: 校验文章信息、复制图片附件并生成搜索索引与 RSS。
  - date: 步骤 2
    title: 构建静态站点产物
    text: 把全部页面预渲染到静态目录。
  - date: 步骤 3
    title: 校验静态页面并部署
    text: 检查导出文件完整无误后发布到 GitHub Pages。
```

- **什么时候用**：版本演进、故障排查时间点或按先后顺序推进的阶段。
- **什么时候不用**：没有时间顺序的并列要点用普通列表或[图标列表](/garden/components/list)。

可以这样对 AI 说：

````markdown
```garden
按时间顺序把静态发布流水线的三个阶段列出来。
```
````

## 字段说明

全部字段、默认值、取值限制和报错代码见 [组件参考 · timeline](/garden/reference/timeline)。
