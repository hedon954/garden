# Garden

[English](README.en.md)

Garden 是一个 Claude 风格的个人博客框架：文章、随想和专栏用 Markdown 写，保存在自己的 Git 仓库里；图表、指标和交互组件用一句自然语言描述就行。

站点仓库只保存你的配置文件（`site.config.yaml`）与稿件（`content/`），页面渲染、静态构建和检查工具由 `hd-garden` 包提供。

## 1. 新建站点

需要 **Node.js `>= 22.13.0`**、**Git** 与 **GNU Make**：

```bash
npx hd-garden init my-blog
cd my-blog
npm install
make dev
```

公开包名是 `hd-garden`，装进站点后可使用 `npx garden`（不要直接运行未安装的 `npx garden init`，npm 上的 `garden` 是另一个包）。`init` 会把 VS Code / Cursor 与 Typora 的 Intelligent UI 插件放进站点，并在交互终端里分别询问要不要装上（见下一节）。首次运行 `make dev` 会生成 `.env.local`、补齐 `.agents/skills/` 下的三个 AI skill，并在 `.git/hooks/pre-commit` 安装提交前检查，默认预览地址是 `http://localhost:3000`（使用说明在 `http://localhost:3000/garden`）。

如果在本地使用了 npm 镜像，请把 `registry` 留在 `~/.npmrc`，不要让镜像域名写进 `package-lock.json`（提交前可运行 `node node_modules/hd-garden/scripts/check-lockfile-registry.mjs` 检查）。

## 2. 在 VS Code、Cursor 和 Typora 里写交互

Intelligent UI 插件随 `hd-garden` 一起发布，不用在站点里编译源码。它做四件事：插入一句想法、在编辑器里预览画好的组件、打开组件清单，以及把「编译这篇」交给 `garden-ui` skill。

`npx hd-garden init` 把产物复制到站点的 `.garden/editors/`（VS Code 的 `.vsix`，以及 Typora 插件目录）。终端可交互时，会先问要不要装进 VS Code / Cursor，再问要不要装进 Typora。第一次 `npx garden sync`（`make dev` 会先同步）如果还没问过，会再问一次。回答 `y` 才会安装；直接回车是不装。

没有 TTY（管道或 CI 日志）、`CI=1`，或设置了 `GARDEN_SKIP_EDITORS=1` 时，命令不会停下来等输入，只打印下面这条安装命令。之后随时可以装，重复执行也安全：

```bash
npx garden editors install                 # 再问一次 VS Code 和 Typora
npx garden editors install --yes           # 两个都装，不再询问
npx garden editors install --vscode        # 只装 VS Code / Cursor
npx garden editors install --typora        # 只装 Typora
```

### VS Code / Cursor

- **插入想法**：macOS 用 `Cmd+Alt+I`，Windows / Linux 用 `Ctrl+Alt+I`，或命令「插入 Garden 块」。插入的是不带组件名的 `garden` 围栏，正文用中文告诉你要写什么，交给 `garden-ui` skill 编译。Typora 里先输入 `/` 选 `/garden`，再从带小预览图的列表里选组件。
- **预览**：打开 Markdown 预览。`ui` 围栏画成和博客一样的组件，`intent` 围栏显示成想法卡片。同名目录里的数据文件由扩展读取。
- **检查**：错误进「问题」面板，并在源码上画波浪线。每个块上方的 CodeLens 标出正常、有错、过期或未编译。
- **组件清单**：命令「查看组件清单」。点「用它开始」把配方插进当前稿件。终端里的同一份清单是 `npx garden ui catalog`（生成 `.garden/ui-catalog.html`）。
- **编译**：命令「复制编译提示词」。中文站点复制 `编译这篇：<相对路径>`，英文站点（`locale: en_US`）复制 `Compile this post: <相对路径>`。把这句话发给装了 `garden-ui` skill 的 Agent，由它 `npx garden ui scan`、读 `npx garden ui prompt`、再 `npx garden ui apply`。插件不调用模型，也不保存密钥。

本机有 `code` 或 `cursor` 命令时，`garden editors install` 会执行 `--install-extension`。两个命令都在时，会各装一次。没有命令行时，打开扩展视图，点右上角「…」，选 **Install from VSIX**（从 VSIX 安装），文件在 `.garden/editors/vscode/`。

### Typora

Typora 没有官方插件接口。先按 [typora-community-plugin 的安装说明](https://github.com/typora-community-plugin/typora-community-plugin/blob/main/docs/en-us/user-guide/1a-installation.md) 装上社区框架（macOS 上它会修改 `Typora.app` 里的 `index.html`）。`garden editors install` 会检查常见安装位置；没找到时仍会复制插件，并打印这个前提。

插件文件复制到 `~/.typora/community-plugins/plugins/hedon954.garden-intelligent-ui/`。macOS 同时写到 `~/Library/Application Support/abnerworks.Typora/plugins/plugins/hedon954.garden-intelligent-ui/`。打开 Typora，在「设置 → 已安装插件」里勾选 Garden Intelligent UI。

用法和 VS Code 同一套：光标离开围栏时预览 `ui` / `intent`（和 Mermaid 一样，点进围栏编辑源码；点滑杆或按钮不会跳进源码）；先输入 `/` 再选 `/garden`，或用命令「插入 Garden 块」，都会插入想法围栏（Windows / Linux 默认 `Ctrl+Alt+I`，macOS 的 Option 会改写按键，请到「设置 → 快捷键」里自己录）；「Garden：复制编译提示词」交给 `garden-ui` skill。

升级 Typora 会覆盖社区框架改过的程序文件，插件跟着失效。需要重新安装 typora-community-plugin，再勾选本插件。稿件里的围栏原文还在，也可以用 `make dev` 预览。

Obsidian 插件这一轮不随包安装。

## 3. 用一句话写组件（人和 Agent 用同一套工具）

在正文想放组件的位置写一个不带名字的 `garden` 围栏，只描述想让读者做什么、看到什么：

````markdown
```garden
让读者拖动每天写的字数和每周写几天，看写完一篇 8000 字的长文要几周。
```
````

让 Agent 按站点里的 `garden-ui` skill 处理这篇稿件：Agent 先用 `npx garden ui scan` 读取待编译块的哈希，再读 `npx garden ui prompt` 的组件规则，生成 `garden interactive`（或 `card`、`stat`、`compare`、`timeline`、`chart`、`figure`、`html`、`file`、`relations`、`list`、`choice` 等内置组件，或在完整代码下方生成 `diff`），最后用 `npx garden ui apply` 只替换该围栏。如果你在编译前直接 `git commit`，pre-commit 钩子会运行同一条 `npx --no-install garden ui check --staged --quiet` 拦下提交，并打印一段可直接粘贴给 AI 的修复提示词。

## 4. 常用命令

```bash
make new SLUG=writing-pace TITLE="慢慢写"      # 在 content/posts/ 下创建文章草稿
make dev                                       # 同步内容并启动本地预览
CONTENT_INCLUDE_DRAFTS=1 make dev              # 连同草稿和未来定时文章一起预览
make check                                     # 运行 garden sync 与 garden build 验证全站
make update MESSAGE="新增一篇文章"             # 检查通过后提交并推送到远端仓库
npx garden check content/posts/writing-pace.md # 单独检查一篇文章的标题、组件与资源路径
npx garden ui check --staged                   # 检查暂存区稿件中的想法块与交互组件
npx garden ui catalog                          # 在 .garden/ui-catalog.html 生成离线组件清单
npx garden editors install --yes               # 把 Intelligent UI 插件装进 VS Code / Cursor 与 Typora
```

## 5. Excalidraw

正文用 Markdown 图片指向 `.excalidraw` 源文件。`garden build` 会在同目录导出一张浅色扁平 SVG，画布背景透明，并把这张 SVG 嵌进正文，图里的文字可以选中。不需要单独的导出命令。

```markdown
![说明](./assets/flow.excalidraw)
```

页面里第一次出现 `.excalidraw` 时，构建会下载导出程序（不需要 Chromium；字体写进 SVG）。说明见[本地图片](docs/handbook/components/image.md)。

## 6. 使用说明与深入文档

本地运行 `make dev` 后访问 `/garden`（英文版在 `/garden/en`），或直接阅读仓库内的文档：

- **[Garden 使用说明（中文）](docs/handbook/index.md)** · **[Garden Handbook (English)](docs/handbook/en/index.md)**：快速开始、[用 AI 写作](docs/handbook/ai-writing.md)、[站点与专栏配置](docs/handbook/config.md)、[发布到 GitHub Pages](docs/handbook/deploy.md)、[写文章与随想](docs/handbook/writing.md)、[阅读排版](docs/handbook/design.md)、[组件](docs/handbook/components.md)（12 个 `garden` 围栏，以及链接卡片、来源胶囊和本地图片）与 [语法检查](docs/handbook/workflow.md)。
- **[从零开始](docs/quick-start.md)** 与 **[GitHub Pages 部署](docs/github-pages.md)**：单公开仓库或「私有源码仓库 + 公开页面仓库」的 Actions 配置与 Giscus 评论接入。
- **[独立管理后台](docs/admin-service.md)**：可选的 `/admin` 服务（本地、Docker 或 Cloudflare Workers），支持网页发随想、阿里云 OSS 媒体直传与 `/admin/ui` 组件工作台。

## 许可证

[MIT](LICENSE)。使用 Garden 构建的站点请保留页脚中的 Garden 署名链接。
