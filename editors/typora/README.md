# Garden Intelligent UI（Typora）

Typora 没有官方插件接口。这个插件跑在 [typora-community-plugin](https://github.com/typora-community-plugin/typora-community-plugin) 上，它在 macOS、Windows、Linux 上都能用。

- **预览**：`ui` 围栏画成和博客一样的交互组件，`intent` 围栏显示成想法卡片。和 Mermaid 一样，光标离开围栏时显示组件，点进去编辑源码。点滑杆、按钮等控件不会跳进源码。
- **插入意图块**：命令「Garden：插入意图块」。Windows / Linux 默认 `Ctrl+Alt+I`。macOS 的 Option 键会改写按键字符，框架的快捷键匹配因此认不出 `Cmd+Alt+I`，请在「设置 → 快捷键」里自己录一个。
- **复制编译提示词**：把「编译这篇：路径」放进剪贴板，发给装了 `garden-ui` skill 的 AI。

`Data` 引用的文件从稿件的同名目录读取。插件不执行 `widget` 的 HTML，不调用模型，也不保存密钥。

## 安装顺序

1. 先装 typora-community-plugin，按它的[安装说明](https://github.com/typora-community-plugin/typora-community-plugin/blob/main/docs/en-us/user-guide/1a-installation.md)操作。macOS 上它会修改 `Typora.app/Contents/Resources/TypeMark/index.html`。
2. 构建本插件：

   ```bash
   node editors/typora/build.mjs
   ```

3. 关闭 Typora，把 `editors/typora/dist/` 复制成 `~/.typora/community-plugins/plugins/hedon954.garden-intelligent-ui/`（全局），或 `<笔记目录>/.typora/plugins/hedon954.garden-intelligent-ui/`（只对这个目录生效）。
4. 打开 Typora，在「设置 → 已安装插件」里勾选 Garden Intelligent UI。

Typora 升级会覆盖 `index.html`，插件随之失效，需要重新执行第 1 步。失效期间围栏原文都还在，可以用 `make dev` 或后台的组件工作台预览。
