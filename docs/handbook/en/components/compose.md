---
title: Explanation diagram (compose)
navTitle: compose
description: Write the structure the reader should see, then look at the compiled diagrams.
section: components
order: 36
badge: compose
---

In the editor, type `/garden` and choose `compose`. That inserts a `garden compose` fence. Write a few plain sentences inside it, then ask the AI to compile the post.

## What to write

Write the structure you want the reader to see. Do not describe the look.

State four things and the compiler has enough:

- **How many parts**: three columns side by side, five layers top to bottom, or two rows.
- **Short names**: the words that appear on the diagram, such as `User`, `Identity Provider`, or `Authorization`. Put the explanation on the line below, not inside the title.
- **Who connects to whom**: what goes to what first, where one box fans out, or where two sides meet. If the parts are not in order, say "not a strict sequence."
- **Which part is the point**: name it directly, such as "Role is the focus" or "the bottom row is the point."

Do not write colors, rounded corners, grey pills, font weights, spacing, shadows, or full-width rules. Component defaults handle the look. Every tag is listed in [Component reference · compose](/garden/en/reference/compose).

## Not enough vs enough

In each pair below, the first line is too vague or talks about styling. The fenced block is ready to copy. The compiled diagrams follow below this section.

**Three columns joined in the middle**

Not enough: "Draw a permissions diagram." — No columns and no names.
Also not enough: "Three equal columns, light grey rounded box in the middle, lighter font weight." — All styling, no content.

Enough:

````markdown
```garden compose
Three columns: User has Alice and Bob; Role has Administrator and Reviewer;
Permission has orders:read and orders:approve.
Role sits in the middle and connects users to permissions. Role is the focus.
```
````

This names the three columns, the items under each one, the middle link, and the focus on `Role`.

**One hub, then fan out**

Not enough: "Draw SSO with nicer arrows and even spacing." — Only talks about styling.

Enough:

````markdown
```garden compose
The browser reaches the identity provider first, then connects to
HR, Finance, and Project at once.
All three systems trust that provider. The identity provider is the focus.
```
````

This states what comes first, the one-to-three fan-out, and which box matters most.

**Layers from top to bottom**

Not enough: "Five full-width bands, color the second and fifth, thin arrows." — Describes boxes instead of layers.

Enough:

````markdown
```garden compose
Five layers top to bottom: Browser, Identity Service, BFF,
Business Service, Authorization Decision.
Identity Service and Authorization Decision are the focus; the rest are the path.
Not every request walks all five in order.
```
````

This names the five layers, picks the two to highlight, and notes that requests do not always run in order.

**Several sides of one request**

Not enough: "Two rows of two cards, then two more, unbolded titles." — Only describes layout.

Enough:

````markdown
```garden compose
When a user sends a request, check four things first: Authentication (who you are),
Credential (how you prove it), Authorization (whether you may), Validation (whether data is valid).
For business logic and storage, check Transport and Confidentiality. Not a strict sequence.
```
````

This gives the six short names, the one-line question under each, the two groups, and the non-sequential note.

**Two rows in contrast**

Not enough: "Borderless text on top, grey pills below, hug the content." — All visual instructions.

Enough:

````markdown
```garden compose
Top row is standard delivery: Understand -> Design -> Ship.
Bottom row is the discovery loop: Hypothesize -> Cheap test -> Iterate or drop.
The top row is background; the bottom row is the point.
```
````

This says which row is background and which row carries the point. The diagrams below are compiled from sentences like these.

## RBAC

```garden compose
<intent>
Three columns: User with Alice and Bob, Role with Administrator and Reviewer, Permission with orders:read and orders:approve. Role sits in the middle and connects users to permissions. Role is the layer to see first.
</intent>
<row align="center">
  <stack align="center">
    <title>User</title>
    <text>Alice</text>
    <text>Bob</text>
  </stack>
  <band tone="accent" align="center">
    <title>Role</title>
    <text>Administrator</text>
    <text>Reviewer</text>
  </band>
  <stack align="center">
    <title>Permission</title>
    <text>orders:read</text>
    <text>orders:approve</text>
  </stack>
</row>
<join>Role connects users and permissions</join>
<text tone="muted" align="center">Concept: User ↔ Role ↔ Permission</text>
```

## SSO

```garden compose
<intent>
The browser reaches the identity provider first. The identity provider then connects to HR, Finance, and Project at once. All three systems trust that same provider. The identity provider is the layer to see first.
</intent>
<stack align="center">
  <pill>Browser</pill>
  <arrow dir="down"/>
  <band tone="accent" align="center">
    <title>Identity Provider (IdP)</title>
    <text>Verifies identity, keeps the session, and issues an assertion</text>
  </band>
  <fan n="3"/>
  <row align="center">
    <title>HR</title>
    <title>Finance</title>
    <title>Project</title>
  </row>
  <text tone="muted" align="center">All three systems trust the same identity provider</text>
</stack>
```

## Authentication layers

```garden compose
<intent>
Five layers from top to bottom: browser, identity service, BFF, business service, authorization decision. The identity service and the authorization decision are the two layers to emphasize. The others are the path. Not every request walks the layers in this order.
</intent>
<stack align="center">
  <box frame="text" align="center">
    <badge>1</badge>
    <title>Browser / App</title>
    <text>Cookie, session, OAuth client</text>
  </box>
  <arrow dir="down"/>
  <band tone="accent" align="center">
    <badge>2</badge>
    <title>Identity service (IdP / IAM)</title>
    <text>Passkey, MFA, OIDC, session management</text>
  </band>
  <arrow dir="down"/>
  <box frame="text" align="center">
    <badge>3</badge>
    <title>BFF / API Gateway</title>
    <text>Session check, token check, entry authorization</text>
  </box>
  <arrow dir="down"/>
  <box frame="text" align="center">
    <badge>4</badge>
    <title>Business service</title>
    <text>Orders, payments, accounts, resources</text>
  </box>
  <arrow dir="down"/>
  <band tone="tip" align="center">
    <badge>5</badge>
    <title>Authorization decision</title>
    <text>RBAC + ABAC + ReBAC + Policy Engine</text>
  </band>
  <text tone="muted" align="start">Duties, not a required hop order. The identity service is usually involved at login. The business service calls the decision system while handling the request.</text>
</stack>
```

## Six sides of an API

```garden compose
<intent>
The user wants to change an order address. Split that into authentication, credential, authorization, and verification, one question each. Then transport and confidentiality. These six are not a strict sequence.
</intent>
<stack align="center">
  <title>The user calls an API</title>
  <text tone="muted">Example: change an order address</text>
</stack>
<arrow dir="down"/>
<row>
  <box>
    <title>Authentication</title>
    <text>Who are you?</text>
  </box>
  <box>
    <title>Credential</title>
    <text>How do you prove it?</text>
  </box>
</row>
<row>
  <box>
    <title>Authorization</title>
    <text>May you change this order?</text>
  </box>
  <box>
    <title>Verification</title>
    <text>Is the payload valid?</text>
  </box>
</row>
<arrow dir="down"/>
<stack align="center">
  <title>Business operation and storage</title>
</stack>
<row>
  <box>
    <title>Transport</title>
    <text>Can the network be read, changed, or spoofed?</text>
  </box>
  <box>
    <title>Confidentiality</title>
    <text>Can a leaked secret still be read?</text>
  </box>
</row>
<text tone="muted">Not a strict sequence. Transport covers the whole connection, and confidentiality can sit on both client and server.</text>
```

## Agent, policy point, and tools

```garden compose
<intent>
User intent goes through the agent, then a policy enforcement point, then the tool executor. The policy point holds four checks and is the layer to see first.
</intent>
<stack align="center">
  <title>User Intent + Authorization</title>
  <text tone="muted">Task, identity, and the scope that was granted</text>
  <arrow dir="down"/>
  <band align="center">
    <title>Agent / LLM</title>
    <text>Understands, plans, and proposes an action</text>
    <row align="center">
      <badge>Untrusted Context</badge>
      <badge>Memory</badge>
      <badge>Tool Results</badge>
    </row>
  </band>
  <arrow dir="down"/>
  <box align="center" mark="shield">
    <title>Policy Enforcement Point</title>
    <text tone="muted" align="center">Deterministic control, separate from the LLM</text>
    <row align="center">
      <text>Permission and resource scope</text>
      <text>Argument checks</text>
    </row>
    <row align="center">
      <text>Task-intent limits</text>
      <text>Approval for risky actions</text>
    </row>
  </box>
  <arrow dir="down"/>
  <title>Tool Executor</title>
  <text tone="muted">Least privilege, an audit record, and a way to stop</text>
</stack>
```

## OAuth authorization code + PKCE

```garden compose
<intent>
Three lanes (user, client, authorization server) and six steps for the authorization code with PKCE.
</intent>
<lanes>
  <actor>User</actor>
  <actor>Client</actor>
  <actor>Authorization server</actor>
  <message from="1" to="2" tone="forward">Click sign-in</message>
  <message from="2" to="3" tone="forward">Authorization request + PKCE</message>
  <message from="3" to="1" tone="back">Authenticate and approve</message>
  <message from="3" to="2" tone="back">Redirect back with a code</message>
  <message from="2" to="3" tone="forward">Code + verifier for a token</message>
  <message from="3" to="2" tone="back">Return the token</message>
</lanes>
<text tone="muted">A sketch. The real flow also binds the browser redirect, the callback, and checks on the code and token.</text>
```

## Two-row flow

The top row is plain titles. The bottom row is pills. A divider sits between them.

```garden compose
<intent>
The top row is delivery order: Understand, Design, Ship. The bottom row is the decision loop to emphasize: Hypothesize, Cheap test, Iterate or stop. The top row is background. The bottom row is the point.
</intent>
<row align="center">
  <title align="center">Understand</title>
  <arrow dir="right"/>
  <title align="center">Design</title>
  <arrow dir="right"/>
  <title align="center">Ship</title>
</row>
<divider/>
<row align="center">
  <pill tone="muted">Hypothesize</pill>
  <arrow dir="right"/>
  <pill tone="muted">Cheap test</pill>
  <arrow dir="right"/>
  <pill tone="muted">Iterate or stop</pill>
</row>
<text tone="muted" align="start">The second row is the decision loop.</text>
```
