# Garden Intelligent UI（VS Code / Cursor）

在 Markdown 稿件里插入、预览和检查 Garden 交互块。

- **插入意图块**：`Cmd+Alt+I`（Windows / Linux 是 `Ctrl+Alt+I`），或右键菜单、命令面板里的「Garden：插入意图块」。选一句起步语，补完你想让读者做什么。
- **预览**：打开 Markdown 预览，`ui` 块画成和博客一样的交互组件，`intent` 块显示成想法卡片。`Data` 引用的同名目录文件由扩展读取。
- **检查**：`ui` 块里的错误进「问题」面板，在源码里画波浪线。
- **CodeLens**：每个块上方显示状态（正常 / 有错 / 过期 / 未编译）、「复制编译提示词」和「组件清单」。
- **折叠**：打开稿件时折叠 `ui` 块的正文，只露出块头。设置 `garden.foldUiBodies` 可以关掉。
- **组件清单**：命令「Garden：查看组件清单」。点「用它开始」会把配方插进当前稿件。

扩展不调用模型，也不保存密钥。编译交给 `garden-ui` skill（把「编译这篇：路径」发给 AI）或后台的组件工作台。

## 安装

在 Garden 站点里：

```bash
npx garden editors install --vscode
```

`npx hd-garden init` 和第一次 `npx garden sync` 也会把 VSIX 复制到站点 `.garden/editors/vscode/`，并在交互终端里询问要不要安装。有 `code` 或 `cursor` 命令时直接安装；否则用扩展视图右上角「…」→ Install from VSIX，选这个 VSIX。

引擎仓库里重新打包（发布前 `prepack` 也会跑）：

```bash
npm run editors:pack
```

产物是 `editors/dist/vscode/*.vsix`。源码仍在 `editors/vscode/`。
