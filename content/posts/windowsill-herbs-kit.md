---
title: "窗台香草丨附录丨记录表与资料下载"
description: 播种指南、浇水记录表和排盆小工具，整理成可以下载和预览的文件。
date: 2026-10-15
tags:
  - 香草
  - 窗台
pinned: false
---

种了一季，用到的表格和小工具都放在这里。想照着种，先下载整包。

```garden file
src: ./windowsill-herbs-kit/herb-kit.zip
title: 窗台香草资料包
note: 浇水记录表（CSV 和 Markdown）和排盆小工具，解压就能用
```

## 单独的文件

每份文件也可以单独看。Markdown、HTML 和 PDF 点「预览」，在页面右侧打开，不用离开这篇。

```garden file
title: 种植资料
files:
  - src: ./windowsill-herbs-kit/watering-log.md
    note: 前四周的浇水量和土况
  - src: ./windowsill-herbs-kit/sill-planner.html
    title: 窗台排盆
    note: 拖动滑块，看一条窗台放几只盆合适
  - src: ./windowsill-herbs-kit/seed-guide.pdf
    title: 播种指南
    note: 从准备盆土到第一次采摘，一页纸
```

## 放在对象存储里的大文件

原图这类大文件不进仓库，放到对象存储，`src` 写完整地址。这样的文件只能下载或在新标签页打开。

```garden file
src: https://upload.wikimedia.org/wikipedia/commons/9/90/Basil-Basilico-Ocimum_basilicum-albahaca.jpg
title: 罗勒原图
note: Castielli 摄，来自 Wikimedia Commons，CC BY-SA 3.0
```
