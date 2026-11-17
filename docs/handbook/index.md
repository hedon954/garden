---
title: Garden 用户手册
description: 一个面向深度长文与 AI 协作的开源个人博客框架：用纯 Markdown 沉浸式写作，用自然语言驱动智能 UI，通过 GitHub Pages 零运维发布。
section: overview
order: 0
---

Garden 是一个开源的个人博客引擎（npm 包名 `hd-garden`）。它把站点拆成干净的两层：**你的仓库只保存 Markdown 稿件、配图与一份 `site.config.yaml` 站点身份配置**；排版、智能 UI 编译、全文搜索、RSS 与静态导出全部由引擎完成。

```garden compose
<stack>
  <metric label="阅读正文列" value="740" unit="px" caption="17px 字号与 1.75 行高，宽图外扩至 1040px，宽表外扩至 1340px" />
  <metric label="唯一组件入口" value="1" unit="个围栏" caption="所有说明图、对比卡、文件预览与可调参数统一使用 garden compose" />
  <metric label="运行服务器" value="0" unit="台必需" caption="公开阅读端纯静态导出至 GitHub Pages，草稿与源码可留在私有仓库" />
</stack>
```

## 一分钟看懂 Garden 的工作方式

在普通 Markdown 编辑器（如 Typora 或 VS Code / Cursor）里写长文时，遇到纯文字讲不清楚的结构、对比或参数关系，只需写一个 `garden compose` 围栏，用自然语言描述你想让读者看到什么：

````markdown
```garden compose
让读者调节每天写作字数和每周动笔天数，还要能切换目标篇幅（4000 字短文 / 8000 字长文 / 15000 字专题），实时算出预计完成周数。
```
````

对 AI Agent 说一句「编译这篇稿件」，Agent 会按照站点内置的 `.agents/skills/garden-compose` 技能扫描原话、编译并只替换这一个围栏，正文其余字节原封不动。编译后的组件在文章中直接渲染为真实可交互的界面：

```garden compose #home-writing-pace
caption: 拖动每日字数或切换目标篇幅，实时估算完稿周期。
intent: |
  让读者调节每天写作字数和每周动笔天数，还要能切换目标篇幅（4000 字短文 / 8000 字长文 / 15000 字专题），实时算出预计完成周数。
---
{@body const [target, setTarget] = DIL.useState(8000)}
{@body const [daily, setDaily] = DIL.useState(600)}
{@body const [days, setDays] = DIL.useState(4)}
{@body const weekly = daily * days}
{@body const weeks = ceil(target / weekly)}

<choice bind="target" label="目标篇幅" options={[{ value: 4000, label: "4000 字短文" }, { value: 8000, label: "8000 字长文" }, { value: 15000, label: "15000 字专题" }]} />
<slider bind="daily" label="每次动笔字数" min={200} max={2000} step={100} unit="字" />
<slider bind="days" label="每周动笔天数" min={1} max={7} step={1} unit="天" />

<columns>
  <stat label="每周产出" value={weekly} unit="字" />
  <stat label="预计完稿需要" value={weeks} unit="周" hint="不足一周按一周计" />
</columns>
```

## 章节导览

```garden compose
<icon-list>
  <entry icon="book-open" title="使用指南">
    <text>从零初始化站点、最小配置、双仓公开部署、AI 协作三步闭环、全功能教程，到独立管理后台的界面说明与部署方案。入口见 [使用指南](/garden/guide/)。</text>
  </entry>
  <entry icon="compass" title="框架设计">
    <text>从读者沉浸式阅读与作者低心智负担两个维度拆解设计原则，说明 Claude 纸墨风格与 ChatGPT Intelligent UI 的实现参考，以及编译、外链抓取、搜索的底层原理。入口见 [框架设计](/garden/design/)。</text>
  </entry>
  <entry icon="layout-grid" title="内置组件">
    <text>逐一演示链接卡片、图片与 Bilibili / YouTube 视频、来源胶囊、HTML / PDF / Excalidraw 文件内嵌、智能 UI 与 21 种常用图示，均配双端真实渲染与在线演练场。入口见 [内置组件](/garden/components/)。</text>
  </entry>
  <entry icon="terminal" title="常用脚本">
    <text>日常写作与校验高频使用的 Makefile 目标、garden CLI 与底层脚本、以及支撑 AI Native 协作的 skills 与 AGENTS.md。入口见 [常用脚本](/garden/scripts/)。</text>
  </entry>
  <entry icon="puzzle" title="扩展插件">
    <text>在 Typora 与 VS Code / Cursor 中通过 /garden 图形列表快捷插入说明草稿、原位实时预览交互组件与折叠长围栏。入口见 [扩展插件](/garden/extensions/)。</text>
  </entry>
</icon-list>
```
