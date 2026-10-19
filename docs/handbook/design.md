---
title: 阅读排版是怎么工作的
description: 为什么正文是 740px、高清配图和宽表格怎么自动向两边展开、长标题怎么断行，以及深色模式下的配图保护。
section: writing-and-reading
order: 2
---

## 正文保持 740px，大图大表自动往两边撑开

写技术文章经常遇到一个两难问题：如果整页都很宽，读普通文字时视线从行尾跳回下一行行首很容易看串行；可如果把整页都锁死在很窄的一栏里，遇到七八列的基准测试表格或者高分辨率架构图，又会被挤成一团。

Garden 在同一页里同时用了三种宽度，你写 Markdown 时不用加任何特殊标记，页面会自动判断：

```garden stat
items:
  - label: 普通文字与代码块
    value: "740"
    unit: px
    caption: 每行大约 40 个汉字，17px 字号配 1.75 倍行高
  - label: 高清截图与架构图
    value: "1040"
    unit: px
    caption: 图片够宽时自动向左右两边各拓宽最多 150px
  - label: 多列大表格
    value: "1340"
    unit: px
    caption: 表格列数多时自动向左右两边各拓宽最多 300px
```

## 长标题怎么断得好看

技术文章的标题往往很长。Garden 会自动帮你把长标题排成匀称的上下两行：

1. **自己指定断行位置（用全角竖线 `丨`）**：
   如果你在标题里写了 `丨`（比如 `存储引擎压缩手记丨写放大与读延迟的取舍`），页面就会严格从 `丨` 的地方拆成上下两行。
2. **没写 `丨` 时自动平衡**：
   当标题超过一定长度时，会自动优先在冒号 `：`、破折号 `——` 或者正中间的空格处拆成两行，并根据字数自动微调字号，不会出现最后一行只掉下来一两个字的情况。

## 配图不闪跳、宽图自动展开

把图片放进文章后，从打包到读者打开网页会依次做好三件事：

```garden figure
caption: 点下面的步骤按钮，看一张配图是怎么在页面上排好的。
parts:
  - id: build
    label: "1. 打包时记住图片尺寸"
    text: "打包时会自动读取每张本地图片的宽高写进网页。读者打开页面时，就算图片还没下载完，位置也已经留好了，下面的文字不会被顶得乱跳。"
  - id: ssr
    label: "2. 按清晰度算出合适宽度"
    text: "现在电脑截屏大多是 2 倍高清图，页面会按实际清晰尺寸算出显示宽度；如果超过正文 740px，就自动往左右两边展开，最宽到 1040px。"
  - id: client
    label: "3. 窗口变窄时自动收拢"
    text: "读者调整浏览器窗口大小时，宽图和宽表格会根据屏幕剩余空间自动收拢；如果展开后碰到了右边的章节目录，目录会自动往右让开。"
---
<svg viewBox="0 0 680 124" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="配图排版流程">
  <g data-p="build">
    <rect x="12" y="20" width="196" height="84" rx="8" fill="#f0eee6" stroke="#1b1a18" stroke-width="1.5" />
    <text x="110" y="54" text-anchor="middle" font-size="14" font-weight="600" fill="#1b1a18">1. 记住图片宽高</text>
    <text x="110" y="78" text-anchor="middle" font-size="12" fill="#6e6b64">打开网页文字不乱跳</text>
  </g>
  <path d="M 214 62 L 236 62" stroke="#6e6b64" stroke-width="1.5" />
  <g data-p="ssr">
    <rect x="242" y="20" width="196" height="84" rx="8" fill="#f0eee6" stroke="#1b1a18" stroke-width="1.5" />
    <text x="340" y="54" text-anchor="middle" font-size="14" font-weight="600" fill="#1b1a18">2. 宽图向两侧展开</text>
    <text x="340" y="78" text-anchor="middle" font-size="12" fill="#6e6b64">最宽展开到 1040px</text>
  </g>
  <path d="M 444 62 L 466 62" stroke="#6e6b64" stroke-width="1.5" />
  <g data-p="client">
    <rect x="472" y="20" width="196" height="84" rx="8" fill="#f0eee6" stroke="#1b1a18" stroke-width="1.5" />
    <text x="570" y="54" text-anchor="middle" font-size="14" font-weight="600" fill="#1b1a18">3. 右侧目录自动让位</text>
    <text x="570" y="78" text-anchor="middle" font-size="12" fill="#6e6b64">不挡表格与配图</text>
  </g>
</svg>
```

### 深色模式下怎么看清黑线透明图

很多手绘架构图或导出的流程图是「黑线 + 透明背景」的 PNG 或 SVG。一旦读者把网页切到深色模式，黑色的线条就会混进深色背景里看不清。

Garden 在深色模式下会自动给正文配图垫一层柔和的暖白纸底（`#faf9f5`），这样你平时只需要放一张图，浅色和深色模式下都能看得清清楚楚。

## 纸面配色一览

全站采用低对比眩光的暖白纸色和深灰墨色，没有刺眼的亮蓝色：

| 用途 | 浅色模式 | 深色模式 | 说明 |
| :--- | :--- | :--- | :--- |
| 页面背景 | `#faf9f5` | `#1f1e1d` | 暖白纸底与深灰夜读底色 |
| 代码框与引用块底色 | `#f0eee6` | `#262624` | 比背景略深一层，区分代码块与正文 |
| 组件卡片表面 | `#ffffff` | `#262624` | 卡片、抽屉与浮动面板底色 |
| 标题与重点文字 | `#1b1a18` | `#eeece7` | 标题与按钮主墨色 |
| 正文文字 | `#2d2c29` | `#dcd9d2` | 长文段落颜色 |
| 次要说明文字 | `#6e6b64` | `#a09b91` | 图注、日期、行号与辅助信息 |
| 边框细线 | `#e6e3dc` | `#3d3d3a` | 表格线与卡片外框 |
| `<u>` 荧光笔底色 | `#ffe58f` | `#5e4e17` | 标出重点句的暖黄底色 |
