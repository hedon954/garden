---
name: garden-post-review
description: >-
  Reviews one specified Garden post in three steps: fix script-reported
  structure errors, fix widgets with the chart skill, then suggest prose
  improvements without editing. Use when the user asks to review or
  proofread a Garden blog post.
---

# Review a Garden post

Review only the post the user named. Do the three steps in order; each step sees the post as the previous step left it.

Before you start, run `npx garden ui scan content/posts/path.md`. If any block has `status` `uncompiled`, `stale` or `error`, handle it with [garden-ui](../garden-ui/SKILL.md) first, then go to step 1.

Hard check command (from the site root):

```bash
npx garden check content/posts/path.md
```

stdout is JSON. It passes only when `ok` is true. Do not re-check titles, dates or the reference list yourself.

## 1. The script reports errors; fix only those

Run `garden check`. If there are `errors`, change only those entries, then run the same command again until `ok` is true.

- Touch only the places the errors point to.
- Do not fix structural issues the script did not report.
- `references` is recommended further reading. It does not have to match the links in the body one to one. Do not add an entry because the body has a link, and do not remove one because the body never mentions it.
- `reference-heading`: move the flagged reference-list heading into `references` and delete the heading.
- If a widget file is missing, only fix a mistyped `src`. Do not build a new chart in this step.

## 2. Review and fix charts with the chart skill

Do this step only when the post has a `widget`. Read [garden-interactive-chart](../garden-interactive-chart/SKILL.md) first.

You may change the HTML in the same-name directory and the `caption` of its fence. Leave the surrounding prose alone. `caption` must be a one-sentence claim.

Run `garden check` again afterwards, until it passes.

Skip this step when there is no `widget`.

## 3. Read the whole post; suggestions only

`garden check` passes and the charts are fixed. Read the whole post. Do not change any file.

There is one goal: does the post start from first principles, stay consistent, and close the loop on one point? After reading, the reader should be able to say what this is, why it has to be this way, and how that "why" lands in a piece of practice. Practice means code, an incident, a measurement, or a derivation put to work. It verifies the same chain; it is not a separate tutorial.

First principles means reasoning up from facts, constraints or invariants that cannot be broken down further, not from "everyone does it this way" or a metaphor. After taking it apart, put it back together: listing the holes in existing approaches without reaching a conclusion is not finished. Analogies and industry practice may appear, but only as a foil for the derivation, never as a substitute for it.

Write a suggestion only when:

- The opening stands on a term, a convention or a metaphor, and the reader cannot see which fact constrains the problem
- A later mechanism, term or conclusion cannot be derived from the earlier facts, or the same word means different things in different places
- A point stops at "what it is": there is no why, or the why never lands in practice that can be checked
- The practice and the principles talk past each other and are not the same chain
- The post spreads across several neighbouring topics without bringing one of them home. One point explained fully beats many points touched lightly
- Numbers, comparisons or "usually" claims do not grow out of the derivation, the practice or a source

Each suggestion gives: the heading it is under, where the loop breaks, and how it could be closed. If there are none, say so. Do not turn the post into a problem–solution template, and do not ask for a "does not apply" note on every paragraph. If a translation already restates the original's derivation, do not ask the author to invent exercises.

This step must not change the post, the charts or the front matter.
