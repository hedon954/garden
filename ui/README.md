# Intelligent UI

`ui/` 是一块可以单独拿走的交互组件模块。它解析作者写好的 `ui` 块、检查目录、算出静态快照，并在浏览器里把块画出来。它不知道文章存在哪、谁登录了后台、模型地址是什么。

现在它还放在 Garden 仓库里。拆仓库以后再做。这一层只把接口和依赖方向定死：模块不引用 Garden，Garden 作为宿主调用模块。

## 模块拥有什么

| 路径 | 职责 |
| --- | --- |
| `index.mjs` | 给非 React 宿主的稳定入口：编译、检查、沙箱协议 |
| `core/` | 解析、表达式、目录、校验、静态快照。不依赖 React |
| `host.mjs` | 宿主契约和 `<Sandbox>` 的 iframe 协议 |
| `react/` | `UiFigure` 和目录里的组件，样式在 `react/ui.css` |
| `prompt/` | 写给模型的目录说明、配方和规则。宿主负责发送 |
| `preview/` | 编辑器里的预览挂载 |
| `evals/` | 评测样本，由宿主的工作台读取 |

## 宿主可以做的事

Garden 是当前的宿主，以后也可以是别的静态站点。宿主负责：

- 从 Markdown 里找出 `ui` 围栏，调用 `compileUiBlock` / `checkUiBlock`
- 把通过检查的 payload 交给 `UiFigure`
- 在写作期调用模型。阅读页不调用模型
- 决定要不要实现 `issuePrompt`。公开博客留空，聊天宿主可以接上

```js
import { compileUiBlock, createHost } from "./ui/index.mjs";
import { UiFigure } from "./ui/react";

const { payload } = compileUiBlock(body);
const host = createHost({
  openUrl(url) {},
  copy(text) {},
  // issuePrompt 只有聊天宿主才提供
});
```

`UiFigure` 的 `host` 不传时，沙箱里的 `GardenUI.issuePrompt` 返回 false。`openUrl` 缺省时模块用 `window.open` 打开 https 链接。`copy` 缺省时模块写剪贴板。

流式补全留在宿主。模块提供 `parseUiBodyPartial`：丢掉最后一行不完整的标签，返回已经闭合的树。阅读页渲染的是提交进 Git 的完整块。

## 不能跨过去的边界

`ui/` 里的源文件不能 import `app/`、`scripts/`、`bin/`、`content/`、`editors/`，也不能 import Next 或 Vinext。这条由 `tests/ui-boundary.test.mjs` 守着。

宿主可以 import `ui/`。模块不能 import 宿主。

同名目录里的图片和 CSV 由宿主在编译时通过 `compileUiBlock` 的 `resolveAsset` 换成公开地址。模块不读文件系统上的文章。

## Sandbox

目录画不了的画布（地图、三维、自由动画）写成 `<Sandbox>`，不要为此再加组件。`html`、`css`、`js` 必须是字面量。

iframe 使用 `sandbox="allow-scripts"`，不带 `allow-same-origin`。文档带上 `default-src 'none'`，只允许内联样式、内联脚本和 `data:` 图片。远程脚本、远程图片、`url(http…)`、动态 `import()` 在校验和绘制时都会被拒绝。

主题变量由模块注入，跟随页面的 `data-theme`：

`--viz-text` `--viz-muted` `--viz-subtle` `--viz-panel` `--viz-border` `--viz-accent` `--viz-series` `--viz-track`

画布里的脚本通过 `GardenUI` 跟宿主说话。`postMessage` 的 `source` 固定是 `garden-ui-sandbox`。父页面只接受来自这块 iframe 的消息。

| 方法 | 宿主行为 |
| --- | --- |
| `GardenUI.openUrl(url)` | 只接受 `https` |
| `GardenUI.issuePrompt(text)` | 宿主没实现时返回 false，不调用模型 |
| `GardenUI.copy(text)` | 把最多 4000 字交给宿主复制 |

画布自己上报高度，模块把 iframe 撑到内容高度，上限 4000px。
