# 内容编写

所有内容都是普通 Markdown 文件。先写正文；封面、标签、草稿和专栏都可以之后再补。

## 新建一篇博文

在仓库根目录运行：

```bash
make new
make new TITLE="我的第一篇文章" SLUG=my-first-post
make new TITLE="Go 垃圾回收笔记" SLUG=gc DIR=go/runtime TOPIC="Go"
```

命令直接创建 `content/posts/<DIR>/<SLUG>.md`，默认 `draft: true`，填好当前日期、标题、摘要占位、分类和空标签列表。只需要 `make` 和 Node.js `>=22.13.0`；从框架 Fork 或 Use this template 后克隆到本地即可使用，无需先运行 `npm ci`，也不依赖 `.env.local`、站点身份或 GitHub 凭据。

| 参数 | 作用 | 省略时 |
| --- | --- | --- |
| `TITLE` | 文章标题 | 新文章 |
| `SLUG` | 文件名，不含 `.md`；小写字母、数字和连字符 | 从标题中的英文字母和数字生成；纯中文标题使用 `post-日期-随机标识` |
| `DIR` | 相对 `content/posts/` 的分类目录，支持多级 | 直接放在 `content/posts/` |
| `TOPIC` | 文章主题分类 | 未分类 |

目录各级可使用文字、数字、下划线和连字符，例如 `go/runtime`。不存在的目录会自动创建；同名文件会报错并保留原文。文章 URL 跟随文件路径，例如第三条命令对应 `/blog/go/runtime/gc/`。

打开生成的 Markdown，完善摘要、分类、标签和正文。预览草稿：

```bash
CONTENT_INCLUDE_DRAFTS=1 make dev
```

准备发布时，将 `draft` 改为 `false`，再运行 `make update MESSAGE="发布新文章"`。`make update` 会检查、提交并推送工作区中的所有改动。

### 手动创建 Markdown

在 `content/posts/` 或它的任意子目录新建一个 `.md` 文件，例如 `content/posts/go/runtime/gc.md`。目录同时决定网页地址：它会发布为 `/blog/go/runtime/gc`；`slug` 只作为内容标识。

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

### 嵌入外部平台和网页摘要

在正文中使用 `embed` 代码块。`url` 必填；`title`、`description` 和远程 `image` 可选：

````md
```embed
url: https://www.bilibili.com/video/BVxxxxxxxxxx
title: 这段视频讲了什么
description: 给读者一个值得点开的理由。
image: https://example.com/cover.jpg
```
````

| 来源 | 页面表现 |
| --- | --- |
| YouTube、Bilibili | 响应式播放器，同时保留原站链接 |
| X（Twitter）、微信公众号 | 带平台标识的摘要卡片与原文入口 |
| 其他 HTTP(S) 网站 | 使用标题、摘要和远程封面生成网页卡片 |

X 与微信公众号没有稳定、无脚本、可长期依赖的通用 iframe，因此不会伪装成站内全文。构建和发布也**不会**自动抓取任意网页的 Open Graph：这会引入 SSRF、超时和摘要随远站漂移的问题。卡片上的文字以你写进围栏的为准，原站暂时不可用时文章仍然可读。

写稿时可以先拉一次摘要，再贴进 Markdown：

```bash
make embed URL="https://example.com"
```

命令只在你的机器上请求该网址，打印一段填好 `title` / `description` / `image` 的 `embed` 围栏。请检查后再粘贴；构建阶段不会再访问外网。

URL 只接受 `http` 或 `https`。YouTube 使用隐私增强播放器；Bilibili 普通视频分享链接会转换为播放器地址。大型音视频仍建议放在对象存储，不要直接提交进 Git 历史。

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

本地 HTML 页面或 PDF 不要摊进 Markdown。一篇稿对应一个同名目录，目录里每一份 `.html` / `.pdf` 是一份可单独打开的文件；正文只用 `widget` 围栏嵌入。外部网页不要放进 `widget`，继续用上面的 `embed` 卡片。

```text
content/posts/understand-kv-cache.md
content/posts/understand-kv-cache/waste.html
```

````md
```widget
src: ./understand-kv-cache/waste.html
caption: 朴素 decode 每步重算全部过去 token；6 个 token 共 21 次计算，其中 15 次是浪费。
```
````

`src` 必须指向该同名目录里的本地 `.html` 或 `.pdf`，`caption` 必须是一句判断（搜索、RSS、关脚本的读者都靠它）。构建会复制文件、改写路径，并区分两种打开方式：带 `garden-chart` 高度回报的 HTML 是可交互图表，直接铺在正文里；普通 HTML 页面和 PDF 默认收成示意入口，读者点「展开」后再加载。Typora 只显示这段短 YAML；要看效果，直接打开文件，或运行 `CONTENT_INCLUDE_DRAFTS=1 make dev`。

五种原语、视觉规范和 AI 写法见 [可交互组件](interactive-blog-components.md) 与 [.agents/skills/garden-interactive-chart](../.agents/skills/garden-interactive-chart/SKILL.md)。拓扑仍用 Mermaid；只有读者需要自己走一步或拧旋钮时才加图表。

### 使用语义警告框

使用 Typora / Obsidian 兼容的 `[!TYPE]` 写法。没有自定义标题时，网页会根据类型显示对应中文标签；需要更具体的标题时，可直接写在类型后面。

```md
> [!NOTE]
> 这是一条补充提示。

> [!TIP] 推荐做法
> 先在本地预览，再发布文章。

> [!WARNING]
> 这项操作需要先备份。
```

常用类型包括 `NOTE`（提示）、`INFO`（说明）、`TIP`（建议）、`SUCCESS`（成功）、`IMPORTANT`（重要）、`WARNING`（告警）、`CAUTION`（警示）、`DANGER`（危险）和 `FAILURE`（失败）。

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

`posts` 的顺序就是专栏阅读顺序。路径相对 `content/posts/`，可省略 `.md`。同一篇博文可以被多个专栏引用，正文仍然只维护一份；为避免同名文件歧义，请始终填写路径，不要填写 `slug`。专栏页会显示文章列表和当前文章目录。

## 发布随想

随想通过管理后台发布最方便：文字、多个图片、音频、视频和链接可以出现在同一条随想里。后台上传的媒体会进入阿里云 OSS，不会提交进 Git。

需要从文件维护时，在 `content/thoughts/` 新建 Markdown，并添加 `title`、`slug` 和 `date`。多媒体格式见 [随想管理后台](admin-service.md)。

## 下一步

- 想改首页、博客、随想和关于页的标题：看[站点界面配置](site-configuration.md)。
- 想接评论或 Webmentions：看[外部集成](integrations.md)。
- 想在发布前检查：运行 `make check`。

## 中文加粗与公式排版

正文和目录均支持中文标点紧邻加粗边界，例如 `实现**掩码（Masking）**操作`、`引入**多头注意力（Multi-Head Attention）**机制`，无需在中文之间额外插入空格。标准 CommonMark 会将结束括号后紧邻中文的 `**` 当作普通文字；站点通过 `remark-cjk-friendly` 在解析阶段兼容这种写法。反引号包裹的代码与反斜杠转义的星号仍按字面显示。加粗标记内侧仍不要留首尾空格，例如应写 `**（说明）**`，不要写 `**（说明） **`。

数学表达式使用行内 `$\sum_{j=1}^{N}$` 或单独成行的 `$$` 公式块。公式块保留上下留白以完整显示求和上下限，过长公式在块内横向滚动。`<u>` 下划线连续显示，包括其中的行内代码；代码选区在深浅主题下都使用深蓝底白字。

公式样式的 `katex` 依赖必须与 `rehype-katex` 实际使用的版本一致。版本不匹配会导致上下标字号规则失效，产生重叠；依赖回归测试会检查两者是否一致。
