---
title: 说明图（compose）
navTitle: 说明图
description: 先写想让读者看见的结构，再看编译后的图。
section: components
order: 36
badge: compose
---

编辑器里输入 `/garden`，选「compose（想法）」。插入的是 `garden compose` 围栏，正文只有一句白话。对 AI 说「编译这篇」之后，围栏类型不变：这句话原样放进 `<intent>`，编译写成 Markdown 叶子和标签，不是 YAML 槽。

你只写想让读者看见什么。疏密、底色、圆角、字重、阴影、要不要撑满，都不要写。字段见 [组件参考 · compose](/garden/reference/compose)。窄屏会把横排收成一列。

## 怎么写这句想法

### 写读者要看见的结构

这句话里要有判断：图在讲哪一种结构。是三列名单靠中间接上，是先到一处再散开，是从上到下的几层，是一次请求的几面，还是上面一行顺序、下面一行才是重点。

### 名字用具体的名词

格子、泳道、步骤都用读者会在图上读到的短名字。`管理员`、`身份提供方`、`授权决策` 可以当标题。解释放在名字下面的那一句，不要把一整句说明当成标题。

### 把关系说出来

写清先后、分组、谁连谁、从一处散开还是收到一处。不是一条直线走完的，就写明「不是严格的先后」。读者要点开某一步才看说明时，把「点哪一步、看哪一句」写进这句话里。

### 标出哪一块是重点

用内容说哪一块要先被看见，哪一块只是路径或背景。比如「Role 是中间要先看见的一层」「身份服务和授权决策是要强调的两层」「下面一行才是决策循环」。不要写用什么颜色、什么框。

### 不要写样子

不要写扁一点、灰胶囊、按内容收缩、不要撑满、字重、疏密、阴影、圆角、通栏或浅底。这些由组件的默认样子和编译决定。

## 够用的句子和不够的

每组都是打进围栏的那一句。编译之后的图在这一节下面。

### 三列，中间接上

不够：只写「画一张权限图」。没有列、没有名字、没有谁连谁。

也不够：「三列等宽，中间用浅灰圆角，不要拉高，字重轻一点。」这是在规定样子。

够用：

````markdown
```garden compose
三列：User 下面是 Alice 和 Bob，Role 下面是管理员和审核员，Permission 下面是 orders:read 和 orders:approve。Role 在中间，把用户和权限接起来。Role 是要先看见的一层。
```
````

### 先到一处，再散开

不够：「画单点登录，箭头好看一点，间距均匀。」

够用：

````markdown
```garden compose
用户浏览器先到身份提供方。身份提供方再同时连到 HR、Finance、Project。三个系统信任同一个身份提供方。身份提供方是要先看见的一层。
```
````

### 从上到下的几层

不够：「五张通栏，第二张和第五张上色，箭头画细。」

够用：

````markdown
```garden compose
从上到下五层：浏览器、身份服务、BFF、业务服务、授权决策。身份服务和授权决策是要强调的两层，其余是经过的路径。不是每次请求都按这个顺序走完。
```
````

### 一次请求的几面

不够：「两行两列的卡片，下面再两张，标题不要加粗。」

够用：

````markdown
```garden compose
用户要改订单地址。先分成认证、凭证、授权、验证，每块一个问题：你是谁、怎么证明、有没有权、数据合不合法。然后再看传输和保密。这六块不是严格的先后步骤。
```
````

### 上面一行顺序，下面一行才是重点

不够：「上面无框，下面灰色胶囊，贴着内容，不要撑满整行。」

够用：

````markdown
```garden compose
上面一行是交付顺序：理解需求、设计方案、开发上线。下面一行才是要强调的决策循环：提出假设、低成本验证、迭代或放弃。上面是背景，下面是重点。
```
````

下面这些图，就是这类句子编译之后的样子。

## RBAC

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

## SSO

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

## 认证分层

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

## API 的六个维度

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

## Agent、策略点与工具

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

## OAuth 授权码 + PKCE

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

## 两行流程

上面一行是无框标题，下面一行是胶囊。中间一条分隔线。

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
<text tone="muted" align="start">第二行才是产品探索更强调的决策循环。</text>
```
