---
title: 内容、布局与交互（compose）
navTitle: Compose
description: 在同一个作者入口组合文章内容、布局、资源与交互。
section: components
order: 36
badge: compose
---

`garden compose` 是唯一的 Garden 作者入口。在围栏内组合 Markdown、安全 HTML 内容岛、布局、资源、文件、关系图、选择卡与 Play 交互。具体能力、内容边界和默认样式见[组件参考](/garden/reference/compose)，完整可用属性以 `npx garden ui schema` 为准。

需要 AI 生成结构图时，输入 `/garden` 选「compose（想法）」。文章里会插入一个 `garden compose` 围栏。你在里面用白话写清结构，再对 AI 说「编译这篇」，AI 就会把这句话留在 `<intent>` 里，并用 Markdown 叶子和组件标签拼出静态说明图。

## 怎么写

先说明读者应当看见的关系和层级，再选择布局与必要样式。也可以直接写组件；不要把通用 HTML/CSS 当成所有组件的属性契约。

把四件事写清楚：

- **分几块**：是三列并排、从上到下五层，还是上下两行。
- **每块叫什么**：用图上要摆出来的短词。解释放在名字下面那一行，别把一整句话当标题。
- **谁连谁**：谁先到谁、从一处散开，还是几处收到一起。没有先后顺序，就直接写「这几块没有先后」。
- **哪块是重点**：直接点名，比如「中间那列是重点」「下面一行才是重点」。

先说明视觉关系与重点，再使用受支持的属性表达必要样式。默认样式不保证复刻参考图，必须检查真实排版。

静态 Compose 最外层场景默认背景透明，边框、圆角与内边距仍保留。无底色不等于无外框；需要去掉整个场景外框时，使用唯一最外层 `<figure frame="none">…</figure>`。内部容器显式指定的背景、tone 与节点填色不受影响；全屏或弹层的背景由宿主单独处理。

**完整标签与属性**见 [组件参考 · compose](/garden/reference/compose)；**全部图标名**见 [compose 图标](/garden/reference/compose-icons)。

## 写法对照

写围栏时，最常见的失误有两个：一是只写一个主题词，没给结构；二是把精力花在规定颜色、圆角和字重上。下面按五种常见结构，列出改写后的写法。

**三列并排，中间接起来**

````markdown
```garden compose
三列：User 下面是 Alice、Bob；Role 下面是管理员、审核员；
Permission 下面是 orders:read、orders:approve。
Role 在中间，把用户和权限接起来。Role 是重点。
```
````

**先到一处，再散开**

````markdown
```garden compose
用户浏览器先到身份提供方，再同时连到 HR、Finance、Project 三个系统。
三个系统都信任同一个身份提供方。身份提供方是重点。
```
````

**自上而下分层**

````markdown
```garden compose
从上到下五层：浏览器、身份服务、BFF、业务服务、授权决策。
身份服务和授权决策是重点，其余是经过的路径。
不是每次请求都按这个顺序走完。
```
````

**一件事的多个切面**

````markdown
```garden compose
用户发起请求后，先看四件事：认证（你是谁）、凭证（怎么证明）、
授权（有没有权）、验证（数据合不合法）。
落到业务和存储时，再看传输和保密。这六块没有严格的先后。
```
````

**上下两行对比**

````markdown
```garden compose
上面一行是常规交付：理解需求 → 设计方案 → 开发上线。
下面一行是探索循环：提出假设 → 低成本验证 → 迭代或放弃。
上面是背景，下面一行才是重点。
```
````

## 图标与表面

状态符号用 `<icon name="check-circle"/>` 一类具名图标，不要塞 emoji。小格子、浅底、圆角用 `padding`、`background`、`radius` 组合，不要为单张图发明专用标签。

## 一张示例

下面只留一张图；更多对照见仓库示例文，标签全表见参考页。

```garden compose
<intent>
三列：User 下面是 Alice 和 Bob，Role 下面是管理员和审核员，Permission 下面是 orders:read 和 orders:approve。Role 在中间，把用户和权限接起来。Role 是要先看见的一层。
</intent>
<row align="center">
  <stack align="center">
    <title>User</title>
    <text>Alice</text>
    <text>Bob</text>
  </stack>
  <band tone="accent" align="center">
    <title>Role</title>
    <text>管理员</text>
    <text>审核员</text>
  </band>
  <stack align="center">
    <title>Permission</title>
    <text>orders:read</text>
    <text>orders:approve</text>
  </stack>
</row>
<join>角色连接用户和权限</join>
<text tone="muted" align="center">概念关系：User ↔ Role ↔ Permission</text>
```

## 可调参数（play）

静态说明图还差一步、读者要拧参数时，仍写 `garden compose`：

- `{@body const [n, setN] = DIL.useState(3)}` 声明状态
- `{@body const total = n * 24}` 派生值
- `{total}` / `value={n}` 插值
- `{#if …}{:else}{/if}`、`{#each … as item, i}{/each}` 控制流
- 小写控件：`<slider>`、`<choice>`、`<button>`、`<pie>` / `<chart>`、`<stat>`

作者标签使用小写目录；`@body` 声明状态，不写内部组件 IR。完整语法见仓库 `docs/compose-dil.md`。

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

Play 图表：`palette`（series|categorical）、`yStep`、`overflow`（expand|clip）；块头可选 `frame: none`。布局头栏用 `<stack direction="row" justify="between">`。

图例：`legend`（auto|show|hide）、`legendPosition`（top|bottom）。

## 图表示例（play）

下面两例是官方 compose 图表样板：静态八柱（系列蓝 + `yStep`）与可调权重五类柱（`palette="categorical"` + 底图例）。示意数据。

### 静态：活跃时段分布

```garden compose #compose-chart-active-hours
caption: 示意：最近 30 天活跃记录归一化后的分布。峰在 20:00。
frame: none
intent: |
  静态分布：系列蓝柱、显式 8% 刻度、stack 头栏左标题右徽章。
---
{@body const rows = [
  { h: "08:00", p: 0.05 },
  { h: "10:00", p: 0.07 },
  { h: "12:00", p: 0.15 },
  { h: "14:00", p: 0.06 },
  { h: "16:00", p: 0.09 },
  { h: "18:00", p: 0.14 },
  { h: "20:00", p: 0.28 },
  { h: "22:00", p: 0.16 }
]}

<stack direction="row" justify="between" align="center" gap={2}>
  <stack gap={1}>
    <caption>用户活跃时间分布（示例）</caption>
    <caption>假设用户最近 30 天的活跃记录经过归一化后的分布</caption>
  </stack>
  <badge tone="new">推荐 20:00</badge>
</stack>

<chart data={rows} x={h} yLabel="活跃概率" yFormat="percent" yMin={0} yMax={0.32} yStep={0.08} overflow="expand" height={280}>
  <bar y={p} label="活跃概率" tone="accent" />
</chart>
```

### 交互：个人与整体融合权重

默认权重 **45%**。拧滑杆或快切 0 / 45 / 100，五根分类色柱与「预测最佳时间」跟着变。

```garden compose #compose-chart-fusion-weights
caption: 交互示例：拧个人权重，融合柱按公式重算。示意数据。
frame: none
intent: |
  融合滑杆：categorical 逐柱色、legend 底栏单系列、overflow expand。
---
{@body const [w, setW] = DIL.useState(45)}
{@body const a = w / 100}
{@body const p08 = a * 0.05 + (1 - a) * 0.12}
{@body const p12 = a * 0.12 + (1 - a) * 0.22}
{@body const p18 = a * 0.20 + (1 - a) * 0.26}
{@body const p20 = a * 0.45 + (1 - a) * 0.28}
{@body const p22 = a * 0.18 + (1 - a) * 0.12}
{@body const rows = [{ h: "08:00", p: p08 }, { h: "12:00", p: p12 }, { h: "18:00", p: p18 }, { h: "20:00", p: p20 }, { h: "22:00", p: p22 }]}
{@body const peak = max(p08, p12, p18, p20, p22)}
{@body const best = p20 == peak ? "20:00" : (p18 == peak ? "18:00" : (p12 == peak ? "12:00" : (p22 == peak ? "22:00" : "08:00")))}

<choice value={w} onChange={setW} label="权重快切" options={[{value:0,label:"0%"},{value:45,label:"45%"},{value:100,label:"100%"}]} />
<slider min={0} max={100} value={w} onChange={setW} label="个人活跃数据权重" unit="%" />
<chart legend="show" legendPosition="bottom" data={rows} x={h} palette="categorical" yLabel="融合后活跃概率" yFormat="percent" yMin={0} yMax={0.4} overflow="expand" height={280}>
  <bar y={p} label="融合后活跃概率" tone="accent" />
</chart>
<stat label="预测最佳时间" value={best} />
```


## 自定义文字与背景颜色

`color` 设置文字颜色（子内容继承，可在子级覆盖）；`backgroundColor` 设置当前容器背景（不继承）。支持 CSS 命名色、`transparent`、`currentColor`、#RGB/#RGBA/#RRGGBB/#RRGGBBAA、rgb()/rgba()/hsl()/hsla()（含 alpha）；不接受 url()、var()、calc()、任意 CSS 声明或 style。未指定时保留原 tone / 主题配色。背景可用透明度，不改变字体家族。

静态：box/card、row/stack/columns/grid/grid-item、pill/band、group/field/header/footer/figure、title/text/caption/label/prose/badge、kpi/stat、list、table/tr/th/td/thead/tbody。Play：stack/columns/card/caption/badge/stat/table；两项颜色必须写字面量。静态的 `background` 仍是已有语义 token。图表的 palette/tone API 不变，不能把 color 当系列颜色。显式颜色不会自动切换深色主题，作者需检查对比度。

