# Intelligent UI 对照

2026-10-11。左边是 ChatGPT 网页版会话「撰写二手电商业务分析」里的原件，右边是 Garden 按同一套计算样式画出来的同一块。两边裁图像素尺寸相同。

ChatGPT 带边框的 `box`：宽按内容列 **768px**（并排时 **378px**），圆角 **8px**，边框 **1px / rgba(0,0,0,0.1)**，内边距 **12px**，行距 **4px**，底色透明。大数字 **24px / 32px / 600**，颜色 **#0d0d0d**。眉题 **12px / 16px / 500 / #5d5d5d**。说明 **14px / 18.2px / #5d5d5d**。来源胶囊 **74×20**（Xinhua Net），字 **9px / #5d5d5d**，底 **#f3f3f3**，图标 **12px**。中文按页面语言 `en-US` 走系统界面字体，和 ChatGPT 同一行折行。

本地对照页：`http://localhost:5199/ui-parity`。

## 增长数字

盒子 **768×154**。五行：眉题、`+49%`、600 字重的副标题、统计期、来源。

ChatGPT：

![ChatGPT +49%](ui-parity/chatgpt/stat.png)

Garden：

![Garden +49%](ui-parity/garden/stat.png)

## 窄卡片

盒子 **378×138**。第三行「商品条目」是 **12px / 16px / 400 / #5d5d5d**。说明在「条」后换行，「目。」和来源胶囊在第二行，胶囊左缘距说明框 **27px**、顶缘 **17px**。

ChatGPT：

![ChatGPT 20 亿+](ui-parity/chatgpt/card.png)

Garden：

![Garden 20 亿+](ui-parity/garden/card.png)

## 来源

胶囊 **74×20**，内边距 **4px 6px 4px 4px**，字距正常。

ChatGPT：

![ChatGPT 来源](ui-parity/chatgpt/cite.png)

Garden：

![Garden 来源](ui-parity/garden/cite.png)

## 圆环

图区 **742×400**。外半径 **137.28**，内半径 **70.4**，圆心 **(371, 181)**。颜色 `#539af8`、`#6bc67f`、`#ef8b57`。图例在图区底部，说明在图下 **12px / 16px / #8f8f8f**，上边距 **16px**。整块 **742×432**。

ChatGPT：

![ChatGPT 圆环](ui-parity/chatgpt/pie.png)

Garden：

![Garden 圆环](ui-parity/garden/pie.png)

## 表格

表 **768×147**。表头 **14px / 20px / 600**，单元格 **14px / 20px / 400**，内边距 **8px 8px 8px 0**。行间 **1px / rgba(0,0,0,0.05)**，末行无底边。三列宽 **265.9 / 278.5 / 223.6**。

ChatGPT：

![ChatGPT 表格](ui-parity/chatgpt/table.png)

Garden：

![Garden 表格](ui-parity/garden/table.png)

## 流程

盒子 **768×250**，内容居中，间距 **8px**，字 **16px / 26px / 400**。箭头是 **16×16** 图标，向下为 **#8f8f8f**，循环为 **#5d5d5d**。

ChatGPT：

![ChatGPT 流程](ui-parity/chatgpt/flow.png)

Garden：

![Garden 流程](ui-parity/garden/flow.png)

## 滑杆、曲线、步进、格子、代码、图

这六块用的是阅读页同一套组件（`UiFigure`），不是手写的对照 DOM。宽度都是 **768px**。ChatGPT 原件这边没有新的会话裁图；对照依据是 [组件规格](./intelligent-ui-components.md) 里已经量过的尺寸。下面每块先写那份规格，再放 Garden 画出来的结果。

### 滑杆

轨道高 **24px**、全圆角，浅色 `#0d0d0d1f`。圆钮 **18×18**、内缩 **3px**，浅色 `#333`。不画已经滑过的部分。点击区域高 **38px**。焦点框在轨道外，外扩 **3px**。

Garden，**768×137**：

![Garden 滑杆](ui-parity/garden/slider.png)

### 曲线

图放在内嵌底上，浅色 `#f4f4f4`。默认折线 `#0285ff`、**2px**。x 轴线用边框色 `#0000001a`，不是透明。当前值处是空心点，旁边标出 y。

Garden，**768×283**：

![Garden 曲线](ui-parity/garden/chart.png)

### 步进

标题 **16px / 600**，右侧「1 / 3」为 **12px** 次要文字色。进度条高 **3px**，长度是已走到的步数占比。上一步、下一步是 **36px** 圆按钮，圆点 **8px**。

Garden，**768×184**：

![Garden 步进](ui-parity/garden/steps.png)

### 格子

格子圆角 **8px**，最小 **40×36**，格距 **4px**，字 **12px** 等宽。`same` 用紫色浅底。图例在下方。

Garden，**768×215**：

![Garden 格子](ui-parity/garden/grid.png)

### 代码走查

面板圆角 **12px**，浅色底 `#f9f9f9`，字 **13px** 等宽、行高 **1.6**。高亮行铺 `#0285ff1a`，左侧 **2px** `#0285ff`。

Garden，**768×141**：

![Garden 代码](ui-parity/garden/code.png)

### Mermaid 高亮

节点白底、`#ddd` 描边。高亮节点改为 `#0285ff` 描边和文字，底色 `#0285ff1a`。

Garden，**768×148**：

![Garden 状态图](ui-parity/garden/diagram.png)

### 画布

地图、三维和目录里没有的动画不另开组件，写进 `<Sandbox>`。iframe 只有 `allow-scripts`，不带 `allow-same-origin`，也不能加载远程资源。主题变量是 `--viz-*`。公开博客不实现 `issuePrompt`。

Garden，**768×136**：

![Garden 画布](ui-parity/garden/sandbox.png)
