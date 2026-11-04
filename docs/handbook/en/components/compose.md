---
title: Explanation diagram (compose)
navTitle: compose
description: Write the structure the reader should see, then look at the compiled diagrams.
section: components
order: 36
badge: compose
---

In the editor, type `/garden` and choose the compose item. That inserts a `garden compose` fence whose body is one sentence, not YAML. After compile, the fence type stays `garden compose`: that sentence is copied into `<intent>` unchanged, and the compile step writes Markdown leaves plus tags, not YAML slots.

You only write what the reader should see. Do not write density, fill, corner radius, font weight, shadow, or whether a box should hug its text. Every field is in [Component reference · compose](/garden/en/reference/compose). A narrow screen stacks a row into one column.

## How to write the sentence

### State the structure

The sentence needs a claim about shape. Three lists joined in the middle. One place reached first, then a fan-out. Layers from top to bottom. Several facets of one request. A first row of sequence and a second row that is the point.

### Name the parts

Boxes, lanes, and steps use the short nouns the reader will read on the diagram. `Administrator`, `identity provider`, and `authorization decision` can be titles. Put the explanation in the line under the name. Do not use a full sentence as the title.

### State the relationships

Say order, grouping, who connects to whom, and whether lines fan out or meet. If it is not a single sequence, say that it is not a strict order. If the reader should open one step and read only that note, say which step and which sentence.

### Mark what matters

Say which part should be seen first, and which parts are only the path or the background. For example: "Role is the middle layer to see first." "The identity service and the authorization decision are the two layers to emphasize." "The second row is the decision loop." Do not name a color or a frame.

### Do not describe the look

Do not ask for flatter cards, grey pills, hugging the text, not stretching, a font weight, tighter density, a shadow, a radius, or a tinted band. Shared defaults and the compile step decide the look.

## Enough structure, and not enough

Each pair is the sentence you type into the fence. The compiled diagrams are below this section.

### Three columns, joined in the middle

Not enough: "Draw a permissions diagram." There are no columns, no names, and no connection.

Also not enough: "Three equal columns, a light grey rounded card in the middle, do not stretch it, use a light font weight." That is a look, not a structure.

Enough:

````markdown
```garden compose
Three columns: User with Alice and Bob, Role with Administrator and Reviewer, Permission with orders:read and orders:approve. Role sits in the middle and connects users to permissions. Role is the layer to see first.
```
````

### Reach one place, then fan out

Not enough: "Draw SSO, with nicer arrows and even gaps."

Enough:

````markdown
```garden compose
The browser reaches the identity provider first. The identity provider then connects to HR, Finance, and Project at once. All three systems trust that same provider. The identity provider is the layer to see first.
```
````

### Layers from top to bottom

Not enough: "Five full-width bands, tint the second and the fifth, draw thin arrows."

Enough:

````markdown
```garden compose
Five layers from top to bottom: browser, identity service, BFF, business service, authorization decision. The identity service and the authorization decision are the two layers to emphasize. The others are the path. Not every request walks the layers in this order.
```
````

### Several facets of one request

Not enough: "Two rows of two cards, then two more, and do not bold the titles."

Enough:

````markdown
```garden compose
The user wants to change an order address. Split that into authentication, credential, authorization, and verification, one question each: who you are, how you prove it, whether you may, and whether the payload is valid. Then transport and confidentiality. These six are not a strict sequence.
```
````

### A sequence on top, the point underneath

Not enough: "Plain titles on top, grey pills underneath, hug the text, do not stretch the row."

Enough:

````markdown
```garden compose
The top row is delivery order: Understand, Design, Ship. The bottom row is the decision loop to emphasize: Hypothesize, Cheap test, Iterate or stop. The top row is background. The bottom row is the point.
```
````

The diagrams below are what this kind of sentence looks like after compile.

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
