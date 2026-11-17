---
title: VS Code / Cursor 扩展
navTitle: vscode
navIcon: vscode
description: 详解 Garden VS Code 与 Cursor 扩展的一键安装、快捷键插入、CodeLens 状态栏、波浪线实时检查与原生围栏折叠能力。
section: extensions
order: 52
---

如果你习惯在 **VS Code** 或 **Cursor** 中一边写 Markdown、一边让侧栏 AI Agent 协助编译组件与校验结构，安装 **Garden Intelligent UI** 扩展（VSIX）可以把整套可视化选择、实时诊断与长代码折叠直接融进编辑器工作区。

---

## 1. 核心能力

1. **快捷键与命令面板插入图示草稿**：
   - 按下 `Cmd+Alt+I`（Windows / Linux 为 `Ctrl+Alt+I`），或在编辑器右键菜单 / 命令面板（`Cmd+Shift+P`）执行 **「插入 Garden 块」**，即可从 21 种内置图示列表中点选插入 `garden compose` 说明草稿。
2. **块顶 CodeLens 快捷栏**：
   - 在每一个 `garden compose` 围栏正上方自动悬浮一行轻量 CodeLens：实时显示该块当前状态（**正常** / **未编译** / **有错**），并提供 **「收起 Garden 块」**、**「复制编译提示词」** 与 **「组件清单」** 一键入口。
3. **实时波浪线语法检查（Problems 面板联动）**：
   - 编辑已编译的 `garden compose` 块时，若拼错了标签名、漏写了必填属性或表达式类型不匹配，扩展会立即在对应源码行画出波浪线并汇总进编辑器的「问题（Problems）」面板，无需等跑命令行就能发现问题。
4. **Markdown 侧栏预览真实交互渲染**：
   - 打开内置 Markdown Preview（`Cmd+Shift+V` 或侧边打开预览），文中的 `garden compose` 块会直接渲染为可交互的真实组件，并自动读取同名附件目录中的数据文件。
5. **原生一键折叠长围栏，保持正文清爽**：
   - AI 编译完成一段几十行的 `garden compose` 后，你可能希望专心通读上下游散文段落。
   - 点击行号旁边的原生折叠箭头、点击块上方的 **「收起 Garden 块」**，或在命令面板调用 **「Garden: 收起全部 Garden 块 / 展开全部 Garden 块」**，即可把所有已闭合组件块干净地收成单行围栏头（完全基于编辑器原生折叠，不修改文件任何内容，也不干扰普通标题和代码块的折叠）。
6. **内置交互式组件清单**：
   - 执行命令 **「Garden：查看组件清单」** 可直接在编辑器标签页内打开可视化组件与配方画廊，看中某个配方点击「用它开始」即可插入当前光标位置。

---

## 2. 安装与版本同步

在你的 Garden 博客仓库根目录运行：

```bash
npx garden editors install --vscode
```

- 当本机终端存在 `cursor` 或 `code` 命令时，脚本会自动将 `.garden/editors/vscode/garden-ui-<版本号>.vsix` 安装进 Cursor 与 VS Code；
- 如果本机未开启命令行 `code` / `cursor` PATH，也可以打开编辑器左侧「扩展（Extensions）」面板，点击右上角 `...` → **Install from VSIX...**，手动选中站点 `.garden/editors/vscode/` 目录下的 `.vsix` 文件完成安装。

> [!NOTE] 升级引擎后的扩展同步
> 每次运行 `npm install hd-garden@latest` 升级站点引擎后，建议重新执行一次 `npx garden editors install --vscode`，并在已打开的 VS Code / Cursor 窗口执行 **Developer: Reload Window**，确保编辑器预览内核与构建校验器处于完全相同的版本。
