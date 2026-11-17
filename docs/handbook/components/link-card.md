---
title: 链接卡片
navTitle: 链接卡片
description: 详解行内普通外链、行内带卡片链接与独立单行链接卡片三种形态的写法、双端真实渲染与在线实时演练场。
section: components
order: 31
---

## 是什么

链接卡片（Link Card）是 Garden 原生内置的超链接增强体系。它不需要写任何代码块围栏，只通过标准 Markdown 链接的位置（行内 vs 单独成段）与末尾可选的 `{card}` 标记，自动将普通外部网址增强为**带站点 Favicon 图标的行内跳链**或**带网站名称、标题、摘要与 OpenGraph 封面缩略图的结构化预览卡片**。

## 有什么用

- **降低跳转盲目性**：读者点开外部文档、论文或开源仓库前，先通过卡片看到页面标题、核心简介和来源域名，判断是否值得打断当前阅读去点开。
- **零第三方追踪与离线稳健**：所有站点 Favicon 与卡片封面均在构建期（`garden links` / `garden build`）抓取并存为站点自身的本地静态文件；目标网站临时超时或改版不会拖慢读者打开文章的速度。
- **适用边界区分**：
  - 只想顺手给一个词加跳转链接 → 用**行内（不带卡片）**；
  - 链接嵌在句子里，但这个网页非常关键、希望段后再附一张预览卡 → 用**行内（带卡片）**；
  - 专门推荐一篇文章或项目作为独立段落展示 → 用**单行（带卡片）**；
  - 仅在句尾轻量标明引文出处、不需要外链箭头和整张大卡片 → 改用 **[来源胶囊](/garden/components/source/)**。

---

## 形态一：行内（不带卡片）

### 怎么写

直接在句子里写标准 Markdown 链接 `[显示文字](https://...)`，不在末尾加 `{card}`：

```markdown
日常写长文可以使用 [Typora](https://typora.io/) 获得干净的沉浸式体验，语法细节遵循 [CommonMark 规范](https://spec.commonmark.org/)。
```

- 指向外部域名时，引擎自动在文字前渲染构建期抓取的 `14×14` 站点 Favicon，并在末尾标出 `↗`；图标与链接**第一个字强制绑定在同一行**（`.fav-keep`），绝不会出现图标孤立留在上一行行尾的排版瑕疵。
- 指向 `site.config.yaml` 中配置的本站域名（或站内路径）时，自动作为站内无刷新路由跳转，不加外链箭头。

### 实际长什么样（Web 端与移动端双形态）

<div data-doc-showcase="行内（不带卡片）真实渲染">

日常写长文可以使用 [Typora](https://typora.io/) 获得干净的沉浸式体验，语法细节遵循 [CommonMark 规范](https://spec.commonmark.org/)。

</div>

---

## 形态二：行内（带卡片）

### 怎么写

在行内链接的右括号 `)` 后面**紧跟 `{card}`**（中间不要加空格）：

```markdown
表格、任务列表和脚注都来自 [remark-gfm](https://github.com/remarkjs/remark-gfm){card}，它让 GitHub 风格 Markdown 语法在正文中直接生效。
```

- 原句中的链接文字照常保留可点击跳转；
- 在该自然段正下方，自动生成一张对应的预览卡片（为避免键盘 Tab 和屏幕阅读器把同一个链接读两遍，段后跟随卡自动设置 `tabIndex={-1}` 与 `aria-hidden="true"`）；
- **Web 端 vs 移动端自适应差异**：Web 桌面端卡片为**左文右图**横向排布（右侧固定 `168×88` 缩略图）；移动端（`375px`）自动翻转为**上图下文**竖向卡片，缩略图铺满卡片宽度。

### 实际长什么样（Web 端与移动端双形态）

<div data-doc-showcase="行内（带卡片）真实渲染：对比桌面端左文右图与移动端上图下文">

表格、任务列表和脚注都来自 [remark-gfm](https://github.com/remarkjs/remark-gfm){card}，它让 GitHub 风格 Markdown 语法在正文中直接生效。

</div>

---

## 形态三：单行（带卡片）

### 怎么写

有两种等价写法，只要**前后留空行、整段只有这一条链接**，整行就会直接替换为独立可聚焦的链接卡片：

1. **直接写一行裸网址**（注：如果是可播放的 Bilibili / YouTube 视频网址，裸写会优先渲染为视频播放器；若视频网址也想强制显示为链接卡片，用第 2 种带 `{card}` 写法即可）：
   ```markdown
   https://spec.commonmark.org/
   ```
2. **单独一行写 `[自定义兜底标题](网址){card}`**（当目标网页没有 OpenGraph 标题时，会使用方括号里的文字作为卡片标题）：
   ```markdown
   [KaTeX 支持的数学函数清单](https://katex.org/docs/supported.html){card}
   ```

### 实际长什么样（Web 端与移动端双形态）

<div data-doc-showcase="单行（带卡片）真实渲染：裸网址与带标题单行卡片">

https://spec.commonmark.org/

[KaTeX 支持的数学函数清单](https://katex.org/docs/supported.html){card}

</div>

> [!NOTE] 转义与防误触规则
> 写在行内代码或代码块里的 `` `[示例](https://example.com){card}` `` 会原样显示代码文本；`{card}` 与 `)` 之间如果多打了空格，也会保持普通文本而不触发卡片。

---

## 在线演练场：修改代码实时查看效果

在下方左侧编辑器中切换预设或自行增删 `{card}`、修改链接文字与网址，点击 **「更新渲染」**（或按 `⌘/Ctrl + Enter`），右侧即可实时重绘并支持切换 **Web 端 / 移动端** 视图：

```doc-playground
{
  "title": "链接卡片交互演练场",
  "description": "尝试去掉或加上 {card}、修改段落文字，点击「更新渲染」并切换右侧 Web 端 / 移动端观察卡片形态变化。",
  "presets": [
    {
      "id": "inline-card",
      "label": "行内（带卡片）",
      "code": "表格、任务列表和脚注都来自 [remark-gfm](https://github.com/remarkjs/remark-gfm){card}，你可以试着修改这句正文或把末尾的 {card} 删掉再点更新渲染。"
    },
    {
      "id": "standalone-card",
      "label": "单行（带卡片）",
      "code": "https://spec.commonmark.org/\n\n[KaTeX 支持的数学函数清单](https://katex.org/docs/supported.html){card}"
    },
    {
      "id": "inline-plain",
      "label": "行内（不带卡片）",
      "code": "不加卡片标记时，[Typora](https://typora.io/) 与 [CommonMark](https://spec.commonmark.org/) 只在行内显示站点图标和右上角外链箭头。"
    }
  ]
}
```
