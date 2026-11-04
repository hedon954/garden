---
title: Diagrams (compose)
navTitle: Diagrams
description: Write a short plain-language structure; AI compiles it into a static diagram.
section: components
order: 36
badge: compose
---

To draw a structure diagram in a post, type `/garden` and pick **compose (idea)**. That inserts a `garden compose` fence. Write the structure in plain language, then ask the AI to compile the post. It keeps your words in `<intent>` and builds the diagram from Markdown leaves plus catalog tags.

## How to write

Describe the structure readers should see. Do not prescribe styles.

Cover four things:

- **How many blocks**: three columns, five layers top-to-bottom, or two rows.
- **What each block is called**: short labels that appear on the diagram. Put explanations on the line under the name.
- **What connects to what**: who reaches whom, fans out, or joins. If there is no order, say so.
- **Which block is the focus**: name it (“the middle column”, “the lower row”).

Do not specify colors, radii, pill chrome, weight, gaps, shadows, or full-bleed. Defaults own appearance.

**Every tag and shared token**: [compose reference](/garden/en/reference/compose). **Every icon name**: [compose icons](/garden/en/reference/compose-icons).

## Rewrite patterns

Two common mistakes: naming only a topic with no structure, or spending the fence on colors and padding.

**Three columns, middle joins**

````markdown
```garden compose
Three columns: User under Alice, Bob; Role under admin, reviewer;
Permission under orders:read, orders:approve.
Role sits in the middle and joins users to permissions. Role is the focus.
```
````

**Hub, then fan out**

````markdown
```garden compose
The browser reaches the identity provider first, then fans out to HR, Finance, and Project.
All three trust the same IdP. The IdP is the focus.
```
````

**Top-down layers**

````markdown
```garden compose
Five layers top to bottom: browser, identity, BFF, business service, authorization.
Identity and authorization are the focus; the rest are paths through.
Not every request walks the whole stack in order.
```
````

**Several facets of one request**

````markdown
```garden compose
After the user sends a request, look at four facets: authentication, credential,
authorization, verification. Then transport and secrecy. No strict order among the six.
```
````

**Two rows to contrast**

````markdown
```garden compose
Top row is delivery: understand → design → ship.
Bottom row is the exploration loop: hypothesize → cheap test → iterate or drop.
Top is background; the bottom row is the point.
```
````

## Icons and surfaces

Use `<icon name="check-circle"/>` — not emoji. Combine `padding`, `background`, and `radius` for small chips; do not invent one-off tags per diagram.

## One sample

```garden compose
<intent>
Three columns: User under Alice and Bob; Role under admin and reviewer; Permission under orders:read and orders:approve. Role joins the sides and should be seen first.
</intent>
<row align="center">
  <stack align="center">
    <title>User</title>
    <text>Alice</text>
    <text>Bob</text>
  </stack>
  <band tone="accent" align="center">
    <title>Role</title>
    <text>admin</text>
    <text>reviewer</text>
  </band>
  <stack align="center">
    <title>Permission</title>
    <text>orders:read</text>
    <text>orders:approve</text>
  </stack>
</row>
<join>Role joins users to permissions</join>
<text tone="muted" align="center">Concept: User ↔ Role ↔ Permission</text>
```

## Play (tunable)

Stay on `garden compose` and use DIL when readers need a dial. Mapping: repo `docs/compose-dil.md`.

```garden compose #compose-play-demo
caption: Twist seats; watch the monthly fee.
intent: |
  Let the reader change seat count and see price.
---
{@body const [seats, setSeats] = DIL.useState(3)}
{@body const total = seats * 24}
<slider min={1} max={12} value={seats} onChange={setSeats} label="Seats" />
<stat label="Monthly" value={total} unit="USD" />
```
