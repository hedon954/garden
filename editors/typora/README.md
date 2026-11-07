# Garden Intelligent UI（Typora）

Typora 没有官方插件接口。这个插件跑在 [typora-community-plugin](https://github.com/typora-community-plugin/typora-community-plugin) 上，它在 macOS、Windows、Linux 上都能用。

- **预览**：`ui` 围栏画成和博客一样的交互组件，`intent` 围栏显示成想法卡片。和 Mermaid 一样，光标离开围栏时显示组件，点进去编辑源码。点滑杆、按钮等控件不会跳进源码。
- **插入想法**：输入 `/` 就能看到 `/garden`。选中后再出现带小预览图的组件列表。命令「插入 Garden 块」直接打开组件列表（Windows / Linux 默认 `Ctrl+Alt+I`；macOS 的 Option 会改写按键，请在「设置 → 快捷键」里自己录）。选中的是一段给 `garden-compose` skill 编译的 `garden` 想法，不是写好的 YAML。`compose（想法）` 插入的是 `garden compose` 围栏加一句白话。
- **复制编译提示词**：把「编译这篇：路径」放进剪贴板，发给装了 `garden-compose` skill 的 AI。

`Data` 引用的文件从稿件的同名目录读取。插件不执行 `widget` 的 HTML，不调用模型，也不保存密钥。

## 安装顺序

1. 先装 typora-community-plugin，按它的[安装说明](https://github.com/typora-community-plugin/typora-community-plugin/blob/main/docs/en-us/user-guide/1a-installation.md)操作。macOS 上它会修改 `Typora.app/Contents/Resources/TypeMark/index.html`。
2. 在 Garden 站点里安装本插件（`npx hd-garden init` 已把产物放进 `.garden/editors/typora/`）：

   ```bash
   npx garden editors install --typora
   ```

   命令把插件复制到 `~/.typora/community-plugins/plugins/hedon954.garden-intelligent-ui/`。macOS 上还会写到 `~/Library/Application Support/abnerworks.Typora/plugins/plugins/hedon954.garden-intelligent-ui/`，否则「已安装插件」是空的。并检查常见位置有没有 typora-community-plugin。
3. 打开 Typora，在「设置 → 已安装插件」里勾选 Garden Intelligent UI。

Typora 升级会覆盖社区框架改过的程序文件，插件随之失效，需要重新执行第 1 步，再勾选本插件。失效期间围栏原文都还在，可以用 `make dev` 或后台的组件工作台预览。

引擎仓库里重新打包（发布前 `prepack` 也会跑）用 `npm run editors:pack`，产物在 `editors/dist/typora/`。源码仍在 `editors/typora/`。
