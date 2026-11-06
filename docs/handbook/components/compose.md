---
title: 说明图（compose）
navTitle: 说明图
description: 在文章里写几句白话，让 AI 拼出静态说明图。
section: components
order: 36
badge: compose
---

写文章想画一张结构图时，输入 `/garden` 选「compose（想法）」。文章里会插入一个 `garden compose` 围栏。你在里面用白话写清结构，再对 AI 说「编译这篇」，AI 就会把这句话留在 `<intent>` 里，并用 Markdown 叶子和组件标签拼出静态说明图。

## 怎么写

围栏里只写你想让读者看见的结构，不要写样式。

把四件事写清楚：

- **分几块**：是三列并排、从上到下五层，还是上下两行。
- **每块叫什么**：用图上要摆出来的短词。解释放在名字下面那一行，别把一整句话当标题。
- **谁连谁**：谁先到谁、从一处散开，还是几处收到一起。没有先后顺序，就直接写「这几块没有先后」。
- **哪块是重点**：直接点名，比如「中间那列是重点」「下面一行才是重点」。

不要写颜色、圆角、灰胶囊、字重、间距、阴影、要不要撑满。外观由组件默认样式决定，写了反而乱。

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

旧的 `garden interactive` 与 PascalCase 仅作兼容。完整映射见仓库 `docs/compose-dil.md`。

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
