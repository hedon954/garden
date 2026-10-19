---
title: 用 Markdown 写丨推送之后网站自己更新
description: 用 Markdown 写文章、随想和专栏，保存在自己的 Git 仓库里。
section: overview
order: 0
---

长篇技术文章除了段落，常常还有架构图、多列对比和改过的代码。在 Garden 里这些都用普通 Markdown 写，排版交给构建流程和页面脚本。下面每一节都附带实际效果。

## 标题分行与 `740px` 正文列

上方的标题在 `丨` 处分成两行，字号按较长一行自动计算。正文保持在 `740px` 阅读列内，宽图会在两侧留白里对称外扩，不会盖住导航和目录。

下面这张透明底的线稿在深色模式下会自动垫上暖白底，不用另做一套配图：

![740px 正文阅读列、1040px 宽图区与 1340px 宽表区示意（透明背景黑线 SVG，深色模式下自动衬上 #faf9f5 暖白纸底）。](./assets/reading-layout.svg)

## 多列宽表格自动向外延伸

表格不折行时比正文列宽，就会向两侧对称拓宽，文章页最宽 `1340px`。下面这张宽表在桌面端会伸出正文列：

| 内容形态 | 源文件位置 | 页面如何处理长文与媒体细节 | 适用场景 |
| :--- | :--- | :--- | :--- |
| 长篇技术文章 | `content/posts/<slug>.md` 及同名资源目录 | 自动测量本地配图宽高写入 HTML 防抖动，支持 `丨` 标题分行、宽图宽表外扩、LaTeX 公式与 Mermaid 图表 | 系统设计拆解、源码走读、排障复盘与长篇读书笔记 |
| 随想与日常记录 | `content/thoughts/<slug>.md` | 支持多图宫格、原生音视频播放（`image` / `audio` / `video`）以及外部网页链接卡片（`link`） | 几句话的灵感、终端截图、短音视频与日常链接摘录 |
| 主题系列专栏 | `content/columns.yaml` | 按顺序串联 `content/posts/` 下的多篇长文，在阅读页自动生成专栏进度与上下篇导航 | 连载教程、专题研究或按章节组织的系统笔记 |

## 代码块与「对比上一版」切换

把改好的完整代码块和一段 `diff` 紧挨着写，页面会把它们合成一个可以切换「代码」和「对比上一版」的代码框。复制按钮复制的总是新版完整代码。

```yaml
pages:
  garden:
    title: "用 Markdown 写丨推送之后网站自己更新"
    subtitle: "用 Markdown 写文章、随想和专栏，保存在自己的 Git 仓库里。"
```

```diff
 pages:
   garden:
-    title: "用 Markdown 写。\n推送之后，网站自己更新。"
-    subtitle: ""
+    title: "用 Markdown 写丨推送之后网站自己更新"
+    subtitle: "用 Markdown 写文章、随想和专栏，保存在自己的 Git 仓库里。"
```

> [!NOTE]
> `diff` 代码块前面必须紧挨着一段完整代码块；如果单独放一段 `diff` 而前面没有完整代码，`npx garden check` 会报 `diff-orphan` 错误。

> [!TIP] 提示框支持自定标题
> 在 `> [!TIP]` 同一行后面直接写文字（或者下一行单独放一行粗体），会替换默认的「建议」标题。支持 `NOTE`、`TIP`、`IMPORTANT`、`WARNING`、`CAUTION` 等常见类型。

## 在文章里嵌入结构化组件

需要数字、对比、时间线或图表时，用 ```` ```garden <name> ```` 围栏插入内置组件。下面是一组 `garden stat`：

```garden stat
items:
  - label: 正文阅读列
    value: "740"
    unit: px
    caption: 段落、代码块与列表的默认列宽
  - label: 宽幅配图区
    value: "1040"
    unit: px
    caption: 截图按像素宽度的一半显示，像素宽度约 2000px 以上时展开到这个宽度
  - label: 多列宽表区
    value: "1340"
    unit: px
    caption: 宽表格在桌面端向两侧对称外扩上限
```

9 个内置组件的完整参数与实时示例见左侧导航的 [组件总览](/garden/components)。

<h2 id="garden-admin-title">从初始化到日常写作</h2>

站点仓库只放配置、文章和静态资源，渲染和构建由 `hd-garden` 包完成。本地建站并预览：

```bash
npx hd-garden init my-blog
cd my-blog
npm install
make dev
```

写完运行 `make update`，检查通过后会提交并推送。细节见各章：

- **[快速开始](/garden/start)**：目录结构、`make new` 新建长文、草稿预览与日常命令。
- **[站点与专栏配置](/garden/config)**：`site.config.yaml` 各字段含义、自定义 SVG 图标与 `content/columns.yaml` 专栏编排。
- **[发布到 GitHub Pages](/garden/deploy)**：单个公开仓库或「私有源码仓库 + 公开页面仓库」的完整 Actions 工作流。
- **[写文章与随想](/garden/writing)** 与 **[阅读排版是怎么工作的](/garden/design)**：Front Matter 字段、外链卡片、三级自适应宽度与色彩变量。
