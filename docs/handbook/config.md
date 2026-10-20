---
title: 站点与专栏配置
navTitle: 站点与专栏配置
description: 配置 site.config.yaml 中的站点信息、各页标题、自定义品牌图标与 content/columns.yaml 专栏。
section: getting-started
order: 3
---

站点的全局文字与外观信息集中在根目录的 `site.config.yaml`，专栏目录集中在 `content/columns.yaml`。修改后运行 `npx garden sync`（或直接 `make dev`）即可生效。

## 1. `site.config.yaml` 完整结构

下面是站点模板默认的 `site.config.yaml` 字段：

```yaml
name: Garden
tagline: 写作 · 记录 · 保持好奇
description: 文章、随想和专栏。
locale: zh_CN
# 站点的公开地址。文章里指向这个地址的完整网址会按站内链接显示。
# url: https://blog.example.com
# 站点图标，不写时使用 Garden 自带的图标。
# brand:
#   logo: brand/logo.svg
#   favicon: /favicon.svg
#   appleTouchIcon: /apple-touch-icon.png

author:
  name: Your Name
  github: your-github-id
  githubBio: 一句自我介绍。
  githubPinned: []

pages:
  home:
    title: |-
      记一些正在做的事，
      和想清楚的问题。
    subtitle: 软件、笔记，和偶尔的工作记录。
  blog:
    title: 博文
    subtitle: 写完的长文。
  thoughts:
    title: 随想
    subtitle: 短笔记、图片和链接。
    # 每屏显示多少条，往下读时自动加载下一屏。默认 10。
    # pageSize: 10
  columns:
    title: 专栏
    subtitle: 按顺序读的一组文章。
  about:
    title: 你好，我是 Your Name。
    subtitle: 文章和笔记都在这里。
    heading: 关于
    paragraphs:
      - 一名工程师。平时写代码，也把想清楚的问题记下来。
      - 这里放文章、随想和专栏。
    quote: ""
    focus:
      - 软件
      - 笔记
      - 日常
    cta:
      href: /blog
      label: 浏览博文
  garden:
    title: "用 Markdown 写。\n推送之后，网站自己更新。"
    subtitle: ""

footer: 持续记录。
```

### 顶层与作者字段

| 字段 | 说明 |
| :--- | :--- |
| `name` | 站点名称，显示在左上角导航栏、浏览器标题后缀与 RSS 订阅源标题 |
| `tagline` | 站点副标题 |
| `description` | 站点简介，用于首页 SEO 描述与 RSS 频道描述 |
| `locale` | 语言与地区标识，默认写 `zh_CN`（下划线格式）；设为 `en_US` 时，全站框架文案（导航、首页、文章列表、文章元信息与永久链接、Giscus 评论提示、标签、专栏、关于页、404 页面、分页、RSS/sitemap 与 meta/og）会在构建时切换为英文 |
| `url` | 站点的公开完整网址（如 `https://blog.example.com`）。配置后，文章里指向该地址的完整链接会自动按站内链接处理 |
| `author.name` | 作者署名，显示在文章元信息栏、关于页和页脚 |
| `author.github` | GitHub 用户名（不要写完整网址），用于拼接 GitHub 主页链接及拉取关于页的公开动态 |
| `author.githubBio` | 当构建环境没有配置 `GITHUB_TOKEN` 时的个人简介降级文字 |
| `author.githubPinned` | 本地无 `GITHUB_TOKEN` 时的置顶仓库降级列表 |
| `footer` | 页脚签名文字 |

> [!NOTE]
> URL 末尾是否带斜杠（Trailing Slash）不由 `site.config.yaml` 控制：静态导出（`STATIC_EXPORT=1`）时始终开启，服务端构建可通过环境变量 `TRAILING_SLASH=1` 开启。

### `pages` 一级页面文案

`pages` 下的每个键对应一个一级路由的页头文字：

- **`pages.home`、`pages.blog`、`pages.thoughts`、`pages.columns`、`pages.garden`**：均使用 `title` 和 `subtitle` 两个字段。其中 `/garden/` 页面会读取 `pages.garden.title`（写一个「丨」就在那里分成两行）和 `pages.garden.subtitle`。
- **`pages.about`**：除 `title` 和 `subtitle` 外，还支持 `heading`（正文小标题）、`paragraphs`（段落数组）、`quote`（引言）、`focus`（关注方向标签数组）以及 `cta`（`{ href, label }` 按钮）。

### `brand` 自定义图标与路由重定向

- **`brand.logo`**：左上角站点名左侧的 SVG 标志。文件相对于站点根目录解析（例如放在 `brand/logo.svg`），构建时会内联进页头并跟随当前文字颜色。设为 `false` 可隐藏左上角图标。
- **`brand.favicon` 与 `brand.appleTouchIcon`**：放在 `public/` 目录下的图标路径（如 `/favicon.svg`、`/apple-touch-icon.png`）；`appleTouchIcon` 设为 `false` 可不输出。
- **`redirects`**：旧文章改路径后，可在 `site.config.yaml` 顶层配置 `redirects` 映射（例如 `"/2024/01/20/old-post/": "/blog/new-post/"`），构建时会在旧路径生成跳转页，正文里的站内旧链接也会自动指向新地址。

## 2. 配置主题专栏（`content/columns.yaml`）

专栏用于把 `content/posts/` 里的多篇长文按阅读顺序编成一组。编辑 `content/columns.yaml`：

```yaml
columns:
  - slug: building-in-public
    title: 一个人造产品
    status: 连载中
    description: 从最小闭环到验证发布的完整记录。
    cover: windowsill-herbs.svg
    posts:
      - building-in-public/smallest-closed-loop
      - building-in-public/ship-with-evidence
```

| 字段 | 必填 | 说明 |
| :--- | :--- | :--- |
| `slug` | 是 | 专栏标识，只能包含小写字母、数字和连字符，生成路由 `/columns/<slug>/<post>` |
| `title` | 是 | 专栏名称（同时会显示在 `/blog` 文章列表对应文章的右侧） |
| `description` | 是 | 专栏简介，显示在 `/columns` 列表卡片上 |
| `status` | 否 | 状态文字（如 `连载中` 或 `已完结`） |
| `cover` | 否 | 专栏封面图路径（相对 `content/covers/`） |
| `posts` | 是 | 按阅读顺序排列的文章路径列表（相对于 `content/posts/`，不带 `.md` 后缀） |
