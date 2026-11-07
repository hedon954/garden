# 配方：说明图与可调参数（garden compose）

**读者卡在哪：** 一条结构被画成一张图；或读者要拧参数看结论怎么变。

**什么时候用：** 几列名单、从一个点散开、从上到下的几层、一次事情的几面、上面一行顺序下面一行才是重点；或默认状态就要能看出结论、拖一下才多懂一点。

**什么时候不用：** 普通正文列表或 Mermaid 已经说清；一次乘法留在正文。图标长文用 Compose 的 icon-list/entry 或 row + 共享右侧 stack；关系图用 relations；画布动画用同一 Compose 中的 sandbox。

**围栏：** 类型始终是 `garden compose`。作者原话放进 `<intent>`，一个字不改。不要改成别的组件。正文还是一句白话时，不要发明 YAML 槽。

**模型写的是 DIL，不是槽：** 叶子是 Markdown（`#` 标题、段落、`**强调**`、列表）。结构是 **小写目录标签** + **设计 token 属性**。Markdown 和标签编进同一棵树。完整标签 / token / 图标名见上方「compose 目录」——不要用手抄短名单替代。

## 静态 diagram

- 布局：`box` / `card` / `row` / `stack` / `columns` / `grid` / `pill` / `band` / `steps` / `lanes` / `compare` / `callout`…
- 文字：`title` / `text` / `caption` / `badge` / `note` / `actor` / `join`…
- 空标签：`arrow` / `fan` / `divider` / `kpi` / `icon`…
- token：`padding`/`gap` 0–4；`background` surface…；`radius`；`border`；`size`；`tone`（`plain`/`accent`/`tip`/`muted`；callout 另有 `note`/`warn`；lanes message 另有 `forward`/`back`）；`align`；`justify`；`wrap`
- 芯片内部间距用 `gap={0}` / `gap={1}`；章节堆叠用 `gap={2}` / `gap={3}` 及以上
- 日横幅等宽：`row` 里每个 day 芯片 `flex:1`（`nowrap` + `size="sm"`）
- tip 钉右边：`justify="between"`，tip/`caption` 侧 `flex:0`
- phrasing 叶子（title/text/caption/badge/…）保留单独的前导 `*`（脚注标记）
- `<icon name="shield"/>` 等：名字必须在 Lucide 目录里
- `<arrow dir="down"/>` 或 `dir="right"`。`<fan n="3"/>` 下面的 `<row>` 要有同样格数。`<join>一句说明</join>` 是收到一处
- `<lanes>` 里写 `<actor>` 和 `<message from="1" to="2" tone="forward">`
- `<steps>` 里每步一个 `<step id="sync">`，要点开的说明写 `<note>`
- `<compare>` 里 2 到 4 个 `<item>`。`<callout tone="tip">` 的 tone 是 `note`、`tip`、`warn`
- 普通行内 Markdown 与安全 `<u>` 可用于文字叶子。块级 Markdown/HTML 写在 `<markdown>…</markdown>` / `<html>…</html>` 内容岛，可嵌入布局并与 Play 控件共存；允许本地排版的白名单 inline CSS，不执行脚本、事件、iframe 或资源 CSS 函数。未知/不安全内容明确报错，不是任意 HTML 执行环境。Compose 标签的自定义颜色仍使用 color / backgroundColor（含 transparent）。默认继承文章字体与字号；确需强调时使用受支持 size，不缩字塞图。

**骨架（静态）：**

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

## play（可调参数）

仍写 `garden compose`。可用：

- `{@body const [n, setN] = DIL.useState(3)}` 声明状态
- `{@body const total = n * 24}` 派生值
- `{total}` / `value={n}` 插值
- `{#if …}{:else}{/if}`、`{#each … as item, i}{/each}` 控制流
- 小写控件：`<slider>`、`<choice>`、`<button>`、`<stat>`、`<pie>` / `<chart>`…

作者输入只用目录中的小写标签。HTML/Markdown 内容用 markdown/html 岛；可执行动画用 sandbox。

**骨架（play）：**

````md
```garden compose #compose-play-demo
caption: 拧一下席位，看月费。
intent: |
  让读者调席位，看月费怎么变。
---
{@body const [seats, setSeats] = DIL.useState(3)}
{@body const total = seats * 24}
<slider min={1} max={12} value={seats} onChange={setSeats} label="席位" />
<stat label="月费" value={total} unit="USD" />
```
````

Play 图表：`palette`（series|categorical）、`yStep`、`overflow`（expand|clip）；块头可选 `frame: none`。布局头栏用 `<stack direction="row" justify="between">`。

图例：`legend`（auto|show|hide）、`legendPosition`（top|bottom）。
