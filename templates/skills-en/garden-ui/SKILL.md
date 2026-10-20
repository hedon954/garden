---
name: garden-ui
description: >-
  Compiles the `garden` idea blocks in one Garden post into garden components
  (garden interactive, or card / stat / compare / ... , or prose, or garden
  html), fixes broken garden interactive blocks, and suggests where a post could
  use interaction. Older intent / ui blocks are handled the same way. Use when
  the user says compile this post / compile ideas / recompile <id> / where could
  this post use interaction, or pastes a garden ui check fix prompt.
---

# Compile Garden interactive blocks

The author writes a one-sentence idea in an unnamed `garden` fence. This skill turns it into `garden interactive` or another `garden` component. The interactive components and design rules are in the output of `npx garden ui prompt`. The purpose and examples of the 12 `garden` components are in `node_modules/hd-garden/templates/garden-blocks.md` (in the engine repo, `templates/garden-blocks.md`). Treat those two as the source of truth; never write components from memory.

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

   stdout is JSON. `lang` is `garden-idea` (an idea), `garden-interactive`, or the older `intent` / `ui`. Each block has `lang`, `id`, `status`, `startLine`, `hash` (hash of the whole fence, used as `--base` on write-back), `intentHash` (hash of the author's words), `intent` (the author's words), `caption`, `section` (the heading it sits under) and `diagnostics`. Do not find fences yourself with regular expressions.

2. Read the rules:

   ```bash
   npx garden ui prompt
   ```

   It contains the component catalog, recipes and design rules. Follow the recipe skeletons; do not invent components or properties that are not in the catalog.

3. For each block, read the author's words and its section, then pick one:
   - **Write it back as prose**: when a sentence, a table or a Mermaid diagram says it clearly.
   - **Write `garden interactive`**: when the reader needs to drag, click or step through it to understand.
   - **Write a `diff`**: when the idea follows a complete code block and is about "what changed since the last version". Write the diff the words describe as plain Markdown (just this one `diff` fence). Once written back it sits right after that code, and the page turns them into a "code / compare with previous" toggle. New lines in the diff must match the complete code above.
   - **Write another `garden` component**: one or more resource cards (`card` / `cards`), a few metrics (`stat`), two approaches side by side or a good/bad comparison (`compare` / `verdict: good|bad`), a timeline (`timeline`), a static chart (`chart`), a labelled structure diagram (`figure`), a downloadable file (`file`), a relationship diagram of 3–6 elements (`relations`), a compact icon list or step list (`list`), or a choice card with two or three options (`choice`). Fields and validation rules are in `npx garden ui prompt` and `templates/garden-blocks.md`.
   - **Write `garden html`**: canvas animation, audio, physics simulations and anything else the catalog cannot express. Write the HTML in the same-name directory following [garden-interactive-chart](../garden-interactive-chart/SKILL.md), and put the claim in `title`.

4. When writing `garden interactive`:
   - Format: the fence header is `garden interactive #<id>`. Above `---` go `caption`, `intent` and an optional `expect`; below `---` goes the component tree from `npx garden ui prompt`.
   - Put the author's words into `intent` verbatim; do not change a single character.
   - `caption` takes the claim from the author's words. If there is no claim, write one from the section and say so in your reply.
   - Known points in the words ("512 MiB at batch 1") go into `expect`.
   - Data lives in the block. Use `Data` references only when the words mention a data file that already exists in the same-name directory.
   - If a block gets too big, split it into two, each placed next to the paragraph it explains. Do not move it to another file.

5. Write each block back with `apply`, passing the new content on standard input:

   ````bash
   npx garden ui apply content/posts/path.md --id <id> --base <hash> <<'GARDEN_UI'
   ```garden interactive #id
   caption: ...
   intent: |
     ...
   ---
   ...
   ```
   GARDEN_UI
   ````

   - Idea blocks have no id; locate them with `--intent-hash <intentHash>`, or `--at <startLine>` when the words repeat.
   - The new content can be one `garden` component fence (interactive, card, stat, …) or plain Markdown (when writing it back as prose). Old `ui` blocks may also be written back in their original format.
   - The new content must not contain any uncompiled ideas.
   - On success stdout is `{"ok":true,...}`. On failure stderr is JSON; act on `code`:
     - `apply-invalid`: the new content failed validation. Fix it from `diagnostics` and write again.
     - `apply-base`: the block changed after the scan. Run `scan` again and use the new `hash`.
     - `apply-not-found` / `apply-ambiguous`: the block was not found or not unique. Run `scan` again and locate it another way.
   - Line numbers shift after each write-back, so run `scan` again before the next block.

6. When everything is written:

   ```bash
   npx garden ui check content/posts/path.md
   npx garden check content/posts/path.md
   ```

   The first is the pre-commit check and must pass; the second must report `ok` true. If the same block fails three times in a row, stop and report the diagnostics to the user as they are.

7. Reply with a table:

   | id | choice | recipe | assumptions | expect |
   | --- | --- | --- | --- | --- |
   | kv-memory | garden interactive | param bench | default sequence is 4K | 512 MiB at batch 1 |

   "Assumptions" lists what the author's words did not say and you decided for them (defaults, ranges, an added caption). Write "none" if there are none.

## Don't

- Edit the post file directly. The post changes only through `apply`; HTML files referenced by `garden html` may be created directly.
- Invent numbers the author did not give. If a number is needed and missing, compute it from a formula in the words or ask the author.
- Use remote URLs (images, scripts, data).
- Change prose outside the target blocks.

## Suggestion mode: where could this post use interaction

Read-only; do not edit the post. Run `npx garden ui prompt` to read the design rules, then read the whole post and pick paragraphs that plain text or a static image cannot explain well:

- A formula or numbers that change with parameters (param bench, converter)
- A multi-step process (stepper, flow)
- The difference between two approaches (comparison)
- A set of cells, bytes or a memory layout (grid)

For each, give: the section, why text is not enough, and a draft `garden` idea block that can be pasted right after that paragraph. The draft says only what the reader does and sees, plus numbers already in the post; do not name components. Five at most; if none fit, say so.
