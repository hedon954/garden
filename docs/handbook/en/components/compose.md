---
title: Explanation diagram (compose)
navTitle: compose
description: Write a few plain sentences in a post and let the AI assemble a static diagram.
section: components
order: 36
badge: compose
---

When a post needs a structure diagram, type `/garden` and pick `compose`. That inserts a `garden compose` fence. Write the structure in plain language inside the fence, then ask the AI to compile the post. Your sentence stays inside `<intent>`, and the AI fills in Markdown leaves and component tags to render a static diagram.

## How to write

Write the structure you want the reader to see. Do not describe the look.

Four things:

- **How many parts**: three columns side by side, five layers top to bottom, or two rows.
- **Short names**: the words shown on the diagram. Put the explanation on the line below, not inside the title.
- **Who connects to whom**: what goes to what first, where one box fans out, or where sides meet. If there is no order, say "not a strict sequence."
- **Which part is the point**: name it directly, such as "the middle column is the focus" or "the bottom row is the point."

Do not write colors, rounded corners, grey pills, font weights, spacing, shadows, or full-width rules. Component defaults handle the look. Every tag is listed in [Component reference · compose](/garden/en/reference/compose).

## Best practices

Two things usually go wrong in an intent fence: naming only a topic with no structure, or spending the sentence on colors, corner radii, and font weights. Below are five common structures showing what to avoid and how to write the fence instead.

**Three columns joined in the middle**

Writing only "Draw a permissions diagram" gives no columns or names; writing "Three equal columns, light grey rounded box in the middle, lighter font weight" only describes styling.

Name the three columns, the items under each one, the middle link, and the focus:

````markdown
```garden compose
Three columns: User has Alice and Bob; Role has Administrator and Reviewer;
Permission has orders:read and orders:approve.
Role sits in the middle and connects users to permissions. Role is the focus.
```
````

**Converge, then fan out**

Instead of "Draw SSO with nicer arrows and even spacing," state what reaches the hub first and which systems it branches out to:

````markdown
```garden compose
The browser reaches the identity provider first, then connects to
HR, Finance, and Project at once.
All three systems trust that provider. The identity provider is the focus.
```
````

**Top-to-bottom layers**

Instead of "Five full-width bands, color the second and fifth, thin arrows," list the five layer names, pick the two to highlight, and note whether every request walks them in order:

````markdown
```garden compose
Five layers top to bottom: Browser, Identity Service, BFF,
Business Service, Authorization Decision.
Identity Service and Authorization Decision are the focus; the rest are the path.
Not every request walks all five in order.
```
````

**Multiple facets of one subject**

Instead of "Two rows of two cards, then two more, unbolded titles," give the six short names, the one-line question under each, the two groups, and the non-sequential note:

````markdown
```garden compose
When a user sends a request, check four things first: Authentication (who you are),
Credential (how you prove it), Authorization (whether you may), Validation (whether data is valid).
For business logic and storage, check Transport and Confidentiality. Not a strict sequence.
```
````

**Two-row contrast flow**

Instead of "Borderless text on top, grey pills below, hug the content," state which row is background and which row carries the point:

````markdown
```garden compose
Top row is standard delivery: Understand -> Design -> Ship.
Bottom row is the discovery loop: Hypothesize -> Cheap test -> Iterate or drop.
The top row is background; the bottom row is the point.
```
````

## Capability examples

**The diagrams below are only examples** showing the layout shapes `compose` can build. The sample topics (permissions, sign-in, APIs) are just filler text; replace them with your own subject when writing a post.

### Three columns joined in the middle

Two outer lists linked through a middle column, pulled together at the bottom with `<join>`.

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

### Converge, then fan out

Flow into one highlighted band first, then branch to several targets at once with `<fan>`.

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

### Top-to-bottom layers

Vertical steps where the key layers use `<band>` and the pass-through hops stay plain text.

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

### Multiple facets of one subject

Non-sequential aspects grouped into rows of `<box>` cards.

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

### Container with nested checks

A larger `<band>` or `<box>` holding a row of badges or a two-column checklist inside it.

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

### Multi-actor sequence

Several actors passing messages back and forth across `<lanes>`.

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

### Two-row contrast flow

Plain titles on top as background, a `<divider/>` in between, and muted pills on the bottom row for the loop that matters.

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
<text tone="muted">The second row is the decision loop that product discovery emphasizes.</text>
```
