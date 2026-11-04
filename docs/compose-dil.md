# Compose DIL bottom layer

Lock (2026-11-04, hedon): compose play uses the **same underlying constructs as ChatGPT Intelligent UI (DIL)**, not a rename of the old PascalCase interactive tree onto the `garden compose` fence.

Sources: [OpenUI / How ChatGPT Intelligent UI works](https://www.openui.com/blog/how-chatgpt-intelligent-ui-works), [Disdjj ANALYSIS.md](https://github.com/Disdjj/intelligent-ui-demo/blob/main/ANALYSIS.md), `docs/compose-inference.md`.

## Author-facing document

One fence: `garden compose`. A body is one of:

1. **Diagram (static).** Markdown leaves + lowercase catalog tags (`box`, `row`, `stack`, `arrow`, `fan`, `join`, `lanes`, …). One-shot HTML. No script.
2. **Play (DIL).** Same Markdown + tags surface, plus ChatGPT-shaped statements and control flow. Reader interaction stays local (no model call).

Authors and AI recipes write DIL. They do **not** write `<State>` / `<Slider>` / `<If>` PascalCase.

## ChatGPT construct → Garden compose

| ChatGPT DIL | Garden compose | Notes |
| --- | --- | --- |
| Markdown heading / paragraph / `**bold**` | Same leaves | Diagram: compile to `title`/`text` nodes. Play: stay Markdown in the play tree. |
| Catalog tags (`box`, `row`, `slider`, …) | Lowercase tags | Diagram catalog stays. Play adds `slider`, `button`, `choice` / `segmented-control`, `stat`, `chart`, `pie` / `pie-chart`, layout `stack`/`columns`/`card`. |
| `{@body const [x,setX]=DIL.useState(v)}` | Same syntax | Restricted: only `DIL.useState` / simple `const name = expr`. No arbitrary JS, no `GenUI.*`, no Worker. |
| `{@body const y = expr}` | Same | `expr` is the whitelist interpreter (`ui/core/expr.mjs`). `Math.round` → `round`, etc. |
| `{expr}` interpolation | Same | In text and in `{…}` attribute values. |
| `{#if expr}…{:else}…{/if}` | Same | |
| `{#each list as item, i}…{/each}` | Same | |
| `<slider value={x} onChange={setX}/>` | Same, or `bind="x"` | Both accepted; bind form is shorter. |
| `<segmented-control value onChange options>` | `<choice bind …>` or `segmented-control` | |
| `<button onClick=…>` | `<button set="name" value={…}>` / ChatGPT-shaped setState call (restricted) | |
| `<pie-chart>` / chart card | `<pie>` / `<chart>` | |
| Stream cut / `recoveryDiagnostics` | **Deferred** | Blog fences are complete one-shot; unclosed tags error. |
| Worker sandbox / render-ops | **Not used** | Whitelist expr + React leaves instead of eval-in-Worker. Same *logic* (state, derived, branch, each, bind controls); different *host* for safety on a static blog. |
| Host widgets (`Cite`, `AsyncImage`, …) | **Out of scope for tip** | |

## Runtime shape

```
garden compose fence
  ├─ diagram? → ui/compose/markup.mjs → static HTML (unchanged)
  └─ play DIL? → ui/compose/dil.mjs
                    ├─ parse {@body}/{#if}/{#each}/tags/expr
                    └─ lower to existing Ui IR (internal only)
                         → compileUiBlock / UiFigure (slider, chart, … leaves)
```

The PascalCase Ui IR (`State`/`Slider`/`If`/…) is an **internal** compile target so we reuse the whitelist evaluator and leaf components. It is not the author language. A temporary shim still accepts old PascalCase bodies and marks them `legacyPlay: true` until samples are migrated; that shim is on a path to delete.

## Killing `garden interactive`

Same pattern as `garden figure`: remove from catalog / picker / handbook; old fences become unknown or a one-line suggestion to rewrite as compose DIL. In-repo samples migrate to DIL syntax (not a fence rename that keeps PascalCase).

## What this tip must prove

- A compose play fence written as ChatGPT-shaped DIL (body + slider + expr + optional if/each + chart/pie) runs on the tip.
- Parity matrix rows for slider / button·choice / chart·pie / `{@body}` / `{expr}` / `{#if}/{#each}` move toward 是/部分 with tip demos.
- windowsill-herbs pot-water uses DIL, not PascalCase.
