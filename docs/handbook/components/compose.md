---
title: 说明图（compose）
navTitle: 说明图
description: 用卡片、箭头和注释讲清一条流程。点一步，下面展开对应说明。
section: components
order: 36
badge: compose
---

```garden compose
title: 站点发布流水线
caption: 点一步，看这一步做什么
intent: |
  用三张卡加向下箭头讲清 sync → build → validate；读者点每一步，下面展开对应说明。
steps:
  - id: sync
    title: sync
    badge: "1"
    text: 同步内容与配置
  - id: build
    title: build
    badge: "2"
    text: 生成静态 HTML
  - id: validate
    title: validate
    badge: "3"
    text: 检查后再上线
notes:
  - for: sync
    text: 先对齐远程与本地材料。
  - for: build
    text: 构建期把 compose 画进页面。
  - for: validate
    text: 钩子拦住还没编译的想法。
```

- **什么时候用**：两三步到八步的流程，读者点哪一步就看哪一步的说明。
- **什么时候不用**：要拖参数时用 [interactive](/garden/components/interactive)。一张真图或 Mermaid 已经够用时，不要再包一层。

编辑器里输入 `/garden`，选「compose（想法）」。插入的是 `garden compose` 围栏加一句白话，不是一大段 YAML。对 AI 说「编译这篇」之后，围栏类型不变，原话留在 `intent`，正文写成 YAML 树。

````markdown
```garden compose
用三张卡加向下箭头讲清 sync → build → validate；读者点每一步，下面展开对应说明。
```
````

窄屏收成一列。颜色走主题变量，浅色和深色都能读。不打开 JavaScript 时，卡片和说明仍在页面里。

全部字段见 [组件参考 · compose](/garden/reference/compose)。最小例子见 [说明图](/garden/components/compose-gallery)。

[figure](/garden/components/figure) 已废弃。旧稿里的 `garden figure` 仍会渲染，新的说明图写 compose。
