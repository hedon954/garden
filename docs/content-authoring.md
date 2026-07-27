# 内容编写

所有内容都是普通 Markdown 文件。先写正文；封面、标签、草稿和专栏都可以之后再补。

## 新建一篇博文

在 `content/posts/` 或它的任意子目录新建一个 `.md` 文件，例如 `content/posts/go/runtime/gc.md`。目录只服务于仓库整理，网页地址仍由 `slug` 决定。

```md
---
title: 我的文章标题
slug: my-first-post
date: 2026-07-28T09:00:00+08:00
description: 用一句话说明文章讲什么。
topic: 写作
tags: [Markdown, 写作]
---

从这里开始写正文。
```

写完后运行 `make update`，或直接在 GitHub 网页提交文件。

## 丰富文章内容

### 添加封面

把图片放在文章旁的 `assets/` 目录，并在文章开头填写相对路径：

```yaml
cover: ./assets/cover.jpg
```

封面会按图片本身比例显示，不会被固定裁切。

### 插入图片、音频和视频

相对路径在本地编辑器和网页中都可用：

```md
![雨后的街道](./assets/rain.jpg)

<audio controls src="./assets/rain.mp3"></audio>

<video controls src="./assets/walk.webm"></video>
```

网页中的图片可以点击放大。构建时，本地附件会复制到公开目录；不要把大型音视频放进 Git，后台上传的多媒体应使用阿里云 OSS。

### 代码、公式和图表

````md
```ts
const hello = "world";
```

行内公式 $E=mc^2$。

$$
\int_0^1 x^2 dx = \frac{1}{3}
$$

```mermaid
flowchart LR
  Write[写作] --> Publish[发布]
```
````

Mermaid 图表同时提供“图表”和“代码”查看方式。

## 草稿与置顶

在文章开头增加：

```yaml
draft: true
publishAt: 2026-08-01T09:00:00+08:00
pinned: true
```

- `draft: true`：不公开发布。
- `publishAt`：到指定时间才公开。
- `pinned: true`：固定到首页置顶博文区。

## 创建专栏

专栏不复制文章。先把文章写进 `content/posts/`，再在 `content/columns.yaml` 用文章的相对路径排出一条阅读路径：

```yaml
columns:
  - slug: reading-notes
    title: 读书笔记
    description: 记录阅读过程中的问题与判断。
    status: 连载中
    cover: /images/columns/reading-notes.webp
    posts:
      - reading/why-read
      - reading/notes-from-reading
```

`posts` 的顺序就是专栏阅读顺序。路径相对 `content/posts/`，可省略 `.md`，也兼容直接填写 `slug`。同一篇博文可以被多个专栏引用，正文仍然只维护一份。专栏页会显示文章列表和当前文章目录。

## 发布随想

随想通过管理后台发布最方便：文字、多个图片、音频、视频和链接可以出现在同一条随想里。后台上传的媒体会进入阿里云 OSS，不会提交进 Git。

需要从文件维护时，在 `content/thoughts/` 新建 Markdown，并添加 `title`、`slug` 和 `date`。多媒体格式见 [随想管理后台](admin-service.md)。

## 下一步

- 想改首页、博客、随想和关于页的标题：看[站点界面配置](site-configuration.md)。
- 想接评论或 Webmentions：看[外部集成](integrations.md)。
- 想在发布前检查：运行 `make check`。
