---
title: 写文章与随想
navTitle: 写文章与随想
description: 长文与随想的 Front Matter 字段、代码块对比、提示框、外链卡片、公式与流程图写法。
section: writing-and-reading
order: 10
---

Garden 的内容分为两类：**长文**（放在 `content/posts/`）和**随想**（放在 `content/thoughts/`）。两者都使用 UTF-8 编码的 Markdown 文件，文件名只能包含小写字母、数字和连字符（`a-z`、`0-9`、`-`）。

## 1. 长文 Front Matter（`content/posts/*.md`）

用 `make new DIR=systems SLUG=wal-checkpoint TITLE="深入理解 WAL丨检查点与恢复流程"` 创建文章，或者手动新建 `.md` 文件：

```yaml
---
title: 深入理解 WAL丨检查点与恢复流程
date: 2026-10-18
updated: 2026-10-19
description: 拆解预写日志在并发读写下的页面可见性规则，以及后台检查点如何控制日志文件体积。
tags:
  - 数据库
  - 存储
pinned: false
draft: false
cover: windowsill-herbs.svg
original: https://example.com/original-post
references:
  - title: SQLite Write-Ahead Logging
    url: https://www.sqlite.org/wal.html
  - title: 《Database Internals》
---
```

| 字段 | 必填 | 类型 | 说明 |
| :--- | :--- | :--- | :--- |
| `title` | 是 | 字符串 | 文章标题。中间写 `丨`、`｜` 或 ` \| ` 会分成两行并按字数缩放字号 |
| `date` | 是 | 日期字符串 | 发布日期（如 `2026-10-18` 或带时区的 ISO 时间） |
| `description` | 是 | 字符串 | 文章摘要，显示在正文开头导语、列表页与搜索引擎摘要中 |
| `updated` | 否 | 日期字符串 | 最后更新日期，显示在文章元信息栏并用于 RSS 排序 |
| `publishAt` | 否 | 日期字符串 | 定时发布时间；早于当前构建时间（或设置 `CONTENT_INCLUDE_DRAFTS=1`）才会发布 |
| `tags` | 否 | 字符串数组 | 文章标签列表，点击标签会跳转到 `/blog?t=<标签>` 筛选 |
| `pinned` | 否 | 布尔值 | 设为 `true` 时显示在站点首页「置顶」区域 |
| `draft` | 否 | 布尔值 | 设为 `true` 时视为草稿，正式构建会自动跳过 |
| `cover` | 否 | 路径字符串 | 封面图路径，相对 `content/covers/` 目录 |
| `original` | 否 | 完整链接 | 原文链接，设置后在标题下方元信息栏显示 `原文 ↗` |
| `references` | 否 | `{ title, url? }[]` | 文末参考资料列表，构建期自动提取域名并渲染在正文底部的「参考」卡片中 |

> [!CAUTION]
> 不要在 Front Matter 里手写 `slug` 字段（构建器会直接报错：`不要写 slug，文件名就是标识`）。文章也没有 `topic` 分类字段。

## 2. 代码块与「代码 / 对比上一版」切换

普通代码块在右上角带有语言名称（如 `RUST`、`TS`、`PYTHON`、`SHELL`）和复制按钮。

如果你想展示某段代码修改前后的对比，**先放一段完整的新版代码块，紧接着放一段 `diff` 代码块**。渲染器会自动把它们合并成一个带 **「代码」** 和 **「对比上一版」** 两个切换按钮的代码框：

````markdown
```go
func openStore(path string) (*Store, error) {
	return openWithMode(path, ModeWAL)
}
```

```diff
 func openStore(path string) (*Store, error) {
-	return openWithMode(path, ModeJournal)
+	return openWithMode(path, ModeWAL)
 }
```
````

实际渲染效果如下（点击右上角的 **「代码」** 与 **「对比上一版」** 可以切换，点击复制按钮始终复制完整的新版代码）：

```go
func openStore(path string) (*Store, error) {
	return openWithMode(path, ModeWAL)
}
```

```diff
 func openStore(path string) (*Store, error) {
-	return openWithMode(path, ModeJournal)
+	return openWithMode(path, ModeWAL)
 }
```

> [!IMPORTANT]
> 前面的完整代码块必须写**改动后的新版代码**，其内容必须与 `diff` 块去掉 `-` 删除行之后的结果完全一致；如果写成改动前的旧代码，`npx garden check` 会报 `code-diff-mismatch` 错误。

## 3. 中文加粗、荧光笔高亮与提示框

- **中文标点旁加粗**：内置 `remark-cjk-friendly`，紧挨中文括号、引号或顿号写 `**像「这样」的加粗**` 能正常解析，不需要在星号两侧加空格。
- **荧光笔高亮**：用 `<u>重点句子</u>` 或 `<mark>重点句子</mark>` 可以给文字加上暖黄色荧光笔底纹，效果如：<u>这一句带有荧光笔下划线底色</u>。
- **五种提示框（Callouts）**：使用 GitHub 风格 `> [!NOTE]`、`> [!TIP]`、`> [!IMPORTANT]`、`> [!WARNING]`、`> [!CAUTION]`。在标记同行末尾写文字可替换默认标题：

```markdown
> [!WARNING] 升级前先备份数据目录
> 修改页大小后需要重建索引文件，不能直接原地回退。
```

> [!WARNING] 升级前先备份数据目录
> 修改页大小后需要重建索引文件，不能直接原地回退。

## 4. 本地图片与外部链接卡片

- **本地图片与随文目录**：如果文章路径是 `content/posts/my-post.md`，把配图放在同名的 `content/posts/my-post/` 文件夹下，在文中写 `![图注说明](./assets/reading-layout.svg)`（此处以 `./<文章文件名>/<图片文件名>` 相对路径引用）。构建时会自动复制图片、读取像素宽高，并把 `alt` 文字（以 `image`、`截图`、`img` 开头的默认占位词除外）渲染成图注 `<figcaption>`。
- **行内外部链接**：正文里的外部链接会自动加上目标站点的 Favicon 小图标，并保证图标与链接第一个字同行不折断。
- **链接卡片**：有两种写法可以把外部链接渲染成带网站名、标题和简介的链接卡片：
  1. 把完整网址单独写成一行段落（前后空行）：`https://spec.commonmark.org/`
  2. 在段落内的链接末尾紧跟 `{card}`（中间不加空格）：`参见 [CommonMark 规范](https://spec.commonmark.org/){card}。`

> [!NOTE]
> 在长文正文里把 YouTube 或 Bilibili 网址单独放一行，只会生成普通外部链接卡片，**不会**变成视频播放器。如果要在页面内嵌入 YouTube 或 Bilibili 视频播放器，请使用下方「随想」的 `media` 字段。

## 5. 数学公式与 Mermaid 图表

- **LaTeX 数学公式**：使用 KaTeX 在构建与渲染期直接排版。行内公式写 `$L = \lambda W$`，独立公式块写 `$$...$$`。公式里带下划线的多字母变量名（如 `group_num`、`max_batch`）会自动保护为正体标识符 `\mathrm{group\_num}`，而 `W_q`、`H_{kv}` 等单字母带下标仍保持标准数学下标。
- **Mermaid 图表**：使用 ```` ```mermaid ```` 代码块直接绘制流程图或时序图，图表会自动适配浅色与深色主题（无全屏按钮或主题切换下拉框）：

```mermaid
graph LR
  A[Markdown 源文件] --> B[garden sync]
  B --> C[生成搜索与静态资源]
  C --> D[页面渲染]
```

## 6. 写随想（`content/thoughts/*.md`）

随想适合记录短文字、多张配图、音频、视频或外部视频链接（YouTube / Bilibili）：

```yaml
---
title: 雨夜调试记录
date: 2026-10-19 21:30
tags:
  - 日常
media:
  - type: image
    src: ./rainy-night/terminal.png
    alt: 终端里的压测输出
  - type: link
    src: https://www.bilibili.com/video/BV1xx411c7mD
    title: 演示录像
---

记一段简短的想法，支持完整的 Markdown 语法。
```

`media` 数组支持四类条目：`image`（最多拼成宫格图集）、`audio`（原生音频播放器）、`video`（原生视频播放器，可配 `poster`）和 `link`（当 `src` 为 YouTube 或 Bilibili 链接时自动渲染为内嵌播放器，其他网址渲染为链接卡片）。
