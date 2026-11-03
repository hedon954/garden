---
title: Explanation diagram (compose)
navTitle: compose
description: Explain a diagram with cards, arrows, lanes, and notes.
section: components
order: 36
badge: compose
---

In the editor, type `/garden` and choose the compose item. That inserts a `garden compose` fence whose body is one sentence, not a YAML stub. After compile, the fence type stays `garden compose`: the sentence moves into `intent` and the body becomes a YAML tree.

Open a note with `steps` and `notes`. Every field is in [Component reference · compose](/garden/en/reference/compose). A narrow screen stacks a row into one column. Color comes from theme tokens, so light and dark both stay readable.

Each diagram below is built from those parts.

## RBAC

```garden compose
intent: |
  Three columns: User, Role, Permission. Role sits on a tinted band. The join says a role connects users and permissions.
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
              - text: Administrator
              - text: Reviewer
        - stack:
            align: center
            children:
              - title: Permission
              - text: "orders:read"
              - text: "orders:approve"
  - join: Role connects users and permissions
  - type: text
    text: "Concept: User ↔ Role ↔ Permission"
    align: center
    tone: muted
```

## SSO

```garden compose
intent: |
  The browser points at the identity provider, which fans out to HR, Finance, and Project. All three trust the same provider.
tree:
  - stack:
      align: center
      children:
        - card:
            frame: pill
            title: Browser
        - arrow: down
        - card:
            frame: band
            tone: accent
            align: center
            title: Identity Provider (IdP)
            text: Verifies identity, keeps the session, and issues an assertion
        - fan: 3
        - row:
            align: center
            children:
              - title: HR
              - title: Finance
              - title: Project
        - type: text
          text: All three systems trust the same identity provider
          align: center
          tone: muted
```

## Authentication layers

```garden compose
intent: |
  Five layers from top to bottom: browser, identity service, BFF, business service, authorization decision. The identity service and the decision layer use tinted bands.
tree:
  - stack:
      align: center
      children:
        - card:
            frame: text
            align: center
            badge: "1"
            title: Browser / App
            text: Cookie, session, OAuth client
        - arrow: down
        - card:
            frame: band
            tone: accent
            align: center
            badge: "2"
            title: Identity service (IdP / IAM)
            text: Passkey, MFA, OIDC, session management
        - arrow: down
        - card:
            frame: text
            align: center
            badge: "3"
            title: BFF / API Gateway
            text: Session check, token check, entry authorization
        - arrow: down
        - card:
            frame: text
            align: center
            badge: "4"
            title: Business service
            text: Orders, payments, accounts, resources
        - arrow: down
        - card:
            frame: band
            tone: tip
            align: center
            badge: "5"
            title: Authorization decision
            text: RBAC + ABAC + ReBAC + Policy Engine
        - type: text
          text: Duties, not a required hop order. The identity service is usually involved at login. The business service calls the decision system while handling the request.
          align: start
          tone: muted
```

## Six sides of an API

```garden compose
intent: |
  One API request split into authentication, credential, authorization, and verification, then transport and confidentiality.
tree:
  - stack:
      align: center
      children:
        - title: The user calls an API
        - type: text
          text: "Example: change an order address"
          tone: muted
  - arrow: down
  - row:
      children:
        - card:
            title: Authentication
            children:
              - text: Who are you?
        - card:
            title: Credential
            children:
              - text: How do you prove it?
  - row:
      children:
        - card:
            title: Authorization
            children:
              - text: May you change this order?
        - card:
            title: Verification
            children:
              - text: Is the payload valid?
  - arrow: down
  - stack:
      align: center
      children:
        - title: Business operation and storage
  - row:
      children:
        - card:
            title: Transport
            text: Can the network be read, changed, or spoofed?
        - card:
            title: Confidentiality
            text: Can a leaked secret still be read?
  - type: text
    text: Not a strict sequence. Transport covers the whole connection, and confidentiality can sit on both client and server.
    tone: muted
```

## Agent, policy point, and tools

```garden compose
intent: |
  User intent goes through the agent, then a policy enforcement point, then the tool executor. The policy point holds four checks.
tree:
  - stack:
      align: center
      children:
        - title: User Intent + Authorization
        - type: text
          text: Task, identity, and the scope that was granted
          tone: muted
        - arrow: down
        - card:
            frame: band
            align: center
            title: Agent / LLM
            text: Understands, plans, and proposes an action
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
                text: Deterministic control, separate from the LLM
                align: center
                tone: muted
              - row:
                  align: center
                  children:
                    - text: Permission and resource scope
                    - text: Argument checks
              - row:
                  align: center
                  children:
                    - text: Task-intent limits
                    - text: Approval for risky actions
        - arrow: down
        - title: Tool Executor
        - type: text
          text: Least privilege, an audit record, and a way to stop
          tone: muted
```

## OAuth authorization code + PKCE

```garden compose
intent: |
  Three lanes (user, client, authorization server) and six steps for the authorization code with PKCE.
tree:
  - lanes:
      actors:
        - User
        - Client
        - Authorization server
      messages:
        - from: 1
          to: 2
          text: Click sign-in
          tone: forward
        - from: 2
          to: 3
          text: Authorization request + PKCE
          tone: forward
        - from: 3
          to: 1
          text: Authenticate and approve
          tone: back
        - from: 3
          to: 2
          text: Redirect back with a code
          tone: back
        - from: 2
          to: 3
          text: Code + verifier for a token
          tone: forward
        - from: 3
          to: 2
          text: Return the token
          tone: back
  - type: text
    text: A sketch. The real flow also binds the browser redirect, the callback, and checks on the code and token.
    tone: muted
```

## Two-row flow

The top row is plain titles. The bottom row is pills. A divider sits between them.

```garden compose
intent: |
  Two rows. The first is plain titles, the second is muted pills, and the footnote says the second row is the decision loop.
tree:
  - row:
      align: center
      children:
        - title:
            text: Understand
            align: center
        - arrow: right
        - title:
            text: Design
            align: center
        - arrow: right
        - title:
            text: Ship
            align: center
  - divider:
  - row:
      align: center
      children:
        - card:
            frame: pill
            tone: muted
            align: center
            title: Hypothesize
        - arrow: right
        - card:
            frame: pill
            tone: muted
            align: center
            title: Cheap test
        - arrow: right
        - card:
            frame: pill
            tone: muted
            align: center
            title: Iterate or stop
  - type: text
    text: The second row is the decision loop.
    tone: muted
    align: start
```
