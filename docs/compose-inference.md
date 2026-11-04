# Compose inference format

Research note for the one-shot static port of ChatGPT Intelligent UI. Sources read before the parser change:

- [How ChatGPT Intelligent UI works](https://www.openui.com/blog/how-chatgpt-intelligent-ui-works) (Thesys / OpenUI, October 2026 captures of GPT-6)
- [Disdjj/intelligent-ui-demo ANALYSIS.md](https://github.com/Disdjj/intelligent-ui-demo/blob/main/ANALYSIS.md) (Reqable capture, 2026-10-08, protocol version 14)
- [GPT-6 and Intelligent UI for everyone](https://openai.com/index/gpt-6-for-everyone/) (OpenAI, 7 October 2026)
- OpenUI Lang is a different syntax (`Stack(...)`, positional calls). It is only a catalog parallel, not the format ChatGPT writes.

## What the model writes

ChatGPT calls the inference format DIL. A response is one document of three kinds of construct:

- **Markdown leaves.** Headings, paragraphs, bold, lists. A pure-text answer is still DIL: the capture compiles one paragraph to a single `text` node.
- **JSX-like tags** from a fixed catalog (`box`, `row`, `grid`, `title`, `text`, `badge`, …). String props are `"lg"`. Expression props are `{expr}`. Booleans can be bare (`border`). Tags can self-close.
- **Statements and control.** `{@body …}` is JavaScript (state, derived values). `{expr}` interpolates. `{#if}` / `{:else}` / `{#each}` branch and repeat. Event handlers and `GenUI.*` actions call the host.

The model does not write React, HTML pages, or a typed slot tree.

## How Markdown and components become one tree

The server compiles the whole document into one element tree. A Markdown heading becomes a `title` node. A paragraph becomes a `text` node. `**monthly price**` becomes a `bold` child inside that `text`. Those nodes are siblings of `box` / `row` / `slider` in the same parent. The captured render ops show this directly: `title` and `text` are placed under the root next to `box`, and the bold word is a child of `text`, not a separate string field on a card.

Static strings are lifted into a constants table (`model_dil_v2.constants`) so the program can keep stable indexes while text grows. That split exists for streaming. The tree shape does not: text is still a node.

## What the catalog owns

The catalog is the only thing the renderer will draw. Unknown component types are refused. Unknown or ill-typed props are dropped at compile time (`unknown_prop`, `invalid_literal` in the OpenUI capture).

From the captured response, the layout and text tags the model actually used most are `text` (64), `box` (54), `row` (35), `icon`, `title`, `grid` / `grid-item`, `badge`, `divider`, `caption`. `card` appears in the compiled output via a chart shim. Host widgets (images, cites, product cards) are a second list, resolved by id, not drawn from raw HTML.

Markdown owns the words: prose, emphasis, lists. The catalog owns containers, connectors, and controls. Design tokens (`padding={3}`, `size="lg"`, `background="surface-secondary"`) are the styling vocabulary. Raw CSS is the exception, not the rule.

OpenAI's own description matches this split: a library of native components plus a compiler, so the model chooses how pieces fit together inside a familiar design foundation.

## Compile, then render

ChatGPT's full path is:

1. Model writes DIL.
2. Server recompiles the whole buffer every few hundred milliseconds into a JS program plus constants, fallback Markdown, and diagnostics.
3. A sandboxed Worker (no DOM) evaluates the program with a small React-like runtime and emits render operations.
4. The page applies those operations to native components. Interaction runs in the worker. No extra model call.

Streaming is why the compiler cuts incomplete tags, auto-closes open elements, and keeps `recoveryDiagnostics`. The ANALYSIS capture counted 338 recovery patches against 134 full code replacements. That repair exists so a half-written program can still run.

## What Garden drops (and what play now keeps)

Garden posts are one-shot HTML (no stream). These ChatGPT pieces stay out:

- Stream cuts, auto-close, and `recoveryDiagnostics`. An unclosed tag is an error.
- The Worker sandbox, render-op protocol, and view-state round trip. Play uses the whitelist expression interpreter instead of `eval` in a Worker.
- Server-resolved host widgets (`AsyncImage`, `Cite`, `Entity`) and `AppBlock` HTML apps (still out of tip scope).
- A constants table. Nothing is streaming, so text stays in the node.

Play mode on `garden compose` **keeps the ChatGPT DIL author surface**: `{@body}`, `{expr}`, `{#if}` / `{#each}`, and lowercase controls (`slider`, `button`, `choice`, `chart` / `pie`). See [compose-dil.md](./compose-dil.md) for the locked mapping. `{@body}` is a restricted subset (`DIL.useState` and `const name = expr`), not arbitrary JavaScript.

## What stays the same in principle

- Leaves are Markdown, compiled into the same tree as components. A heading is a title node. A paragraph is a text node. Bold is inline structure, not a YAML string slot.
- Composition is catalog tags (`box`, `row`, `stack`, `grid`, plus the diagram connectors `arrow`, `fan`, `join`, `lanes`, `divider`, `pill`, `band`).
- The renderer draws only those tags. It does not accept arbitrary HTML or scripts.
- Color and surface come from the host design tokens. For Garden that host is the Claude blog theme: page surface `--paper` (`#faf9f5` in light), ink `--ink`. The diagram frame uses that surface. It does not invent a second off-white card fill.

Authors still type one plain sentence in a `garden compose` fence. The compile step writes `<intent>` plus the markup. Authors do not write style directions, and they do not write `title:` / `text:` YAML slots.
