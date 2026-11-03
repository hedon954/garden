# 配方：说明图（garden compose）

**读者卡在哪：** 一条流程被拍成一张图。读者想点某一步，只看这一步的说明。

**什么时候用：** 两三步到八步，每步一张卡片，步骤之间用箭头，点一步展开对应注释。也可以并排几张卡片，窄屏会收成一列。

**什么时候不用：** 读者要拖参数（`garden interactive`）、要一张真图或 Mermaid、或正文列表已经说清。不要写 `garden figure`。

**围栏：** 类型始终是 `garden compose`。作者原话放进 `intent`，一个字不改。不要改成别的组件。

**零件（只能这些）：** `stack`、`row`、`card`、`title`、`text`、`steps`、`compare`、`callout`、`divider`、`badge`、`kpi`、`arrow`、`fan`、`join`、`lanes`、`notes`。

- `stack` / `row` / `card` / `text` 可以写 `align: center`。居中的 `stack` 里，脚注要靠左就给那句 `text` 写 `align: start`。
- `card.frame` 是 `card`（默认边框）、`band`（通栏浅底，用来强调中间一层）、`text`（无框）或 `pill`（小胶囊）。`band` 和 `text` 标题下的一句是灰色说明。
- `fan: 3` 是并排向下的箭头，下一行 `row` 的格数要相同。`join: 一句说明` 是 V 形连接，字写在缺口里。`lanes` 是泳道：`actors` 加 `messages`（`from` / `to` 从 1 起，`tone: forward | back`）。
- 两列两行写成两个 `row`，每个两格。不要为某一张图单独改样式。
- 窄屏会收成一列。不要写色值、HTML、SVG、脚本、class 或宽度。

- 说明图优先写顶层 `steps` + `notes`。`notes[].for` 对上 `steps[].id`。
- 要嵌套时写 `tree:`。每一项一个零件：`card:`、`stack:`、`row:`、`arrow: down|right`、`notes:`。
- `tone` 只有 `plain`、`accent`、`muted`。`callout` 的 tone 是 `note`、`tip`、`warn`。
- 颜色只通过 tone。不要写色值、HTML、SVG、脚本、class 或宽度。
- 徽章和指标可以写在卡片字段 `badge` / `kpi` 上，也可以作为子零件嵌进 `card.children`。
- 手机上会强制成一列。不要自己排死列宽。
- 正文是可选的 DOM 文字，阅读页不调用模型。

**骨架：**

````md
```garden compose
title: 站点发布流水线
caption: 三步串起来，点哪步看哪步
intent: |
  （作者原话，一字不改）
steps:
  - id: sync
    title: sync
    text: 同步内容与配置
  - id: build
    title: build
    text: 生成静态 HTML
  - id: validate
    title: validate
    text: 检查后再上线
notes:
  - for: sync
    text: 先对齐远程与本地材料
  - for: build
    text: 构建期把 compose 渲进正文
  - for: validate
    text: 钩子拦住未编译的想法块
```
````

嵌套时换成 `tree:`，例如 `row` 里放 `card`、`arrow: right`、再一张 `card`，下面接 `notes:`。`id` 用字母开头。
