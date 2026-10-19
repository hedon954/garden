# 内容编写

所有内容都是普通 Markdown 文件。先写正文；封面、标签、草稿和专栏都可以之后再补。

## 新建一篇博文

在仓库根目录运行：

```bash
make new
make new TITLE="我的第一篇文章" SLUG=my-first-post
make new TITLE="Go 垃圾回收笔记" SLUG=gc DIR=go/runtime
```

命令直接创建 `content/posts/<DIR>/<SLUG>.md`，默认 `draft: true`，填好当前日期、标题、摘要占位和空标签列表。`make new` 调用已安装的 Garden 引擎；还没有 `node_modules` 时会先安装依赖。写稿脚本在引擎里，不放进站点仓库。

| 参数 | 作用 | 省略时 |
| --- | --- | --- |
| `TITLE` | 文章标题 | 新文章 |
| `SLUG` | 文件名，不含 `.md`；小写字母、数字和连字符 | 从标题中的英文字母和数字生成；纯中文标题使用 `post-日期-随机标识` |
| `DIR` | 相对 `content/posts/` 的目录，支持多级 | 直接放在 `content/posts/` |

目录各级可使用文字、数字、下划线和连字符，例如 `go/runtime`。不存在的目录会自动创建；同名文件会报错并保留原文。文章 URL 跟随文件路径，例如第三条命令对应 `/blog/go/runtime/gc/`。

打开生成的 Markdown，完善摘要、标签和正文。预览草稿：

```bash
CONTENT_INCLUDE_DRAFTS=1 make dev
```

准备发布时，将 `draft` 改为 `false`，再运行 `make update MESSAGE="发布新文章"`。`make update` 会检查、提交并推送工作区中的所有改动。

### 手动创建 Markdown

在 `content/posts/` 或它的任意子目录新建一个 `.md` 文件，例如 `content/posts/go/runtime/gc.md`。文件名就是文章标识，目录同时决定网页地址：它会发布为 `/blog/go/runtime/gc`。

```md
---
title: 我的文章标题
date: 2026-07-28 09:00:00
description: 用一句话说明文章讲什么。
tags: [Markdown, 写作]
---

从这里开始写正文。
```

写完后运行 `make update`，或直接在 GitHub 网页提交文件。

`date`、`updated` 和 `publishAt` 写成 `2026-09-18 14:39:00`，按北京时间理解。只写 `2026-09-18` 时，按当天 00:00 计算。以前写过的 ISO 时间仍然能解析。

### 参考列表

推荐额外阅读写在 front matter，不写进正文。它和正文里的外链没有对应关系：正文提到的链接可以不进这张表，表里的材料也可以只是推荐、不必在正文出现。

```yaml
references:
  - title: KCP repo
    url: https://github.com/skywind3000/kcp
  - title: 深入理解计算机系统
```

每项必须有 `title`。`url` 可选，只接受 `http` 和 `https`。页面在正文下面、标签前面显示成一张暖灰卡片里的编号列表：标题后面跟着来源网站，6 条以上在宽屏分两栏。有链接的标题可以点开，没有链接的只显示标题。不写 `references` 就不显示这块。

## 丰富文章内容

### 添加封面

本地封面放在 `content/covers/`。`cover` 相对这个目录解析，不相对文章文件：

```yaml
cover: writing/first-post.jpg
```

上面这一行对应 `content/covers/writing/first-post.jpg`。构建会把它复制到 `/media/covers/writing/first-post.jpg`。以 `http://`、`https://` 或 `/` 开头的地址原样使用，不会到 `content/covers/` 里查找。封面按图片本身比例显示，不会被固定裁切。

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

X 与微信公众号没有稳定、无脚本、可长期依赖的通用 iframe，因此不会伪装成站内全文。`embed` 卡片上的文字以你写进围栏的为准，原站暂时不可用时文章仍然可读。想让卡片内容跟着原站走，用下面的[链接卡片](#链接卡片与网站图标)。

写稿时可以先拉一次摘要，再贴进 Markdown：

```bash
make embed URL="https://example.com"
```

命令只在你的机器上请求该网址，打印一段填好 `title` / `description` / `image` 的 `embed` 围栏。请检查后再粘贴。

URL 只接受 `http` 或 `https`。YouTube 使用隐私增强播放器；Bilibili 普通视频分享链接会转换为播放器地址。大型音视频仍建议放在对象存储，不要直接提交进 Git 历史。

### 链接卡片与网站图标

正文里的外链会在文字前显示对方网站的小图标。不用写任何东西。

想让某个链接显示成卡片（标题、简介、作者、日期和配图），在链接后面紧跟 `{card}`，中间不留空格：

```md
KV Cache 的来龙去脉可以看 [这篇讲解](https://huggingface.co/blog/not-lain/kv-caching){card}，写得很清楚。

[Understanding and Coding the KV Cache in LLMs](https://magazine.sebastianraschka.com/p/coding-the-kv-cache-in-llms){card}
```

- 链接写在句子里：文字照常可点，卡片跟在这一段后面。
- 链接单独占一行：这一行直接换成卡片。
- 写在代码里的 `{card}` 原样显示。摘要、RSS 和搜索里看不到它。

`garden build` 每次都会重新读取这些网页，把图标和卡片配图下载到 `public/link-assets/`，结果记在站点根目录的 `link-assets.json`。这两样请一起提交：某次构建连不上对方网站时，就沿用上次的结果；从来没取到过的，只显示网址，构建不会因此失败。读者打开文章时不会请求任何第三方网站。

只想刷新这些信息时运行 `npx garden links`；离线构建时设置 `GARDEN_OFFLINE=1` 跳过拉取。

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
content/posts/windowsill-herbs.md
content/posts/windowsill-herbs/layers.html
```

````md
```garden html
src: ./windowsill-herbs/layers.html
title: 水从土面渗到排水孔，大约要一分钟。
```
````

`src` 必须指向该同名目录里的本地 `.html` 或 `.pdf`，`caption` 必须是一句判断（搜索、RSS、关脚本的读者都靠它）。构建会复制文件、改写路径，并区分两种打开方式：带 `garden-chart` 高度回报的 HTML 是可交互图表，直接铺在正文里；普通 HTML 页面和 PDF 默认收成示意入口，读者点「展开」后再加载。Typora 只显示这段短 YAML；要看效果，直接打开文件，或运行 `CONTENT_INCLUDE_DRAFTS=1 make dev`。

第一次 `npx garden sync` 或 `npx garden dev` 会把引擎自带的 skill 装进 `.agents/skills/`。审查一篇稿时，对 AI 说审查这篇，并给出文件路径；硬性结构用 `npx garden check content/posts/文章.md`。五种原语、视觉规范和 AI 写法见 [可交互组件](interactive-blog-components.md) 与 [.agents/skills/garden-interactive-chart](../.agents/skills/garden-interactive-chart/SKILL.md)。拓扑仍用 Mermaid；只有读者需要自己走一步或拧旋钮时才加图表。

想让读者动手、又不想记组件名时，用一段 `intent` 围栏写下想法，让 AI 编译成 `ui` 块。语法、组件目录、后台工作台和 Typora / VS Code / Obsidian 插件见 [Intelligent UI 写作层](intelligent-ui.md)。

### 提供文件下载

想让读者下载一份文件（规格包、PDF、示例代码），用 `garden file` 围栏。文件放在这篇稿的同名目录里，`src` 相对这篇 Markdown 写：

```text
content/posts/go/go-lock.md
content/posts/go/go-lock/mutex-notes.pdf
content/posts/go/go-lock/demo.zip
```

同名目录里的 `.md` 是给读者的文件，不会作为文章发布。目录里有没被文章引用的 `.md` 时，`npx garden check` 会逐个点名提醒：要单独发布，就把它移出这个目录。

一个文件：

````md
```garden file
src: ./go-lock/demo.zip
title: 示例代码
note: 三个可以直接运行的加锁例子
```
````

一组文件：

````md
```garden file
title: 参考资料
files:
  - src: ./go-lock/mutex-notes.pdf
    note: 互斥锁的状态机，一页纸
  - src: ./go-lock/readme.md
  - src: https://oss.example.com/go-lock/trace.zip
    title: 完整 trace
```
````

| 键 | 说明 |
| --- | --- |
| `src` | 必填。本地文件写相对路径；放在对象存储里的写完整的 `https://` 地址 |
| `title` | 可选，卡片上的名字，默认是文件名 |
| `note` | 可选，一句话说明里面有什么 |
| `files` | 一组文件时用，每项写 `src`，也可以写 `title`、`note` |

格式和大小不用写，构建时会算出来，显示成「PDF · 204 KB」这样的一行：格式就是大写的扩展名（MD、HTML、PDF、ZIP、CSV……），没有扩展名的显示「文件」。构建会把本地文件复制到公开目录并改写路径；找不到文件，构建会失败。

本地的 Markdown、HTML 和 PDF 可以在页面里预览：点「预览」，文件在右侧打开，手机上占满全屏。

- Markdown 在构建时按正文的语法渲染成单独的文件（和原文件放在一起），点「预览」时才下载，文章页面本身不会因此变大。代码复制按钮、Mermaid 图和链接卡片只出现在正文里，预览里显示为普通代码和链接。
- HTML 在隔离的 iframe 里运行：脚本可以跑，但拿不到本站的 Cookie 和存储。
- PDF 用浏览器自带的阅读器打开。
- 其他格式（ZIP、CSV 等）只提供下载。

`https://` 地址的文件只提供下载和「在新标签页打开」，不在页面里预览。它们的大小来自构建时的一次 HEAD 请求，结果记在站点根目录的 `file-sizes.json`，请一起提交：某次构建连不上时沿用上次的大小；从来没取到过的就不显示大小，构建不会因此失败。只想刷新大小时运行 `npx garden files`。

超过 5 MB 的本地文件，`npx garden check` 会给出警告：Git 会永久保存每个版本，大文件请放到对象存储（如阿里云 OSS），`src` 写完整地址。警告不会挡住发布。

关掉脚本的读者点「预览」会在新标签页打开同样的内容（Markdown 是渲染好的页面，HTML、PDF 是文件本身），下载链接照常可用。

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

常用类型包括 `NOTE`（提醒）、`INFO`（提醒）、`TIP`（建议）、`SUCCESS`（建议）、`IMPORTANT`（重要）、`WARNING`（警告）、`CAUTION`（注意）、`DANGER`（注意）和 `FAILURE`（注意）。五种提醒框的配色分别是蓝、绿、紫、琥珀、红，标题都是 14px、600 字重。

## 草稿与置顶

在文章开头增加：

```yaml
draft: true
publishAt: 2026-08-01 09:00:00
pinned: true
```

- `draft: true`：不公开发布。
- `publishAt`：到指定时间才公开。
- `pinned: true`：固定到首页置顶博文区。

## 关掉标题自动编号

没有手写编号的文章，二级和三级标题会自动编成 1、1.1。文档、清单这类不需要章节号的文章，在开头写：

```yaml
numbering: false
```

正文和目录都不再显示自动编号。手写的编号（如 `## 2. 安装`）照常保留。

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

`posts` 的顺序就是专栏阅读顺序。路径相对 `content/posts/`，可省略 `.md`。同一篇博文可以被多个专栏引用，正文仍然只维护一份。为避免同名文件歧义，请填写相对路径。专栏页会显示文章列表和当前文章目录。

## 发布随想

随想通过管理后台发布最方便：文字、多个图片、音频、视频和链接可以出现在同一条随想里。后台上传的媒体会进入阿里云 OSS，不会提交进 Git。

需要从文件维护时，在 `content/thoughts/` 新建 Markdown。文件名就是地址，front matter 填写 `title` 和 `date`。多媒体格式见 [随想管理后台](admin-service.md)。

## 下一步

- 想改首页、博客、随想和关于页的标题：看[站点界面配置](site-configuration.md)。
- 想接评论或 Webmentions：看[外部集成](integrations.md)。
- 想在发布前检查：运行 `make check`。

## 中文加粗与公式排版

正文和目录均支持中文标点紧邻加粗边界，例如 `实现**掩码（Masking）**操作`、`引入**多头注意力（Multi-Head Attention）**机制`，无需在中文之间额外插入空格。标准 CommonMark 会将结束括号后紧邻中文的 `**` 当作普通文字；站点通过 `remark-cjk-friendly` 在解析阶段兼容这种写法。反引号包裹的代码与反斜杠转义的星号仍按字面显示。加粗标记内侧仍不要留首尾空格，例如应写 `**（说明）**`，不要写 `**（说明） **`。

正文图片在构建时读取尺寸，`<img>` 带上 `width` 和 `height`，图片还没加载时就占好位置，滚动时页面不跳。本地图片直接读文件；远程图片只下载开头几十 KB 读出尺寸，结果写进站点根目录的 `image-sizes.json`（请提交），以后构建不再下载。读不到尺寸的图片会在构建日志里给出警告，照常显示，只是不预留位置。新加远程图片后可以运行 `npx garden images` 单独更新。

数学表达式使用行内 `$\sum_{j=1}^{N}$` 或单独成行的 `$$` 公式块。公式块保留上下留白以完整显示求和上下限，过长公式在块内横向滚动。`<u>`、`<mark>` 和 `.hl` 都显示为荧光笔高亮（浅色 `#FFE58F`，深色 `#5E4E17`，色块落在文字下半部），跨行时每行单独成段，包括其中的行内代码；代码选区在深浅主题下都使用深蓝底白字。

公式样式的 `katex` 依赖必须与 `rehype-katex` 实际使用的版本一致。版本不匹配会导致上下标字号规则失效，产生重叠；依赖回归测试会检查两者是否一致。
