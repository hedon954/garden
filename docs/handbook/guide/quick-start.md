---
title: 快速上手
navTitle: 快速上手
description: 按初始化仓库、最小必要配置、准备公开仓库、配置依赖项、新建文章、发布前校验、make update 发布的顺序完成首次上线。
section: guide
order: 11
---

本节按固定七步带你从空目录走到线上可访问的独立博客：

`初始化仓库` → `博客最小必要配置项` → `准备构建后公开仓库` → `其他依赖项` → `创建一篇新文章` → `文章发布前校验` → 发布（`make update`）

---

## 1. 初始化仓库

确保本机已安装 **Node.js `>= 22.13.0`** 与 **Git**。在终端运行初始化命令：

```bash
npx hd-garden init my-blog
cd my-blog
npm install
```

`npx hd-garden init` 会生成最小化的站点骨架，并自动安装 AI 写作技能（`.agents/skills/`）与站点协作说明（`AGENTS.md`）：

```text
my-blog/
├── content/
│   ├── columns.yaml        # 专栏目录编排
│   └── posts/              # 全部博客长文（支持多级子目录）
├── site.config.yaml        # 站点名称、作者与页面文案
├── Makefile                # 日常新建、预览、校验与发布快捷入口
├── AGENTS.md               # AI Agent 站点协作地图
└── package.json            # 仅依赖 hd-garden 引擎包
```

本地随时可以启动实时预览（默认监听 `http://localhost:3000`，保存 Markdown 自动热更新，且默认包含草稿）：

```bash
make dev
```

---

## 2. 博客最小必要配置项

打开根目录的 `site.config.yaml`，只需修改站点名称、公开域名和作者信息即可完成最小配置：

```yaml
name: 我的数字花园
tagline: 记录 · 工程 · 保持好奇
description: 关于系统工程、架构设计与阅读思考的个人博客。
locale: zh_CN
url: https://blog.example.com

author:
  name: Your Name
  github: your-github-id
  githubBio: 一句简短的自我介绍。
  githubPinned: []

pages:
  home:
    title: 记一些正在做的事，和想清楚的问题。
    subtitle: ""
  blog:
    title: 博文
    subtitle: 写完的长文。
  columns:
    title: 专栏
    subtitle: 按顺序读的一组文章。
  about:
    title: 你好，我是 Your Name。
    subtitle: 文章和笔记都在这里。

footer: 持续记录。
```

- **`name` / `description`**：用于站点顶栏标识、浏览器标题后缀、RSS 与搜索引擎摘要。
- **`url`**：站点的最终公开根地址（不带结尾 `/`）。正文里指向该地址的完整链接会自动识别为站内跳转。
- **`author.github`**：用于「关于」页展示公开 GitHub 资料与贡献热力图；未配置时留占位符不会触发错误请求。

所有可选配置项（自定义品牌 SVG 图标、外链预览 Worker、历史链接重定向等）详见 [详细教程](/garden/guide/tutorial/)。

---

## 3. 准备构建后公开仓库

Garden 原生支持两种 GitHub Pages 发布拓扑，你可以按是否需要隐藏草稿与源码选择：

```garden compose
<compare>
  <item>
    <text>🌐 方式 A：单公开仓库。源码与提交历史公开，直接用 GitHub Actions 部署。</text>
  </item>
  <item>
    <text>🔐 方式 B：私有源码加公开产物。草稿与原图留在私有仓，只推送静态产物。</text>
  </item>
</compare>
```

采用推荐的**双仓隔离模式**时，只需四步准备公开产物仓库：

1. **新建两个 GitHub 仓库**：私有仓库 `owner/blog-source` 存放刚初始化的源码；公开仓库 `owner/owner.github.io` 勾选初始化 README 以建立 `main` 分支。
2. **生成专用发布密钥（Deploy Key）**：
   ```bash
   ssh-keygen -t ed25519 -C "garden-pages-deploy" -f garden-pages-deploy
   ```
3. **绑定公私钥**：
   - 打开公开产物仓库 `owner/owner.github.io` → **Settings → Deploy keys**，添加公钥 `garden-pages-deploy.pub`，并勾选 **Allow write access**。
   - 打开私有源码仓库 `owner/blog-source` → **Settings → Secrets and variables → Actions → Secrets**，新建 Secret `PAGES_DEPLOY_KEY`，填入私钥 `garden-pages-deploy` 内容，保存后删除本地临时密钥文件。
4. **指定发布目标与 Pages 分支**：
   - 在私有源码仓库 **Actions → Variables** 中新增变量 `PAGES_REPOSITORY`，值为 `owner/owner.github.io`（若绑定了自定义域名，同时新增 `SITE_URL=https://你的域名`）。
   - 在公开产物仓库 **Settings → Pages** 中设置 `Source: Deploy from a branch`，选择 `main` 分支与 `/(root)` 目录。

---

## 4. 其他依赖项

正式构建发布前，确认以下外部依赖项与编辑器辅助工具：

1. **评论系统（Giscus，发布工作流必检项）**：
   - 准备一个已开启 **Discussions** 的公开仓库（双仓模式下可直接使用公开产物仓或新建 `blog-comments` 仓），打开 [giscus.app](https://giscus.app/zh-CN) 安装 Giscus App。
   - 将生成的四项参数同时写入本地 `.env.local` 和源码仓库的 **GitHub Actions Variables**：`GISCUS_REPO`、`GISCUS_REPO_ID`、`GISCUS_CATEGORY`、`GISCUS_CATEGORY_ID`。
   - **如果不打算开启评论**：在源码仓库的 Actions Variables 中设置 `GISCUS_DISABLED=1`，否则发布工作流会主动拦截未配置评论的构建。
2. **编辑器插件与 AI 技能（可选但强烈推荐）**：
   - 运行 `npx garden editors install` 可一键把 Garden 插件安装进本机 **VS Code / Cursor** 或 **Typora**，输入 `/garden` 即可呼出常用图示选择器（详见 [扩展插件](/garden/extensions/)）。
   - 升级 `hd-garden` 版本后，可运行 `make skill` 同步最新内置 AI 技能。

---

## 5. 创建一篇新文章

使用 `make new` 在 `content/posts/` 下创建带规范 Front Matter 的文章草稿（`DIR` 指定子目录，`SLUG` 指定文件名，`TITLE` 指定标题）：

```bash
make new DIR=engineering SLUG=first-post TITLE="用 Markdown 搭建博客丨从草稿到静态发布"
```

生成的 `content/posts/engineering/first-post.md` 默认带有 `draft: true`。编辑正文后：

- 本地执行 `make dev` 时会默认渲染草稿，方便边写边看。
- 准备公开发布时，把 Front Matter 中的 `draft: true` 改为 `draft: false`（或删除 `draft` 行），并填写一句清晰的 `description`。
- 文章如果有本地配图、PDF 或 HTML 附件，放在同名目录 `content/posts/engineering/first-post/` 下，正文通过 `./first-post/diagram.png` 相对路径引用。

---

## 6. 文章发布前校验

每次动笔改完文章，先跑增量预检（只校验当前 Git 改动或新增的 Markdown 文件，秒级返回）：

```bash
make check diff
```

如果要执行包含链接资源同步与完整静态构建的全量门禁检查，运行：

```bash
make check
```

校验器会自动排查三类问题：
- **Front Matter 与结构规范**（如缺少 `title`/`date`、误写 `slug` 字段、孤立的 `diff` 代码块、失效的本地配图路径）。
- **未编译或有语法错误的 `garden compose` 块**（草稿同样严格检查，避免坏块混入仓库）。
- **静态产物完整性**（`make check` 构建后会验证所有 CSS/JS 引用、导航载荷与样式完整性）。

首次运行 `garden dev` 或 `garden sync` 时，引擎还会自动安装 `.git/hooks/pre-commit` 提交前钩子，在 `git commit` 时自动守护暂存区的组件块。

---

## 7. `make update` 发布

确认校验通过且本地已关联远端源码仓库（`git remote add origin ...`）后，一条命令即可完成检查、提交与推送上线：

```bash
make update MESSAGE="发布第一篇博客文章"
```

`make update` 内部按顺序执行：
1. 若工作区没有任何改动，直接提示「没有需要发布的改动」并退出。
2. 执行 `make check` 全量严格预检与构建验证；任一步骤报错都会立即中止，不会产生脏提交。
3. 执行 `git add -A && git commit -m "..." && git push origin HEAD`。

推送到达 GitHub `main` 分支后，`Verify and publish blog` 工作流会自动构建静态产物并更新 GitHub Pages（双仓模式下以单个干净的滚动快照更新公开产物仓库，不累积冗余构建历史）。几分钟内，你的新文章就会出现在公开域名上。
