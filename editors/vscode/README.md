# Garden Intelligent UI（VS Code / Cursor）

在 Markdown 稿件里插入、预览和检查 Garden 交互块。

- **插入想法**：`Cmd+Alt+I`（Windows / Linux 是 `Ctrl+Alt+I`），或右键菜单、命令面板里的「插入 Garden 块」。插入的是一段给 `garden-compose` skill 编译的 `garden` 想法（写成资源卡时，正文说明要写链接、标题和一句说明），不是 YAML 示例。
- **预览**：打开 Markdown 预览，`ui` 块画成和博客一样的交互组件，`intent` 块显示成想法卡片。`Data` 引用的同名目录文件由扩展读取。
- **检查**：`ui` 块里的错误进「问题」面板，在源码里画波浪线。
- **CodeLens**：每个块上方显示状态（正常 / 有错 / 过期 / 未编译）、「复制编译提示词」和「组件清单」。
- **行号旁的折叠箭头**：`garden compose` 开始围栏这一行左侧显示原生折叠箭头，点击收起整块，再点展开。扩展为 Markdown 提供 `editor.folding: true`、`editor.foldingStrategy: auto`、`editor.showFoldingControls: always` 的默认值，不写入全局或工作区设置。显式的 `[markdown]` 用户/工作区设置仍可覆盖这些默认值。
- **其他折叠入口**：点击已闭合 Garden 块首行上方的「收起 Garden 块」，整块收成围栏首行；点击编辑器左侧原生折叠箭头可展开。也可在块内右键或命令面板选择「Garden: 收起当前 Garden 块 / 展开当前 Garden 块 / 收起全部 Garden 块 / 展开全部 Garden 块」。没有新增默认快捷键，可自行绑定这些命令。
- 支持未编译和已编译的 `garden compose`、其他 Garden 围栏及旧版 `ui` / `intent` / `widget`。未闭合块不处理；不修改正文、光标或选区。依赖编辑器原生 Markdown 折叠，需启用 `editor.folding` 且使用自动折叠策略；标题、列表和普通代码块的折叠不被接管。
- **旧版自动折叠**：设置 `garden.foldUiBodies` 控制打开稿件时收起旧版 `ui` 整块（现改用原生围栏折叠，不再保留 YAML 块头）。
- **组件清单**：命令「Garden：查看组件清单」。点「用它开始」会把配方插进当前稿件。

扩展不调用模型，也不保存密钥。编译交给 `garden-compose` skill（把「编译这篇：路径」发给 AI）或后台的组件工作台。

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

## 原生折叠回归测试（Mac / Cursor）

在仓库根目录先运行 `node editors/vscode/build.mjs`，再运行下面的独立测试实例（不复用、重载或退出正在使用的 Cursor 窗口）。Cursor 3.x 需要 `--classic` 才会在经典编辑器测试宿主中加载此扩展。

```bash
test_dir=$(mktemp -d /tmp/garden-fold-host.XXXXXX)
GARDEN_FOLD_HOST_RESULT="$test_dir/result.json" \
  /Applications/Cursor.app/Contents/MacOS/Cursor \
  --classic --new-window --skip-welcome --skip-release-notes --disable-workspace-trust \
  --user-data-dir "$test_dir/user" --extensions-dir "$test_dir/extensions" \
  --extensionDevelopmentPath="$PWD/editors/vscode" \
  --extensionTestsPath="$PWD/tests/vscode-folding-host.cjs"
```

该测试使用真实 Markdown provider 检查标题、列表、普通代码块、两种 Compose 围栏的折叠范围，再调用原生折叠/展开并检查可见行与正文未变化；结果写入 `result.json`。它不代替对当前用户窗口的截图验收。修改插件后，已打开窗口可能仍运行旧版本，需要用户自行重载窗口后生效。
