---
title: 快速开始
navTitle: 快速开始
description: 用 npx hd-garden init 初始化站点目录，在本地预览、新建文章并推送更新。
section: getting-started
order: 1
---

Garden 是一个用 Markdown 写作、用 Git 管理的个人博客工具。初始化后的站点仓库只保留你的配置文件、文章和静态资源，渲染与构建代码由 `hd-garden` 包提供。

## 1. 环境要求与初始化

需要先安装 **Node.js `>= 22.13.0`**、**Git** 与 **GNU Make**。在终端运行以下命令创建站点目录：

```bash
npx hd-garden init my-blog
cd my-blog
npm install
make dev
```

`npx hd-garden init` 会把站点模板复制到 `my-blog` 目录，并写入 `.agents/skills/` 辅助技能文件（传入 `--locale en` 或 `--locale en_US` 时会生成英文版 `site.config.yaml`、`Makefile`、`README.md`，并安装 `.github/workflows/pages.yml`）。默认中文初始化不会自动执行 `npm install`，也不会自动创建 `.github/workflows/pages.yml`（GitHub Pages 工作流配置见 [发布到 GitHub Pages](/garden/deploy)）。

首次运行 `make dev` 时，如果还没有 `node_modules`，`Makefile` 中的 `make prepare` 会先自动执行 `npm install`，随后运行 `npx garden dev`（其内部会先执行内容同步）并启动本地开发服务器。默认是 Node RSC 预览；需要 Cloudflare Worker 行为时用 `npx garden dev --worker`。

## 2. 站点目录结构

初始化后的目录结构如下：

```text
my-blog/
├── site.config.yaml        # 站点名称、作者信息与各一级页面的标题/副标题
├── content/
│   ├── columns.yaml        # 专栏定义与文章阅读顺序
│   ├── covers/             # 文章与专栏封面图
│   └── posts/              # 长文（.md）及同名附件目录
├── public/                 # 直接按原路径发布的静态资源（如图标）
├── Makefile                # 日常预览、新建文章、构建检查与提交命令
└── package.json            # 仅依赖 hd-garden
```

## 3. 新建长文

### 新建长文（`make new`）

使用 `make new` 在 `content/posts/` 下创建带日期、标题和组件速查注释的草稿文件：

```bash
make new SLUG=tcp-bbr TITLE="TCP BBR 拥塞控制笔记"
```

如果希望把文章放进子目录（例如 `content/posts/network/tcp-bbr.md`），通过 `DIR` 指定子目录名：

```bash
make new DIR=network SLUG=tcp-bbr TITLE="TCP BBR 拥塞控制笔记"
```

> [!NOTE]
> `SLUG` 只能包含小写字母、数字和连字符（`a-z`、`0-9`、`-`），不能包含 `/`；子目录必须用 `DIR` 参数传入。`make new` 只读取 `SLUG`、`TITLE` 和 `DIR` 三个变量。

新建的文件默认带有 `draft: true`。`make dev` 默认预览草稿和未来定时文章（`publishAt`）；用 `CONTENT_INCLUDE_DRAFTS=0 make dev` 可关闭。正式构建仍默认排除它们：

```bash
make dev
```

## 4. 常用命令与版本升级

站点 `Makefile` 与 `garden` CLI 提供的日常命令如下：

| 命令 | 实际执行的操作 |
| :--- | :--- |
| `make dev` | 先执行 `make prepare` 检查依赖，再运行 `npx garden dev`（内部自动执行同步并启动开发服务器） |
| `CONTENT_INCLUDE_DRAFTS=0 make dev` | 可选：只预览已发布文章，排除草稿和未来定时文章 |
| `make new SLUG=xxx TITLE="标题" DIR=子目录` | 调用 `npx garden new` 在 `content/posts/` 下生成新文章草稿（`DIR` 可省略） |
| `make check` | 在站点仓库中运行 `npx garden sync && npx garden build`，验证全站同步与生产构建 |
| `npx garden check content/posts/xxx.md` | 单独检查某篇 Markdown 文章的标题、组件字段、代码对比与本地附件路径 |
| `make update MESSAGE="提交说明"` | 先运行 `make check`，通过后执行 `git add -A`、`git commit -m "$(MESSAGE)"`（`MESSAGE` 默认值为 `更新博客`）和 `git push origin HEAD` |

### 升级 `hd-garden` 版本

需要升级引擎版本时，编辑站点根目录下的 `package.json`，将 `"hd-garden"` 的版本号改为目标版本，然后运行 `npm install`：

```bash
npm install
make check
```

## 5. 编辑器插件

写交互组件时，可以在 VS Code、Cursor 或 Typora 里插入想法、预览组件、打开清单，再把编译交给 `garden-compose` skill。插件随 `hd-garden` 发布，不用自己编译。

`npx hd-garden init` 会把产物放到 `.garden/editors/`。终端可交互时分别询问是否安装 VS Code / Cursor 和 Typora。第一次 `npx garden sync` 如果还没问过，会再问一次。没有 TTY、`CI=1` 或 `GARDEN_SKIP_EDITORS=1` 时只打印提示。之后运行：

```bash
npx garden editors install
npx garden editors install --yes
```

Typora 需要先安装 typora-community-plugin，再在「设置 → 已安装插件」里勾选。没有 `code` 或 `cursor` 命令时，用 Install from VSIX 选择 `.garden/editors/vscode/` 里的文件。插入、预览、清单和编译的步骤见 [用 AI 写作](/garden/ai-writing) 与 [语法检查与快捷输入](/garden/workflow)。
