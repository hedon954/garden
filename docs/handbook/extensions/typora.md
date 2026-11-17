---
title: Typora 扩展
navTitle: typora
navIcon: typora
description: 详解 Garden Typora 扩展的社区插件底座安装步骤、/garden 斜杠菜单插入、原位交互预览与客户端升级恢复方法。
section: extensions
order: 51
---

Typora 拥有无可替代的纯 Markdown 沉浸式写作手感。Garden 为 Typora 提供了专门的 **Garden Intelligent UI** 插件，让你在沉浸写作的同时也能直接点选插入 `garden compose` 图示草稿，并在正文原位直接预览和操作编译后的智能 UI。

---

## 1. 核心能力

1. **输入 `/garden` 可视化插入常用图示**：
   - 在正文新行输入 `/` 即可看到 `/garden` 命令（Windows / Linux 也可按 `Ctrl+Alt+I`，macOS 可在插件设置中按习惯录制快捷键）。
   - 选中后弹出带缩略示意图的 **21 种常用图示列表**（从关联图、发散图、时序泳道、参数调节图到最后一项「其他」自由组合）。
   - 点选任意一项后，插件会在当前光标处直接插入对应的 `garden compose` 自然语言说明草稿，填好你的材料与目标即可交给 AI 编译。
2. **像 Mermaid 一样的原位实时交互预览**：
   - 光标在围栏内时展示干净的源码供你编辑；光标移出围栏后，立即在原地渲染为与线上博客同款的组件。
   - **未编译的自然语言块**渲染为清爽的「想法 · 发布前编译」提示卡片；**已编译的静态图或 Play 交互块**直接渲染为真实组件——在 Typora 里直接点击滑杆、切换分段选项或展开步骤，事件已被安全隔离，**不会误触跳回源码编辑态**。
3. **一键复制编译指令**：
   - 想法卡片上可直接点击「复制编译提示词」，把当前稿件路径指令放入剪贴板，切到 AI Agent 粘贴即可触发编译。

---

## 2. 三步安装指南

由于 Typora 官方未开放原生扩展接口，本插件运行在跨平台开源底座 [typora-community-plugin](https://github.com/typora-community-plugin/typora-community-plugin) 之上（支持 macOS、Windows、Linux）：

### 第一步：安装 `typora-community-plugin` 底座

按照 [typora-community-plugin 官方安装说明](https://github.com/typora-community-plugin/typora-community-plugin/blob/main/docs/en-us/user-guide/1a-installation.md) 完成初始化（macOS 下该安装器会向 `Typora.app/Contents/Resources/TypeMark/index.html` 注入插件加载入口）。

### 第二步：在博客目录一键写入 Garden 插件

进入你的 Garden 博客仓库根目录，运行：

```bash
npx garden editors install --typora
```

命令会自动将随 `hd-garden` 发行的插件产物写入 `~/.typora/community-plugins/plugins/hedon954.garden-intelligent-ui/`（在 macOS 上还会同步写入 `~/Library/Application Support/abnerworks.Typora/plugins/plugins/hedon954.garden-intelligent-ui/`，确保插件列表立即可见）。

### 第三步：在 Typora 中勾选启用

重启 Typora，打开顶部菜单或偏好设置中的 **「社区插件 / 已安装插件」**，勾选启用 **Garden Intelligent UI** 即可生效。

---

## 3. 常见问题：Typora 客户端升级后插件消失怎么办？

每次升级 Typora 应用程序版本时，新版安装包会覆盖 `Typora.app` 内部被社区插件框架修改过的宿主入口文件，导致所有社区插件暂时不加载。

恢复只需 30 秒：
1. 重新执行一次 `typora-community-plugin` 的注入安装步骤（你之前安装的 Garden 插件文件仍在用户目录中完好保留）；
2. 若同时升级过站点的 `hd-garden` 版本，顺手再跑一次 `npx garden editors install --typora` 同步最新预览内核；
3. 重启 Typora 即可恢复。即便在未启用插件的机器上打开同一篇 `.md` 稿件，所有 `garden compose` 围栏也只是普通代码块，不会丢失任何一字节内容。
