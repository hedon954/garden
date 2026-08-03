# 从零开始

这篇指南的终点是：你有一个自己的博客地址，并成功发布一篇文章。第一次不需要配置评论、后台或自定义域名。

## 准备什么

- 一个 GitHub 账号。
- 想在电脑上预览时，再安装 Node.js 22.13 或更高版本。

## 1. 创建自己的仓库

在 Garden 仓库页面点击 **Use this template**，选择自己的 GitHub 账号作为所有者。

如果想直接使用 `https://你的用户名.github.io` 作为博客地址，请把仓库命名为 `你的用户名.github.io`。例如用户名是 `alice`，仓库名就是 `alice.github.io`。

也可以使用任意仓库名；之后再绑定自定义域名即可。

这篇快速开始默认源码也公开。需要在 GitHub Free 下把草稿和原稿放进私有仓库时，完成第一次发布后再按[私有源码双仓模式](github-pages.md#方式二github-free-私有源码双仓)迁移，日常命令不会改变。

## 2. 打开 GitHub Pages

进入新仓库：

1. 点击 **Settings**。
2. 在左侧选择 **Pages**。
3. 在 **Build and deployment** 的 **Source** 中选择 **GitHub Actions**。

先不用等待页面出现，下一步推送内容后 GitHub 才会开始构建。

## 3. 写上自己的名字

打开根目录的 `site.config.yaml`，至少修改这几项：

```yaml
name: Alice 的花园
description: 写下我正在学习和思考的事。

author:
  name: Alice
  github: alice
```

页面标题可以之后再慢慢改。`site.config.yaml` 只管理站点身份和一级页的标题；文章内容不在这里写。

想先在本地预览时，只需运行：

```bash
make dev
```

第一次运行会自动安装依赖并创建 `.env.local`。默认不会展示草稿和未来定时文章；需要预览时使用 `CONTENT_INCLUDE_DRAFTS=1 make dev`。

## 4. 发布第一篇文章

在 `content/posts/` 新建 `hello.md`：

```md
---
title: 你好，世界
slug: hello
date: 2026-07-28T09:00:00+08:00
description: 我的第一篇文章。
topic: 随笔
tags: [开始]
---

这是我的第一篇文章。
```

提交并推送这份文件。如果你已在本地克隆仓库，最简单的方式是运行：

```bash
make update
```

它会先检查，再把本次所有改动提交为“更新博客”并推送。想写提交说明时可以使用：

```bash
make update
```

如果你直接在 GitHub 网页编辑文件，点击 **Commit changes** 即可，不需要运行命令。

## 5. 等待首次发布

打开仓库的 **Actions** 页面，等待 **Deploy public blog to GitHub Pages** 变为绿色。之后可访问：

- 根地址仓库：`https://你的用户名.github.io`
- 普通仓库：`https://你的用户名.github.io/仓库名`

到这里，你已经完成了第一次发布。

## 6. 之后怎么用

- 每次写文章：参考[内容编写](content-authoring.md)。
- 每次需要上线：运行 `make update` 或在 GitHub 网页提交文件。
- 想先在本地看效果：运行 `make dev`，浏览器打开终端显示的地址。
- 想绑定自己的域名：参考 [GitHub Pages 与自定义域名](github-pages.md)。

评论、Webmentions、随想后台均为可选功能，等基础写作流程跑顺后再配置即可。
