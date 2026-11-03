---
title: 说明图（compose）
navTitle: 说明图
description: 用卡片、箭头、泳道和注释讲清一张图。
section: components
order: 36
badge: compose
---

编辑器里输入 `/garden`，选「compose（想法）」。插入的是 `garden compose` 围栏加一句白话。对 AI 说「编译这篇」之后，围栏类型不变，原话留在 `intent`，正文写成 YAML 树。

点开的说明用 `steps` 加 `notes`。全部字段见 [组件参考 · compose](/garden/reference/compose)。窄屏把横排收成一列。颜色走主题变量，浅色和深色都能读。

下面每张图都是用这些零件拼出来的。

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
