---
title: 说明图（compose）
navTitle: 说明图
description: 先写想让读者看见的结构，再看编译后的图。
section: components
order: 36
badge: compose
---

编辑器里输入 `/garden`，选「compose（想法）」。插入的是 `garden compose` 围栏，正文只有一句白话。对 AI 说「编译这篇」之后，围栏类型不变：这句话原样放进 `intent`，YAML 树由编译来写。

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
intent: |
  三列 User、Role、Permission。Role 用浅底。连接线说明角色连接用户和权限。
tree:
  - row:
      align: center
      children:
        - stack:
            align: center
            children:
              - title: User
              - text: Alice
              - text: Bob
        - card:
            frame: band
            tone: accent
            align: center
            title: Role
            children:
              - text: 管理员
              - text: 审核员
        - stack:
            align: center
            children:
              - title: Permission
              - text: "orders:read"
              - text: "orders:approve"
  - join: 角色连接用户和权限
  - type: text
    text: "概念关系：User ↔ Role ↔ Permission"
    align: center
    tone: muted
```

## SSO

```garden compose
intent: |
  用户浏览器指向身份提供方，再散到 HR、Finance、Project。三个系统信任同一个身份提供方。
tree:
  - stack:
      align: center
      children:
        - card:
            frame: pill
            title: 用户浏览器
        - arrow: down
        - card:
            frame: band
            tone: accent
            align: center
            title: Identity Provider（IdP）
            text: 统一完成身份验证、维护登录状态、签发身份断言
        - fan: 3
        - row:
            align: center
            children:
              - title: HR 系统
              - title: Finance 系统
              - title: Project 系统
        - type: text
          text: 三个系统都信任同一个身份提供方
          align: center
          tone: muted
```

## 认证分层

```garden compose
intent: |
  从上到下五层：浏览器、身份服务、BFF、业务服务、授权决策。身份服务和授权决策用浅底。
tree:
  - stack:
      align: center
      children:
        - card:
            frame: text
            align: center
            badge: "①"
            title: 浏览器 / App
            text: Cookie、Session、OAuth Client
        - arrow: down
        - card:
            frame: band
            tone: accent
            align: center
            badge: "②"
            title: 身份服务 IdP / IAM
            text: Passkey、MFA、OIDC、会话管理
        - arrow: down
        - card:
            frame: text
            align: center
            badge: "③"
            title: BFF / API Gateway
            text: 会话验证、Token 校验、入口授权控制
        - arrow: down
        - card:
            frame: text
            align: center
            badge: "④"
            title: 业务服务
            text: 订单、支付、账户、资源对象
        - arrow: down
        - card:
            frame: band
            tone: tip
            align: center
            badge: "⑤"
            title: 授权决策系统
            text: RBAC + ABAC + ReBAC + Policy Engine
        - type: text
          text: 逻辑职责示意：并非所有请求都按此顺序经过各层。身份服务通常在登录阶段交互，业务服务则在请求执行时调用授权决策能力。
          align: start
          tone: muted
```

## API 的六个维度

```garden compose
intent: |
  一次 API 请求拆成认证、凭证、授权、验证，再到传输和保密。
tree:
  - stack:
      align: center
      children:
        - title: 用户发起 API 请求
        - type: text
          text: 例如：修改订单收货地址
          tone: muted
  - arrow: down
  - row:
      children:
        - card:
            title: 认证
            children:
              - text: 你是谁？
              - type: text
                text: Authentication
                tone: muted
        - card:
            title: 凭证
            children:
              - text: 如何证明你的身份？
              - type: text
                text: Credential
                tone: muted
  - row:
      children:
        - card:
            title: 授权
            children:
              - text: 你有权修改这笔订单吗？
              - type: text
                text: Authorization
                tone: muted
        - card:
            title: 验证
            children:
              - text: 提交的数据是否合法？
              - type: text
                text: Verification
                tone: muted
  - arrow: down
  - stack:
      align: center
      children:
        - title: 业务操作与数据存储
  - row:
      children:
        - card:
            title: 传输
            text: 网络中能否被窃听、篡改、冒充？
        - card:
            title: 保密
            text: 敏感数据泄露后能否被读取？
  - type: text
    text: 概念示意：六者并不是严格串行的执行阶段，传输保护贯穿网络通信，保密措施也可能覆盖客户端与服务端。
    tone: muted
```

## Agent、策略点与工具

```garden compose
intent: |
  用户意图经过 Agent，再经过策略执行点，最后到工具执行器。策略点里是四条约束。
tree:
  - stack:
      align: center
      children:
        - title: User Intent + Authorization
        - type: text
          text: 明确任务目标、用户身份与授权范围
          tone: muted
        - arrow: down
        - card:
            frame: band
            align: center
            title: Agent / LLM
            text: 负责理解、推理、规划和提出执行意图
            children:
              - row:
                  align: center
                  children:
                    - badge: Untrusted Context
                    - badge: Memory
                    - badge: Tool Results
        - arrow: down
        - card:
            align: center
            mark: shield
            title: Policy Enforcement Point
            children:
              - type: text
                text: 独立于 LLM 的确定性执行控制
                align: center
                tone: muted
              - row:
                  align: center
                  children:
                    - text: 权限与资源范围
                    - text: 操作参数校验
              - row:
                  align: center
                  children:
                    - text: 任务意图约束
                    - text: 高风险操作审批
        - arrow: down
        - title: Tool Executor
        - type: text
          text: 按最小权限执行、记录审计、支持中断
          tone: muted
```

## OAuth 授权码 + PKCE

```garden compose
intent: |
  用户、客户端、授权服务器三条泳道，六步授权码加 PKCE。
tree:
  - lanes:
      actors:
        - 用户
        - 客户端
        - 授权服务器
      messages:
        - from: 1
          to: 2
          text: 点击登录 / 授权
          tone: forward
        - from: 2
          to: 3
          text: 发起授权请求 + PKCE
          tone: forward
        - from: 3
          to: 1
          text: 用户身份验证与授权
          tone: back
        - from: 3
          to: 2
          text: 重定向返回 Code
          tone: back
        - from: 2
          to: 3
          text: Code + Verifier 换 Token
          tone: forward
        - from: 3
          to: 2
          text: 返回 Token
          tone: back
  - type: text
    text: 简化示意：真实流程还包含浏览器跳转、回调绑定、授权码及令牌校验等细节。
    tone: muted
```

## 两行流程

上面一行是无框标题，下面一行是胶囊。中间一条分隔线。

```garden compose
intent: |
  两行流程。上面三步是白话，下面三步是胶囊，脚注说明第二行才是决策循环。
tree:
  - row:
      align: center
      children:
        - title:
            text: 理解需求
            align: center
        - arrow: right
        - title:
            text: 设计方案
            align: center
        - arrow: right
        - title:
            text: 开发上线
            align: center
  - divider:
  - row:
      align: center
      children:
        - card:
            frame: pill
            tone: muted
            align: center
            title: 提出假设
        - arrow: right
        - card:
            frame: pill
            tone: muted
            align: center
            title: 低成本验证
        - arrow: right
        - card:
            frame: pill
            tone: muted
            align: center
            title: 迭代或放弃
  - type: text
    text: 第二行才是产品探索更强调的决策循环。
    tone: muted
    align: start
```
