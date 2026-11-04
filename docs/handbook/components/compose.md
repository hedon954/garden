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

不要写颜色、圆角、灰胶囊、字重、间距、阴影、要不要撑满。外观由组件默认样式决定，写了反而乱。全部标签见 [组件参考 · compose](/garden/reference/compose)。

## 最佳实践

写围栏时，最常见的失误有两个：一是只写一个主题词，没给结构；二是把精力花在规定颜色、圆角和字重上。下面按五种常见结构，列出改写前后的写法。

**三列并排，中间接起来**

只写「画一张权限图」，AI 不知道分几列、每列放什么；写成「三列等宽，中间用浅灰圆角，字重轻一点」，又全在规定外观。

把三列的名字、每列底下的条目和中间的连接写出来：

````markdown
```garden compose
三列：User 下面是 Alice、Bob；Role 下面是管理员、审核员；
Permission 下面是 orders:read、orders:approve。
Role 在中间，把用户和权限接起来。Role 是重点。
```
````

**先到一处，再散开**

不要写「画个单点登录，箭头好看一点，间距均匀」。把谁先连向哪里、再同时分给哪几个系统写清楚：

````markdown
```garden compose
用户浏览器先到身份提供方，再同时连到 HR、Finance、Project 三个系统。
三个系统都信任同一个身份提供方。身份提供方是重点。
```
````

**自上而下分层**

不要写「五张通栏卡片，第二张和第五张上色，箭头画细」。直接列出五层的名字、哪两层需要突出，以及是不是每次请求都按顺序走完：

````markdown
```garden compose
从上到下五层：浏览器、身份服务、BFF、业务服务、授权决策。
身份服务和授权决策是重点，其余是经过的路径。
不是每次请求都按这个顺序走完。
```
````

**一件事的多个切面**

不要写「两行两列加下面两张卡片，标题不要加粗」。把六个切面的短名、每块要回答的问题，以及「没有先后顺序」交代清楚：

````markdown
```garden compose
用户发起请求后，先看四件事：认证（你是谁）、凭证（怎么证明）、
授权（有没有权）、验证（数据合不合法）。
落到业务和存储时，再看传输和保密。这六块没有严格的先后。
```
````

**上下两行对比**

不要写「上面无框，下面灰色胶囊，贴着内容，不要撑满」。直接写哪一行是常规背景、哪一行是真正要强调的循环：

````markdown
```garden compose
上面一行是常规交付：理解需求 → 设计方案 → 开发上线。
下面一行是探索循环：提出假设 → 低成本验证 → 迭代或放弃。
上面是背景，下面一行才是重点。
```
````

## 能力示例

**下面这些图只是示例**，用来展示 `compose` 能拼出哪几类常见结构。图里的权限、登录、API 等词只是为了把格子填满，写文章时换成你自己的主题即可。

### 三列中间接

左右两列靠中间一列连起来，底下用 `<join>` 收成一句话。

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

### 先汇再散

先流向中间那一层，再用 `<fan>` 同时分到下面几列。

```garden compose
<intent>
用户浏览器先到身份提供方。身份提供方再同时连到 HR、Finance、Project。三个系统信任同一个身份提供方。身份提供方是要先看见的一层。
</intent>
<stack align="center">
  <pill>用户浏览器</pill>
  <arrow dir="down"/>
  <band tone="accent" align="center">
    <title>Identity Provider（IdP）</title>
    <text>统一完成身份验证、维护登录状态、签发身份断言</text>
  </band>
  <fan n="3"/>
  <row align="center">
    <title>HR 系统</title>
    <title>Finance 系统</title>
    <title>Project 系统</title>
  </row>
  <text tone="muted" align="center">三个系统都信任同一个身份提供方</text>
</stack>
```

### 自上而下分层

几层按顺序往下走，重点层用 `<band>`，经过的层只留文字。

```garden compose
<intent>
从上到下五层：浏览器、身份服务、BFF、业务服务、授权决策。身份服务和授权决策是要强调的两层，其余是经过的路径。不是每次请求都按这个顺序走完。
</intent>
<stack align="center">
  <box frame="text" align="center">
    <badge>①</badge>
    <title>浏览器 / App</title>
    <text>Cookie、Session、OAuth Client</text>
  </box>
  <arrow dir="down"/>
  <band tone="accent" align="center">
    <badge>②</badge>
    <title>身份服务 IdP / IAM</title>
    <text>Passkey、MFA、OIDC、会话管理</text>
  </band>
  <arrow dir="down"/>
  <box frame="text" align="center">
    <badge>③</badge>
    <title>BFF / API Gateway</title>
    <text>会话验证、Token 校验、入口授权控制</text>
  </box>
  <arrow dir="down"/>
  <box frame="text" align="center">
    <badge>④</badge>
    <title>业务服务</title>
    <text>订单、支付、账户、资源对象</text>
  </box>
  <arrow dir="down"/>
  <band tone="tip" align="center">
    <badge>⑤</badge>
    <title>授权决策系统</title>
    <text>RBAC + ABAC + ReBAC + Policy Engine</text>
  </band>
  <text tone="muted" align="start">逻辑职责示意：并非所有请求都按此顺序经过各层。身份服务通常在登录阶段交互，业务服务则在请求执行时调用授权决策能力。</text>
</stack>
```

### 一件事的多个切面

没有严格先后的几块内容，用 `<row>` 和 `<box>` 分成上下两组并排摆开。

```garden compose
<intent>
用户要改订单地址。先分成认证、凭证、授权、验证，每块一个问题。然后再看传输和保密。这六块不是严格的先后步骤。
</intent>
<stack align="center">
  <title>用户发起 API 请求</title>
  <text tone="muted">例如：修改订单收货地址</text>
</stack>
<arrow dir="down"/>
<row>
  <box>
    <title>认证</title>
    <text>你是谁？</text>
    <text tone="muted">Authentication</text>
  </box>
  <box>
    <title>凭证</title>
    <text>如何证明你的身份？</text>
    <text tone="muted">Credential</text>
  </box>
</row>
<row>
  <box>
    <title>授权</title>
    <text>你有权修改这笔订单吗？</text>
    <text tone="muted">Authorization</text>
  </box>
  <box>
    <title>验证</title>
    <text>提交的数据是否合法？</text>
    <text tone="muted">Verification</text>
  </box>
</row>
<arrow dir="down"/>
<stack align="center">
  <title>业务操作与数据存储</title>
</stack>
<row>
  <box>
    <title>传输</title>
    <text>网络中能否被窃听、篡改、冒充？</text>
  </box>
  <box>
    <title>保密</title>
    <text>敏感数据泄露后能否被读取？</text>
  </box>
</row>
<text tone="muted">概念示意：六者并不是严格串行的执行阶段，传输保护贯穿网络通信，保密措施也可能覆盖客户端与服务端。</text>
```

### 外框套子项

大框里再摆一排徽章或两列要点，适合画「一层里面包含几条检查」。

```garden compose
<intent>
用户意图经过 Agent，再经过策略执行点，最后到工具执行器。策略点里是四条约束。策略点是要先看见的一层。
</intent>
<stack align="center">
  <title>User Intent + Authorization</title>
  <text tone="muted">明确任务目标、用户身份与授权范围</text>
  <arrow dir="down"/>
  <band align="center">
    <title>Agent / LLM</title>
    <text>负责理解、推理、规划和提出执行意图</text>
    <row align="center">
      <badge>Untrusted Context</badge>
      <badge>Memory</badge>
      <badge>Tool Results</badge>
    </row>
  </band>
  <arrow dir="down"/>
  <box align="center" mark="shield">
    <title>Policy Enforcement Point</title>
    <text tone="muted" align="center">独立于 LLM 的确定性执行控制</text>
    <row align="center">
      <text>权限与资源范围</text>
      <text>操作参数校验</text>
    </row>
    <row align="center">
      <text>任务意图约束</text>
      <text>高风险操作审批</text>
    </row>
  </box>
  <arrow dir="down"/>
  <title>Tool Executor</title>
  <text tone="muted">按最小权限执行、记录审计、支持中断</text>
</stack>
```

### 多角色来回交互

几个角色按先后发消息、退回结果时，用 `<lanes>` 画成泳道。

```garden compose
<intent>
用户、客户端、授权服务器三条泳道，六步授权码加 PKCE。
</intent>
<lanes>
  <actor>用户</actor>
  <actor>客户端</actor>
  <actor>授权服务器</actor>
  <message from="1" to="2" tone="forward">点击登录 / 授权</message>
  <message from="2" to="3" tone="forward">发起授权请求 + PKCE</message>
  <message from="3" to="1" tone="back">用户身份验证与授权</message>
  <message from="3" to="2" tone="back">重定向返回 Code</message>
  <message from="2" to="3" tone="forward">Code + Verifier 换 Token</message>
  <message from="3" to="2" tone="back">返回 Token</message>
</lanes>
<text tone="muted">简化示意：真实流程还包含浏览器跳转、回调绑定、授权码及令牌校验等细节。</text>
```

### 两行流程对比

上面一行放常规做法当背景，中间加 `<divider/>`，下面一行用胶囊突出真正想讲的循环。

```garden compose
<intent>
上面一行是交付顺序：理解需求、设计方案、开发上线。下面一行才是要强调的决策循环：提出假设、低成本验证、迭代或放弃。上面是背景，下面是重点。
</intent>
<row align="center">
  <title align="center">理解需求</title>
  <arrow dir="right"/>
  <title align="center">设计方案</title>
  <arrow dir="right"/>
  <title align="center">开发上线</title>
</row>
<divider/>
<row align="center">
  <pill tone="muted">提出假设</pill>
  <arrow dir="right"/>
  <pill tone="muted">低成本验证</pill>
  <arrow dir="right"/>
  <pill tone="muted">迭代或放弃</pill>
</row>
<text tone="muted">第二行才是产品探索更强调的决策循环。</text>
```

## 可调参数（play）

静态说明图还差一步、读者要拧参数时，仍写 `garden compose`，在围栏里用同一套 DIL 写法：

- `{@body const [n, setN] = DIL.useState(3)}` 声明状态
- `{@body const total = n * 24}` 派生值
- `{total}` / `value={n}` 插值
- `{#if …}{:else}{/if}`、`{#each … as item, i}{/each}` 控制流
- 小写控件：`<slider>`、`<choice>`、`<button>`、`<pie>` / `<chart>`、`<stat>`

旧的 `garden interactive` 与 PascalCase `<State>` / `<Slider>` 仅作兼容，新文章不要再写。完整映射见仓库 `docs/compose-dil.md`。

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

