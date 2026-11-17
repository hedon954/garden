---
title: 常用脚本
navTitle: 常用脚本
description: 总览 Garden 站点中的三层自动化入口：Makefile 高频命令、garden CLI 与底层脚本，以及 AI Native 的 skills / AGENTS.md 协作套件。
section: scripts
order: 40
---

Garden 的自动化工具链分为职责清晰的三层：作者日常只需敲最短的 **`Makefile` 目标**；没有 `make` 的环境或需要细粒度控制时直接调用 **`npx garden` CLI 与脚本**；而在编辑器里配合 AI Agent 协作时，Agent 直接通过站点内的 **`AGENTS.md` 与 `.agents/skills/`** 调用同一套校验与写回工具。

```garden compose
<row align="stretch">
  <box padding="3" radius="lg" border="subtle">
    <badge>日常作者层</badge>
    <title>Makefile</title>
    <text>封装 new、dev、check diff、check、build、update，一条短命令串联安装检查与构建。</text>
  </box>
  <box padding="3" radius="lg" border="subtle">
    <badge tone="accent">权威引擎层</badge>
    <title>garden CLI & scripts</title>
    <text>提供 sync、verify、check、links、images、files 与 garden ui 全套原子子命令。</text>
  </box>
  <box padding="3" radius="lg" border="subtle">
    <badge tone="tip">AI 协作层</badge>
    <title>skills / AGENTS.md</title>
    <text>约束 Agent 按需查目录、按哈希单块写回，不编造语法、不误改作者正文。</text>
  </box>
</row>
```

## 本章目录

```garden compose
<figure frame="none">
  <timeline title="常用脚本阅读顺序">
    <event title="[Makefile](/garden/scripts/makefile/)">
      <text>拆解全部目标、TITLE / SLUG / DIR / URL / FILE / MESSAGE，以及 make update 的安全门禁。</text>
    </event>
    <event title="[scripts](/garden/scripts/cli/)">
      <text>npx garden 子命令、garden ui 工具链，以及引擎底层资源与构建校验脚本。</text>
    </event>
    <event title="[skills/AGENTS.md](/garden/scripts/ai-kit/)">
      <text>AGENTS.md、garden-compose、garden-post-review 与 pre-commit 钩子如何协同。</text>
    </event>
  </timeline>
</figure>
```
