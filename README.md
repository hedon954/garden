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

公开包名是 `hd-garden`，装进站点后可使用 `npx garden`（不要直接运行未安装的 `npx garden init`，npm 上的 `garden` 是另一个包）。首次运行 `make dev` 会生成 `.env.local`、补齐 `.agents/skills/` 下的三个 AI skill，并在 `.git/hooks/pre-commit` 安装提交前检查，默认预览地址是 `http://localhost:3000`（使用说明在 `http://localhost:3000/garden`）。

如果在本地使用了 npm 镜像，请把 `registry` 留在 `~/.npmrc`，不要让镜像域名写进 `package-lock.json`（提交前可运行 `node node_modules/hd-garden/scripts/check-lockfile-registry.mjs` 检查）。

## 2. 用一句话写组件（人和 Agent 用同一套工具）

在正文想放组件的位置写一个不带名字的 `garden` 围栏，只描述想让读者做什么、看到什么：

````markdown
```garden
让读者拖动每天写的字数和每周写几天，看写完一篇 8000 字的长文要几周。
```
````

让 Agent 按站点里的 `garden-ui` skill 处理这篇稿件：Agent 先用 `npx garden ui scan` 读取待编译块的哈希，再读 `npx garden ui prompt` 的组件规则，生成 `garden interactive`（或 `card`、`stat`、`compare`、`timeline`、`chart`、`figure`、`html`、`file` 等内置组件，或在完整代码下方生成 `diff`），最后用 `npx garden ui apply` 只替换该围栏。如果你在编译前直接 `git commit`，pre-commit 钩子会运行同一条 `npx --no-install garden ui check --staged --quiet` 拦下提交，并打印一段可直接粘贴给 AI 的修复提示词。

## 3. 常用命令

```bash
make new SLUG=writing-pace TITLE="慢慢写"      # 在 content/posts/ 下创建文章草稿
make dev                                       # 同步内容并启动本地预览
CONTENT_INCLUDE_DRAFTS=1 make dev              # 连同草稿和未来定时文章一起预览
make check                                     # 运行 garden sync 与 garden build 验证全站
make update MESSAGE="新增一篇文章"             # 检查通过后提交并推送到远端仓库
npx garden check content/posts/writing-pace.md # 单独检查一篇文章的标题、组件与资源路径
npx garden ui check --staged                   # 检查暂存区稿件中的想法块与交互组件
npx garden ui catalog                          # 在 .garden/ui-catalog.html 生成离线组件清单
```

## 4. 使用说明与深入文档

本地运行 `make dev` 后访问 `/garden`（英文版在 `/garden/en`），或直接阅读仓库内的文档：

- **[Garden 使用说明（中文）](docs/handbook/index.md)** · **[Garden Handbook (English)](docs/handbook/en/index.md)**：快速开始、[用 AI 写作](docs/handbook/ai-writing.md)、[站点与专栏配置](docs/handbook/config.md)、[发布到 GitHub Pages](docs/handbook/deploy.md)、[写文章与随想](docs/handbook/writing.md)、[阅读排版](docs/handbook/design.md)、[9 个内置组件](docs/handbook/components.md) 与 [语法检查](docs/handbook/workflow.md)。
- **[从零开始](docs/quick-start.md)** 与 **[GitHub Pages 部署](docs/github-pages.md)**：单公开仓库或「私有源码仓库 + 公开页面仓库」的 Actions 配置与 Giscus 评论接入。
- **[独立管理后台](docs/admin-service.md)**：可选的 `/admin` 服务（本地、Docker 或 Cloudflare Workers），支持网页发随想、阿里云 OSS 媒体直传与 `/admin/ui` 组件工作台。

## 许可证

[MIT](LICENSE)。使用 Garden 构建的站点请保留页脚中的 Garden 署名链接。
