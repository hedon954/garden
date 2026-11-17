---
title: 文件内嵌
navTitle: 文件内嵌
description: 详解 HTML 隔离沙箱预览、PDF 与多文件下载预览卡、以及 Excalidraw 源文件自动导出透明底可选中文字 SVG 的写法、双端真实渲染与在线演练场。
section: components
order: 34
---

## 是什么

文件内嵌组件用于在文章中直接交付和展示结构化附件与手绘架构源文件，核心涵盖三类高频载体：
1. **HTML 交互小页面**（通过 `garden compose` 的 `<file>` 嵌入，支持在右侧隔离沙箱抽屉中直接运行体验，也可一键下载）；
2. **PDF 文档、Markdown 资料与压缩包**（单文件 `<file>` 或多文件组 `<files>`，自动计算真实文件体积，支持页内抽屉阅读 PDF / Markdown）；
3. **Excalidraw 手绘架构图源文件**（直接用 Markdown 图片语法引用 `.excalidraw` 文件，构建期自动导出为透明底、可选中复制文字的原生内联 SVG）。

## 有什么用

- **不离开当前阅读上下文**：读者遇到配套的一页式 PDF 速查表、独立 HTML 演示工具或补充记录表时，点一下卡片上的 **「预览」**，文件直接从页面右侧滑出抽屉（手机端自动铺满全屏），读完按 `Esc` 即回到刚才读到的段落。
- **彻底告别 Excalidraw 手工导图痛点**：以前画完 `.excalidraw` 还要手动导出 PNG/SVG、改图时容易漏更新导出件；现在仓库里只维护 `.excalidraw` 源文件，构建时自动生成去底色扁平 SVG 内联进页面，高分屏无限缩放不糊，图内文字还能直接框选搜索。

---

## 形态一：HTML 文件内嵌（隔离沙箱抽屉运行）

### 怎么写

把独立 `.html` 文件放在文章同名资源目录中，在 `garden compose` 围栏内使用 `<file>` 标签（不想要外层画框时包一层 `<figure frame="none">`）：

````markdown
```garden compose
<figure frame="none">
  <file src="./my-post/sill-planner.html" title="窗台排盆间距小工具" note="点击右侧「预览」可在隔离沙箱抽屉中直接拖动滑块试算" />
</figure>
```
````

- 预览抽屉中的 `<iframe>` 运行在严格无同源权限（不带 `allow-same-origin`）的沙箱中，既能流畅执行页面自带的交互脚本，又无法读取主站 Cookie 或存储；
- **Web 端 vs 移动端形态**：Web 端单文件卡在一行内右对齐排列「预览」与黑底「下载」主按钮；移动端（`375px`）自动将操作区折入第二行并放大为 `40px+` 舒适触控热区。

### 实际长什么样（点击卡片上的「预览」可直接打开右侧交互抽屉）

<div data-doc-showcase="HTML 文件内嵌真实渲染（可直接点击「预览」运行 HTML 小工具）">

```garden compose
<figure frame="none">
  <file src="../assets/samples/sill-planner.html" title="窗台排盆间距小工具" note="点击右侧「预览」可在隔离沙箱抽屉中直接拖动滑块试算" />
</figure>
```

</div>

---

## 形态二：PDF 文档与 `<files>` 多文件组合

### 怎么写

- **单个 PDF 文件**：使用 `<file src="./my-post/seed-guide.pdf" title="..." note="..." />`，引擎在构建期自动读取文件大小并格式化为 `PDF · 15.9 KB`，点击「预览」直接调用浏览器原生 PDF 阅读器在抽屉内打开。
- **一组关联资料（`<files>`）**：当一篇文章同时附带 PDF 指南、Markdown 核对表、HTML 工具与 ZIP 压缩包（或远程 OSS 大文件 `https://...`）时，用 `<files title="...">` 归为一张紧凑分组卡片：

````markdown
```garden compose
<figure frame="none">
  <file src="./my-post/seed-guide.pdf" title="一页式播种与养护速查表" note="单文件形态：突出主下载按钮并保留页内 PDF 预览" />
</figure>

```

```garden compose
<figure frame="none">
  <files title="配套工程资料包（分组形态）">
    <file src="./my-post/seed-guide.pdf" title="播种状态机速查 (PDF)" note="支持页内抽屉直接翻阅" />
    <file src="./my-post/checklist.md" title="前四周巡检记录表 (Markdown)" note="构建期预渲染为按需加载的预览页" />
    <file src="./my-post/starter-kit.zip" title="完整离线资料包 (ZIP)" note="压缩归档文件仅提供一键下载" />
  </files>
</figure>
```
````

- 注意分组形态（`<files>`）在 **移动端（`375px`）** 下的专门优化：每行右侧自动收起按钮文字标签，化为紧凑的眼睛预览图标与下载箭头图标，避免多行文件列表在手机上显得臃肿。

### 实际长什么样（点击 PDF 或 Markdown 行的「预览」可直接打开抽屉阅读）

<div data-doc-showcase="PDF 单文件与多文件组合真实渲染（对比桌面文字按钮与移动端紧凑图标按钮）">

```garden compose
<figure frame="none">
  <file src="../assets/samples/seed-guide.pdf" title="一页式播种与养护速查表" note="单文件形态：自动显示 PDF 体积，支持抽屉内直接阅读" />
</figure>
```

```garden compose
<figure frame="none">
  <files title="配套工程资料包（分组形态）">
    <file src="../assets/samples/seed-guide.pdf" title="播种状态机速查 (PDF)" note="支持页内抽屉直接翻阅" />
    <file src="../assets/samples/checklist.md" title="前四周巡检记录表 (Markdown)" note="点击预览按需加载渲染后的文档" />
    <file src="../assets/samples/starter-kit.zip" title="完整离线资料包 (ZIP)" note="压缩归档文件直接下载" />
  </files>
</figure>
```

</div>

---

## 形态三：Excalidraw 源文件矢量内嵌

### 怎么写

把 `.excalidraw` 源文件直接放在文章同名资源目录里，使用**最普通的 Markdown 图片语法**引用（不要包进代码块围栏）：

```markdown
![Garden 从 Markdown 源稿、garden sync 编译到 GitHub Pages 静态发布的三阶段手绘架构图](../assets/samples/architecture.excalidraw)
```

- 执行 `make dev`、`garden sync` 或 `garden build` 时，引擎自动检测 `.excalidraw` 文件指纹并调用 `excalidraw-image` 导出透明背景、内嵌手写字体的扁平 SVG 直接写入 HTML；
- 你可以直接用鼠标在下方渲染出的手绘图上**框选复制「`garden sync`」「`纯静态阅读站点`」等文字**。

### 实际长什么样（真实内联矢量 SVG，图中文字可直接鼠标选中）

<div data-doc-showcase="Excalidraw 源文件构建期内联 SVG 真实渲染（试着用鼠标直接框选图中的中文与代码文字）">

![Garden 从 Markdown 源稿、garden sync 编译到 GitHub Pages 静态发布的三阶段手绘架构图](../assets/samples/architecture.excalidraw)

</div>

---

## 在线演练场：编辑文件卡片属性与 Excalidraw 图注

在下方左侧选择 **HTML 单文件**、**PDF 与多文件分组** 或 **Excalidraw 内联图**，修改 `title`、`note`、增删 `<file>` 条目（甚至加入一条 `https://example.com/archive.zip` 远程文件观察外链图标），点击 **「更新渲染」** 后依然可以直接点击右侧生成的「预览」按钮打开真实抽屉：

```doc-playground
{
  "title": "文件内嵌与 Excalidraw 交互演练场",
  "description": "修改文件卡片标题、说明文字或增删文件行，点击「更新渲染」，并在右侧点击「预览」测试抽屉效果。",
  "presets": [
    {
      "id": "html-single",
      "label": "HTML 沙箱文件卡",
      "code": "```garden compose\n<figure frame=\"none\">\n  <file src=\"./samples/sill-planner.html\" title=\"窗台排盆间距计算器（试着改这个标题）\" note=\"点击右侧预览按钮，在隔离沙箱抽屉里直接拖动滑块\" />\n</figure>\n```"
    },
    {
      "id": "pdf-group",
      "label": "PDF 与多文件组",
      "code": "```garden compose\n<figure frame=\"none\">\n  <files title=\"自定义附件清单\">\n    <file src=\"./samples/seed-guide.pdf\" title=\"架构一页纸速查 (PDF)\" note=\"支持右侧抽屉直接阅读 PDF\" />\n    <file src=\"./samples/checklist.md\" title=\"上线前核对清单 (MD)\" note=\"按需拉取渲染后的 Markdown 预览\" />\n    <file src=\"https://example.com/release-trace.zip\" title=\"远程对象存储归档示例\" note=\"填写 https:// 地址时自动显示外链打开与下载按钮\" />\n  </files>\n</figure>\n```"
    },
    {
      "id": "excalidraw-inline",
      "label": "Excalidraw 矢量图",
      "code": "![试着修改这段 Excalidraw 图注，点击更新渲染查看矢量内联效果](./samples/architecture.excalidraw)"
    }
  ]
}
```
