---
name: garden-ui
description: >-
  Compiles the `garden` idea blocks in one Garden post into garden components
  (garden compose DIL, or card / stat / compare / ... , or prose, or garden
  html), fixes broken garden compose blocks, and suggests where a post could
  use interaction. Older intent / ui / interactive blocks are handled the same
  way. Use when the user says compile this post / compile ideas / recompile <id>
  / where could this post use interaction, or pastes a garden ui check fix prompt.
---

# Compile Garden interactive blocks

The author writes a one-sentence idea in an unnamed `garden` fence. This skill turns it into `garden compose`, another `garden` component, or plain prose.

**`garden compose` is DIL, not YAML:** leaves are Markdown; structure is **lowercase catalog tags** + design tokens. Put the author's words in `<intent>` (or header `intent:`). The fence type stays `garden compose` for both static diagrams and tunable play. Do not invent YAML slots; do not treat interactive PascalCase as author input.

Interactive components, the compose catalog and design rules are in the output of `npx garden ui prompt`. The purpose and examples of the `garden` components are in `node_modules/hd-garden/templates/garden-blocks.md` (in the engine repo, `templates/garden-blocks.md`). Treat those two as the source of truth; never write components from memory. After an engine refresh, run `npx garden ui prompt` again before writing.

When the author commits, the pre-commit hook runs the same `npx garden ui check`. The commands you use to find blocks, write them back and self-check are the same ones that stop the author's commit.

Run every command from the site root. If no post path was given, ask only for the path; do not scan the whole repo.

## Triggers and scope

| The user says | Blocks to handle |
| --- | --- |
| Compile this post: `<path>`, compile ideas | Blocks with status `uncompiled`, `stale` or `error` |
| Recompile `<id>` | Only this block, whatever its status |
| Pastes a `garden ui check` fix prompt | The blocks listed in the prompt |
| Where could this post use interaction | Read-only suggestion mode, see the end; do not edit the post |

## Workflow

1. Scan:

   ```bash
   npx garden ui scan content/posts/path.md
   ```

   stdout is JSON. `lang` is `garden-idea` (an idea), `garden-compose`, `garden-interactive`, or the older `intent` / `ui`. Each block has `lang`, `id`, `status`, `startLine`, `hash` (hash of the whole fence, used as `--base` on write-back), `intentHash` (hash of the author's words), `intent` (the author's words), `caption`, `section` (the heading it sits under) and `diagnostics`. Do not find fences yourself with regular expressions.

2. Read the rules:

   ```bash
   npx garden ui prompt
   ```

   It contains the compose catalog (lowercase tags + tokens), the interactive PascalCase reference (compat), recipes and design rules. Follow the recipe skeletons; do not invent components or properties that are not in the catalog.

3. For each block, read the author's words and its section, then pick one:
   - **Write it back as prose**: when a sentence, a table or a Mermaid diagram says it clearly.
   - **Write `garden compose` (diagram)**: when the reader needs to see structure, relationships or emphasis. Markdown leaves + lowercase catalog tags; no YAML.
   - **Write `garden compose` (play)**: when the reader needs to drag, click or step through it to understand. Still `garden compose`; use `{@body}`, `{expr}`, `{#if}`/`{#each}` and lowercase controls (`slider`/`choice`/`button`/`stat`…). Legacy `garden interactive` + PascalCase is compat only.
   - **Write a `diff`**: when the idea follows a complete code block and is about "what changed since the last version". Write the diff the words describe as plain Markdown (just this one `diff` fence). Once written back it sits right after that code, and the page turns them into a "code / compare with previous" toggle. New lines in the diff must match the complete code above.
   - **Write another `garden` component**: one or more resource cards (`card` / `cards`), a few metrics (`stat`), two approaches side by side or a good/bad comparison (`compare` / `verdict: good|bad`), a timeline (`timeline`), a static chart (`chart`), a downloadable file (`file`), a relationship diagram of 3–6 elements (`relations`), a compact icon list or step list (`list`), or a choice card with two or three options (`choice`). Fields and validation rules are in `npx garden ui prompt` and `templates/garden-blocks.md`.
   - **Compile an existing `garden compose`**: when `lang` is `garden-compose` and `status` is `uncompiled`, keep the fence header as `garden compose`. Put the scanned sentence into `<intent>` (or header `intent:`) unchanged and write DIL (Markdown + lowercase tags; for play add `{@body}` etc.). Do not switch it to interactive, and do not write arbitrary HTML, SVG, or scripts. The recipe is the explanation-diagram section of `npx garden ui prompt`.
   - **Write `garden html`**: canvas animation, audio, physics simulations and anything else the catalog cannot express. Write the HTML in the same-name directory following [garden-interactive-chart](../garden-interactive-chart/SKILL.md), and put the claim in `title`.

4. When writing `garden compose`:
   - Format: fence header `garden compose` (optional `#<id>`); author's words in `<intent>…</intent>` or header `intent:`; static diagrams are Markdown + tag trees; play may use a `---` header with `caption` / `intent` and a body with `{@body}` plus lowercase controls.
   - Put the author's words into intent verbatim; do not change a single character.
   - Chip interiors use `gap={0}`/`gap={1}`; section stacks use `gap={2}`/`gap={3}`; full-width day rows; phrasing leaves keep a leading `*`.
   - For play: `caption` takes the claim from the author's words; known points may go into `expect` when the engine supports it.
   - Do not write color values, widths, or arbitrary HTML/SVG/scripts; icons use `<icon name="…"/>` (name must be in the catalog).
   - If a block gets too big, split it into two, each placed next to the paragraph it explains. Do not move it to another file.

5. Write each block back with `apply`, passing the new content on standard input:

   ````bash
   npx garden ui apply content/posts/path.md --id <id> --base <hash> <<'GARDEN_UI'
   ```garden compose #id
   <intent>
   ...
   </intent>
   <row gap={2}>...</row>
   ```
   GARDEN_UI
   ````

   - Idea blocks have no id; locate them with `--intent-hash <intentHash>`, or `--at <startLine>` when the words repeat.
   - The new content can be one `garden` component fence (compose, interactive, card, stat, …) or plain Markdown (when writing it back as prose). Old `ui` blocks may also be written back in their original format.
   - The new content must not contain any uncompiled ideas.
   - On success stdout is `{"ok":true,...}`. On failure stderr is JSON; act on `code`:
     - `apply-base`: the block changed after the scan. Re-`scan` and use the new `hash`.
     - `apply-invalid`: the new content failed validation; fix from `diagnostics` and retry.
     - `apply-not-found` / `apply-ambiguous`: cannot locate uniquely; re-`scan` and change how you locate it.
   - Line numbers shift after earlier write-backs; re-`scan` before each next block.

6. After every block:

   ```bash
   npx garden ui check content/posts/path.md
   npx garden check content/posts/path.md
   ```

   The first is what the pre-commit hook runs and must pass; the second must report `ok: true`. If the same block fails three times in a row, stop and report the diagnostics to the user unchanged.

7. Reply with a table:

   | id | choice | recipe | assumption | expect |
   | --- | --- | --- | --- | --- |
   | kv-memory | garden compose play | param bench | default seq 4K | 512 MiB at batch 1 |

   "assumption" is anything the words did not say that you fixed for the author (defaults, ranges, a filled-in caption). Write "none" when there is nothing.

## Forbidden

- Editing the post file directly. Posts change only through `apply`; HTML files referenced by `garden html` may be created directly.
- Inventing numbers that are not in the author's words. When a number is needed and missing, derive it from a formula in the words, or ask the author.
- Using remote URLs (images, scripts, data).
- Changing prose outside the target block.
- Writing compose as YAML slots, or forbidding legal `{@body}` / `{expr}` / `{#if}` / `{#each}` when play needs them.

## Suggestion mode: where could this post use interaction

Read-only; do not edit the post. First run `npx garden ui prompt` for the design rules, then read the whole post and pick paragraphs that prose or a pasted image cannot explain:

- formulas or numbers that change with a parameter (compose play / param bench)
- multi-step processes (stepper, flow)
- differences between two approaches (compare)
- grids, bytes or memory layouts (inspect grid)
- structural relationship diagrams (static compose DIL)

For each: the section, why prose is not enough, and a draft `garden` idea fence the author can paste after that paragraph. The draft only says what the reader should do and see, plus numbers already in the source — no component names. At most 5 places; say none if none fit.
