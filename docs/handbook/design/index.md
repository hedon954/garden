---
title: 框架设计
navTitle: 框架设计
description: 阐述 Garden 从读者与作者双重视角出发的设计原则、Claude 与 ChatGPT Intelligent UI 的实现参考，以及自动化编译与渲染的底层原理。
section: design
order: 20
---

技术博客框架常见的痛点往往来自两端失衡：要么页面堆满侧栏挂件、彩色标签、阅读进度条与花哨动效，打断读者的长文专注力；要么要求作者为了画一张结构图去写 MDX、调 CSS 类名甚至维护一套 React 组件库，把写文章变成写前端工程。

Garden 的全部设计决策只围绕一个目标展开：**把版面的克制与安静留给读者，把纯文本的自由与 AI Native 的表达力留给作者。**

```garden compose
<compare>
  <item>
    <text>📖 对读者：沉浸式长文阅读。暖白纸墨色阶、三级弹性宽度、宽元素自动避让目录、图片零抖动。</text>
  </item>
  <item>
    <text>✍️ 对作者：AI Native 创作。保留纯 Markdown 手感，复杂图示一句自然语言即可编译。</text>
  </item>
</compare>
```

## 本章目录

```garden compose
<figure frame="none">
  <timeline title="框架设计阅读顺序">
    <event title="[设计原则](/garden/design/principles/)">
      <text>读者侧：色彩、字体、行宽、目录避让与图片尺寸。作者侧：低负担写作与 AI Native 闭环。</text>
    </event>
    <event title="[实现参考](/garden/design/references/)">
      <text>阅读气质借鉴 Claude，交互表达还原 ChatGPT Intelligent UI，并改成安全沙箱。</text>
    </event>
    <event title="[底层原理](/garden/design/internals/)">
      <text>Git 真源、编译管线、Compose 边界、外链元数据、矢量内联与双层检索。</text>
    </event>
  </timeline>
</figure>
```
