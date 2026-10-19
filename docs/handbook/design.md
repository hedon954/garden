---
title: 阅读排版是怎么工作的
navTitle: 阅读排版是怎么工作的
description: 740/1040/1340px 三级宽度计算、丨标题断行、图片防抖动、深色模式图片衬底与无品牌蓝配色。
section: writing-and-reading
order: 11
---

Garden 的文章页面围绕长文阅读体验做了几项自动化处理。这些机制在博客文章、专栏文章和本说明书页面上使用同一套样式与测量脚本。

## 1. 三级自适应宽度：`740px` / `1040px` / `1340px`

文章页面的主体由居中正文列与右侧浮动目录（`200px`）组成。页面加载及窗口尺寸变化时，`ArticleMeasure` 脚本会测量正文中的图片与表格，按窗口两侧剩余空白对称向外拓宽：

| 内容元素 | 最大宽度 | 展开规则与边界条件 |
| :--- | :--- | :--- |
| 普通段落、列表、代码块、内置组件 | `740px` | 正文字号 `17px`、行高 `1.75`，每行约 38～42 个汉字，始终保持在阅读列内 |
| 宽幅配图（`.fig`） | `1040px` | 高分屏截图默认按像素宽度的一半（`naturalWidth / 2`）计算显示宽度；当显示宽度超过正文列且视口 `>= 900px` 时，向左右各最多延伸 `150px`（距窗口边缘至少留 `24px`；在说明书页面则限制在左侧导航与右侧目录之间的留白内） |
| 多列宽表格（`.table-wrap`） | `1340px` | 脚本先以 `max-content` 测量表格不折行时的真实宽度；超出 `740px` 且视口 `>= 900px` 时，向左右各最多延伸 `300px` |
| 右侧章节目录（`.toc`） | `200px` | 在独立文章页，当拓宽后的图片或表格右边缘靠近目录时，目录自动向右平移避让；若右侧空间不足以放下目录则自动隐藏，滚过宽元素后恢复 |

## 2. 标题断行与字号缩放

文章标题通过 `ArticleTitle` 组件处理，规则只有两条：

1. **写了分隔符（`丨`、`｜` 或前后带空格的 ` | `）**：在第一个分隔符处拆成上下两行，并按较长一行的字符宽度（汉字计 `1`、大写字母计 `0.68`、其余字符计 `0.58`、空格计 `0.3`）计算 `--l` 缩放变量，使较长一行刚好放进标题宽度而不再次折行。分隔符本身保留在屏幕阅读器可读文本中。
2. **没有写分隔符**：保持单段 `<h1>`，仅使用 CSS `text-wrap: balance` 让浏览器均衡换行，**不会**自动在冒号、破折号或中间位置拆行，也不会自动改变字号。

> [!NOTE]
> 如果标题里写了 `丨`，但分隔符左边或右边为空（例如 `丨副标题`），`npx garden check` 会报 `title-split` 警告（提示 `分隔符两侧都要有文字`）。

## 3. 构建期读取图片尺寸与点击放大

在运行 `npx garden sync` 时，构建脚本会直接解析本地图片（PNG、JPEG、WebP、GIF、SVG）的像素宽高并写入 `.garden/generated-content.ts` 的 `imageSizes` 表：

```garden figure
caption: 点击上方按钮查看图片从构建到渲染的三个阶段
svg: |
  <svg viewBox="0 0 680 110" xmlns="http://www.w3.org/2000/svg" font-family="var(--sans)">
    <rect data-p="sync" x="12" y="18" width="196" height="74" rx="10" fill="var(--card)" stroke="var(--rule-strong)" stroke-width="1.5"/>
    <text data-p="sync" x="110" y="50" text-anchor="middle" font-size="14" font-weight="600" fill="var(--ink)">1. 构建期读取尺寸</text>
    <text data-p="sync" x="110" y="72" text-anchor="middle" font-size="12" fill="var(--muted)">写入 width / height 与 --wl</text>
    <path d="M214 55 H236" stroke="var(--muted)" stroke-width="1.5"/>
    <rect data-p="measure" x="242" y="18" width="196" height="74" rx="10" fill="var(--card)" stroke="var(--rule-strong)" stroke-width="1.5"/>
    <text data-p="measure" x="340" y="50" text-anchor="middle" font-size="14" font-weight="600" fill="var(--ink)">2. 客户端测量拓宽</text>
    <text data-p="measure" x="340" y="72" text-anchor="middle" font-size="12" fill="var(--muted)">按当前视口调整宽图与目录</text>
    <path d="M444 55 H466" stroke="var(--muted)" stroke-width="1.5"/>
    <rect data-p="dark" x="472" y="18" width="196" height="74" rx="10" fill="var(--card)" stroke="var(--rule-strong)" stroke-width="1.5"/>
    <text data-p="dark" x="570" y="50" text-anchor="middle" font-size="14" font-weight="600" fill="var(--ink)">3. 深色衬底与灯箱</text>
    <text data-p="dark" x="570" y="72" text-anchor="middle" font-size="12" fill="var(--muted)">深色垫 #faf9f5 · 点击放大</text>
  </svg>
parts:
  - id: sync
    label: 1. 构建期读取尺寸
    text: 服务端生成的 HTML 已经带有图片的 `width`、`height`、`data-nw`、`data-bw` 以及宽图的初始 `--wl` / `--wr`，图片尚未下载完成时也不会把下方文字顶得跳动。
  - id: measure
    label: 2. 客户端测量拓宽
    text: 浏览器加载后，`ArticleMeasure` 根据当前窗口的实际宽度重新计算拓宽边距，并在滚动时实时判断宽图是否与右侧目录重叠。
  - id: dark
    label: 3. 深色衬底与灯箱
    text: "正文配图点击后可在当前页打开灯箱大图（按 `Esc` 或点击背景关闭）；深色模式下自动为配图设置 `--image-backing: #faf9f5` 背景。"
```

## 4. 深色模式配图衬底与暖纸墨色

技术文章里常有透明背景、深色线条的架构图或公式截图。切到深色模式后，如果直接放在深灰背景上，黑线会看不见；如果做反色滤镜（`filter: invert`），彩色截图又会失真。

Garden 的做法是在深色模式下把正文配图与灯箱大图的 `background` 设为浅色纸底变量 `var(--image-backing)`（即 `#faf9f5`），不加反色滤镜、不改内边距。透明底黑线图能直接看清，不透明的实心截图则完全不受影响。站点 Favicon 图标同样共用这一衬底变量，而文章封面、头像和链接卡片缩略图不会套用该规则。

全站配色定义在 `app/styles/tokens.css` 中，不使用品牌蓝，主要语义色值如下：

| 颜色变量 | 浅色模式 | 深色模式 | 用途 |
| :--- | :--- | :--- | :--- |
| `--paper` | `#faf9f5` | `#1f1e1d` | 页面主背景色（深色模式下配图衬底 `--image-backing` 亦为 `#faf9f5`） |
| `--paper-deep` / `--well` | `#f0eee6` | `#262624` | 代码块底色与内嵌凹槽背景 |
| `--chip` | `#f0eee6` | `#30302e` | 标签胶囊与按钮底色 |
| `--card` | `#ffffff` | `#262624` | 独立卡片、图框与弹窗底色 |
| `--ink` | `#1b1a18` | `#eeece7` | 标题、正文强调与主交互色 |
| `--text` / `--soft` | `#2d2c29` / `#4a4844` | `#dcd9d2` / `#bdb9b0` | 正文段落与次级说明文字 |
| `--muted` | `#6e6b64` | `#a09b91` | 日期、图注、表头辅助信息（均满足 WCAG AA 4.5:1 对比度） |
| `--rule` / `--rule-strong` | `#e6e3dc` / `#d6d2c9` | `#3d3d3a` / `#4d4c48` | 1px 细分割线、卡片边框与强调边线 |
