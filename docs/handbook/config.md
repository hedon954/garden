---
title: 站点与专栏配置
description: 修改 site.config.yaml 设置网站标题、作者信息与旧链接跳转，用 content/columns.yaml 把多篇文章编成专栏。
section: getting-started
order: 2
---

## 修改网站基本信息（`site.config.yaml`）

打开站点根目录下的 `site.config.yaml`，就能修改网站名字、作者信息和各个栏目的标题：

```yaml
name: "林的笔记本"
tagline: "数据库、网络协议与日常排障记录"
description: "记录系统开发中的实验数据与读书笔记。"
locale: "zh-CN"
url: "https://notes.example.com"
trailingSlash: true

author:
  name: "Lin"
  github: "octocat"
  githubBio: "做存储引擎和网络服务。"
  githubPinned:
    - "octocat/lsm-bench"
    - "octocat/raft-sim"

brand:
  logo: "/icons/logo.svg"          # 设为 false 可以隐藏左上角图标，只显示网站名字
  favicon: "/favicon.svg"          # 放到 public/ 下，打包时会自动生成兼容旧浏览器的 favicon.ico
  appleTouchIcon: "/apple-touch-icon.png"

pages:
  home:
    eyebrow: "最近更新"
    title: "记一些正在折腾的技术问题。"
    lead: "长文写完整推演，随想记现场碎片。"
  blog:
    title: "文章"
    subtitle: "按年份和标签归档的长文。"
  thoughts:
    title: "随想"
    subtitle: "简短的排障记录与日常想法。"
  columns:
    title: "专栏"
    subtitle: "按顺序读的一组文章。"
  tags:
    title: "标签"
    subtitle: "按主题查找文章。"
  about:
    title: "关于"
    subtitle: "个人简介、开源项目与联系方式。"

footer: "基于 Garden 构建"
```

## 常用配置项说明

| 字段 | 作用 |
| :--- | :--- |
| `name` | 网站名称，显示在顶部导航栏左边、浏览器标签页标题和 RSS 订阅源里。 |
| `url` | 你的正式域名（比如 `https://example.com`），生成 RSS 订阅和站点地图时会用到。 |
| `author.github` | 填你的 GitHub 用户名，「关于」页面会自动拉取你的头像、简介和代表仓库。 |
| `author.githubPinned` | 指定「关于」页面展示哪几个 GitHub 仓库（格式为 `用户名/仓库名`）。 |
| `brand.logo` | 顶部导航栏左侧的小图标路径；如果不想显示图标，写成 `logo: false` 即可。 |
| `brand.favicon` | 浏览器标签页图标，放在 `public/` 目录下即可。 |

## 把多篇文章编成专栏（`content/columns.yaml`）

如果你围绕同一个主题写了好几篇系列文章，可以在 `content/columns.yaml` 里把它们串成一个专栏。加入专栏的文章依然会正常出现在「文章」列表里，同时在「专栏」页面会多出左侧章节目录和文末的「下一篇」引导。

```yaml
columns:
  - slug: storage-notes
    title: 存储引擎实现手记
    description: 从磁盘页格式、预写日志到 LSM-Tree 压缩调度的系列笔记。
    status: 连载中
    cover: /media/covers/storage-column.svg
    coverAlt: 存储引擎结构示意
    posts:
      - storage/page-layout
      - storage/wal-group-commit
      - storage/lsm-leveled-compaction
```

`posts` 列表里直接写文章在 `content/posts/` 下的路径（不用写 `.md` 后缀），排在前面的就是第一章，排在后面的就是下一章。

## 旧链接自动跳转（`redirects`）

如果你是从 Hexo、Hugo 或其他博客搬家过来的，怕以前的链接失效，可以在 `site.config.yaml` 末尾加上 `redirects`：

```yaml
redirects:
  "/2025/11/17/raft-log/": "/blog/consensus/raft-log-replication/"
  "/posts/old-slug": "/blog/new-slug/"
```

配好之后，打包生成的静态网站会在旧地址放一个自动跳转页，读者访问旧链接时会直接跳到新文章地址。
