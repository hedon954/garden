# 配方：说明图（garden compose）

**读者卡在哪：** 一条结构被画成一张图。读者要看见谁和谁有关、哪一块是重点。

**什么时候用：** 几列名单、从一个点散开、从上到下的几层、一次事情的几面、或上面一行顺序、下面一行才是重点。

**什么时候不用：** 读者要拖参数（`garden interactive`）、要一张真图或 Mermaid、或正文列表已经说清。

**围栏：** 类型始终是 `garden compose`。作者原话放进 `<intent>`，一个字不改。不要改成别的组件。正文还是一句白话时，不要发明 YAML 槽。

**模型写的是标记，不是槽：** 叶子是 Markdown（`#` 标题、段落、`**强调**`、列表）。结构是标签。Markdown 和标签编进同一棵树。

**目录里的标签：** `box`、`row`、`stack`、`grid`、`title`、`text`、`badge`、`pill`、`band`、`arrow`、`fan`、`join`、`lanes`、`divider`、`steps`、`step`、`note`、`compare`、`callout`、`kpi`。

- `<box frame="band" tone="accent">` 是要先看见的一层。`frame` 还有 `card`、`text`、`pill`。`tone` 只有 `plain`、`accent`、`tip`、`muted`。
- `<arrow dir="down"/>` 或 `dir="right"`。`<fan n="3"/>` 下面的 `<row>` 要有同样格数。`<join>一句说明</join>` 是收到一处。
- `<lanes>` 里写 `<actor>` 和 `<message from="1" to="2" tone="forward">`。`tone` 是 `forward` 或 `back`。
- `<steps>` 里每步一个 `<step id="sync">`，要点开的说明写 `<note>`（这些 note 收成 notes）。
- `<compare>` 里 2 到 4 个 `<item>`。`<callout tone="tip">` 的 tone 是 `note`、`tip`、`warn`。
- 不要写色值、HTML、SVG、脚本，也不要写 `{@body}`、`{#if}` 或 `{表达式}`。颜色走主题变量。窄屏会收成一列。

**骨架：**

````md
```garden compose
<intent>
用三张卡加向下箭头讲清 sync → build → validate；读者点每一步，下面展开对应说明。
</intent>
<steps>
  <step id="sync">
    <badge>1</badge>
    <title>sync</title>
    <text>同步内容与配置</text>
    <note>先对齐远程与本地材料</note>
  </step>
</steps>
```
````

并排时用 `<row>` 包 `<box>`、`<arrow dir="right"/>`、再一个 `<box>`。`id` 用字母开头。
