# Garden Intelligent UI（Obsidian）

- **预览**：阅读视图和实时预览里，`ui` 代码块画成和博客一样的交互组件，`intent` 代码块显示成想法卡片。实时预览中光标进入代码块时显示源码，离开时显示组件。
- **插入意图块**：命令「Garden Intelligent UI：插入意图块」或编辑器右键菜单。按 Obsidian 插件规范不预设快捷键，可在「设置 → 快捷键」里绑定（例如 `Cmd+Alt+I`）。
- **复制编译提示词**：把「编译这篇：路径」放进剪贴板，发给装了 `garden-ui` skill 的 AI。
- **查看组件清单**：命令「Garden Intelligent UI：查看组件清单」，点「用它开始」把配方插进当前笔记。

`Data` 引用的文件从笔记的同名目录读取。`Diagram` 用 Obsidian 自带的 Mermaid。插件不调用模型，也不保存密钥。

## 构建与安装

```bash
node editors/obsidian/build.mjs
```

把 `editors/obsidian/dist/` 里的 `main.js`、`manifest.json`、`styles.css` 复制到 `<仓库>/.obsidian/plugins/garden-intelligent-ui/`，在「设置 → 第三方插件」里启用。稳定后再通过 BRAT 或社区商店分发。
