---
title: 用 Markdown 写丨推送之后网站自己更新
description: 用 Markdown 写文章、随想和专栏，保存在自己的 Git 仓库里。
section: overview
order: 0
---

Garden 是一个 Claude 风格的博客框架：文章用 Markdown 写，图表、指标、交互这些组件不用记语法，写一句话说清想要什么，交给 Agent 生成。

## 一个完整的例子

下面四步是同一篇稿子的真实过程，命令输出都是实际运行的结果。

### 1. 作者：写一句话

在想放交互的地方写一个不带名字的 `garden` 围栏，里面只写想让读者做什么、看到什么：

````markdown
## 写作节奏

```garden
让读者拖动每天写的字数和每周写几天，看写完一篇 8000 字的长文要几周。
```
````

### 2. Agent：拉出待转换的块，按 skill 转换

对 Agent 说「编译这篇：content/posts/writing-pace.md」。它按站点里的 `garden-ui` skill 先运行 `npx garden ui scan`，拿到这一块的位置、原话和哈希（输出节选）：

```console
$ npx garden ui scan content/posts/writing-pace.md
{
  "file": "content/posts/writing-pace.md",
  "draft": false,
  "blocks": [
    {
      "lang": "garden-idea",
      "status": "uncompiled",
      "startLine": 9,
      "intentHash": "cb3a3569",
      "intent": "让读者拖动每天写的字数和每周写几天，看写完一篇 8000 字的长文要几周。",
      "section": "写作节奏"
    }
  ]
}
```

再读 `npx garden ui prompt` 里的组件目录，写出 `garden interactive`，用 `npx garden ui apply` 只替换这一块，围栏外的文字一个字节都不动：

```console
$ npx garden ui apply content/posts/writing-pace.md --intent-hash cb3a3569 --file new.md
{"ok":true,"file":"content/posts/writing-pace.md","kind":"garden","line":9}
```

### 3. 提交：同一个脚本再查一遍

`garden sync` 或 `garden dev` 第一次运行时会装好提交前钩子，它运行的是 `npx --no-install garden ui check --staged --quiet`，和 Agent 自查用的是同一条命令。如果作者在第 2 步之前就提交，钩子会拦下来，并打印一段可以直接发给 AI 的提示词：

```console
$ git commit -m "写作节奏"
content/posts/writing-pace.md:9  -  garden-idea  还有没编译的想法

──────────────────────── 发给 AI 的修复提示词 ────────────────────────
请处理下面 Garden 博文里列出的块：没编译的想法要编译，有错误的交互块要修好。

要求：
- 先运行 npx garden ui prompt，读组件目录和规则；仓库里有 garden-ui skill 时按它的流程做。
- 只改列出的块，用 npx garden ui apply <稿件> --id <id> 写回（没有 id 的想法用 --intent-hash），不要直接编辑稿件。
- 不改作者原话的意思。改完运行 npx garden ui check <稿件>，直到通过。
- 如果你不能访问这个仓库，就只回复每块修好后的完整围栏。

1. content/posts/writing-pace.md，第 9–11 行，intent-hash: cb3a3569
   - garden-idea：这段想法还没编译，请按原话编译成 garden interactive 或其他 garden 组件（或判断后写回正文）。
（后面附当前围栏原文）
────────────────────────────────────────────────────────────
已写入 .garden/ui-fix-prompt.md。确实要先提交，可以用 git commit --no-verify。
```

提示词同时写进 `.garden/ui-fix-prompt.md`，能用剪贴板时也会自动复制。把它贴给 Agent，它就回到第 2 步。转换完再提交，钩子不再输出任何内容，提交照常完成。

### 4. 结果

第 2 步写回的块在页面上是这样，可以直接拖：

```garden interactive #writing-pace
caption: 每天多写几百字，比每周多写一天更快。
intent: |
  让读者拖动每天写的字数和每周写几天，看写完一篇 8000 字的长文要几周。
---
<State daily={500} days={3} />
<Let weekly={daily * days} />
<Let weeks={ceil(8000 / weekly)} />

<Slider bind="daily" label="每天写" min={200} max={2000} step={100} unit="字" />
<Slider bind="days" label="每周写" min={1} max={7} step={1} unit="天" />

<Stat label="写完 8000 字需要" value={weeks} unit="周" hint="不足一周按一周算" />
```

> [!IMPORTANT] 人和 Agent 用同一套工具
> 作者提交时跑的检查、Agent 找块用的扫描、写回用的命令，都是 `garden ui` 下的同一组子命令。检查不通过时给出的提示词，正好是 Agent 下一步要做的事。详见 [用 AI 写作](/garden/ai-writing)。

下面几节是不用 Agent 也会自动生效的排版。

## 标题分行与 `740px` 正文列

标题里写一个「丨」，就在那里分成两行，字号按较长一行自动计算。正文保持在 `740px` 阅读列内，宽图会在两侧留白里对称外扩，不会盖住导航和目录。

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

在改好的完整代码下面写一句话说明改了什么，Agent 会生成一段 `diff`；也可以自己写。完整代码和 `diff` 紧挨着时，页面会把它们合成一个可以切换「代码」和「对比上一版」的代码框，复制按钮复制的总是新版完整代码。

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
