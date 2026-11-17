---
title: 扩展插件
navTitle: 扩展插件
description: 总览 Garden 为 Typora 与 VS Code / Cursor 提供的原生辅助扩展：共享 21 种推荐图示选择器、原位实时交互预览与零密钥安全边界。
section: extensions
order: 50
---

写长文最舒服的状态，是始终留在你最熟悉的本地 Markdown 编辑器里，而不是频繁切去浏览器抄模板或盲猜渲染效果。

Garden 随 `hd-garden` npm 包直接内置了 **Typora** 与 **VS Code / Cursor** 两款编辑器扩展（版本号与引擎严格同步，无需从第三方插件市场单独寻找匹配版本）。一条命令即可同时检测并安装：

```bash
npx garden editors install
```

也可以按需指定只装其中一款：

```bash
npx garden editors install --typora
npx garden editors install --vscode
```

## 两款插件的共同设计契约

```garden compose
<compare>
  <item>
    <text>🧩 共享同一套图示与渲染核。21 种图示和预览运行时一致，编辑器与线上效果相同。</text>
  </item>
  <item>
    <text>🔒 纯本地辅助。不调用模型、不存密钥，只做插入指引、预览与语法检查。</text>
  </item>
</compare>
```

## 本章目录

```garden compose
<figure frame="none">
  <timeline title="扩展插件阅读顺序">
    <event date="01" title="[Typora](/garden/extensions/typora/)">
      <text>输入 / 呼出带缩略图的 /garden 菜单，离开围栏后原位变成可交互卡片。</text>
    </event>
    <event date="02" title="[VS Code / Cursor](/garden/extensions/vscode/)">
      <text>双栏源码与 Agent 同屏。另有 CodeLens、波浪线诊断和长围栏折叠。</text>
    </event>
  </timeline>
</figure>
```
