---
title: 快速开始：新建站点、写文章与本地预览
description: 用 npx hd-garden init 创建站点目录，通过 make dev 边写边看、make new 创建新文章、make update 一键发布。
section: getting-started
order: 1
---

## 创建你的站点

电脑上需要先装好 Node.js（22 或更高版本）和 Git。打开终端运行：

```bash
npx hd-garden init my-blog
cd my-blog
make dev
```

浏览器打开终端里提示的本地地址，就能看到刚建好的站点。

```garden timeline
title: 日常写博客的四个步骤
items:
  - date: "第 1 步"
    title: "npx hd-garden init my-blog"
    text: "生成站点目录，自动装好依赖并配好 GitHub Pages 自动发布脚本。"
  - date: "第 2 步"
    title: "make dev"
    text: "在本地启动预览服务，改完 Markdown 保存后网页自动刷新。"
  - date: "第 3 步"
    title: "make new 与 make check"
    text: "新建带日期和标题的文章文件；发之前用 make check 检查有没有写错的地方。"
  - date: "第 4 步"
    title: "make update"
    text: "自动跑完检查、提交 Git 并推送到远端仓库，自动更新线上网站。"
```

## 目录里都有什么

新建好的目录只放你自己的配置、文章和图片，没有多余的代码文件：

| 路径 | 放什么内容 |
| :--- | :--- |
| `site.config.yaml` | 网站名字、一句话简介、作者信息和各页面的标题 |
| `content/posts/` | 正式文章（可以按主题建子文件夹，比如 `content/posts/storage/btree.md`） |
| `content/thoughts/` | 随想和简短笔记（每条一个 `.md` 文件，可以配图、音频或视频） |
| `content/columns.yaml` | 专栏目录，用来把多篇文章按顺序串成一组 |
| `public/` | 封面图、文章配图、网站图标（`favicon.svg`）等静态文件 |
| `.github/workflows/pages.yml` | GitHub Pages 自动打包发布的配置文件（建站时已自动生成） |

> [!TIP]
> 如果你已经建好了一个空的 Git 仓库目录，直接切进去运行 `npx hd-garden init .` 就能在当前目录初始化。

## 平时最常用的命令

### 1. 启动本地预览（`make dev`）

```bash
# 默认只显示已发布的文章
make dev

# 把标了 draft: true 的草稿和还没到发布时间的文章也一起显示出来
CONTENT_INCLUDE_DRAFTS=1 make dev
```

### 2. 新建文章或随想（`make new`）

不用每次手动复制文件头，用命令可以直接生成带当天日期的模板：

```bash
# 新建一篇文章，保存在 content/posts/network/tcp-bbr.md
make new SLUG=network/tcp-bbr TITLE="TCP BBR 拥塞控制笔记" TAGS="网络,TCP"

# 新建一条随想，保存在 content/thoughts/ 下
npx garden new --thought --slug epoll-edge --title "排查一次边缘触发下的读饥饿"

# 创建完直接用默认编辑器打开
npx garden new --slug raft-lease --title "Raft 租约读笔记" --edit
```

### 3. 检查与发布（`make check` / `make update`）

```bash
# 检查所有文章里的组件格式、链接括号和附件路径有没有写错
make check

# 只检查正在写的这一篇
npx garden check content/posts/network/tcp-bbr.md

# 检查通过后自动 git add、commit 并 push 到远端
make update MSG="新增 TCP BBR 笔记"
```

## 升级版本

以后 `hd-garden` 出了新版本，在你的站点目录里运行一行命令就能升级，不会动你的文章和配置文件：

```bash
make upgrade
```
