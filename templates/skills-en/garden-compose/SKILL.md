---
name: garden-compose
description: "Compose and verify Garden article layouts, Markdown/safe HTML, semantic scenes and necessary interactions through the single garden compose author entry."
---
# Garden Compose

Project-local skill. Edit only the authorized post/block; no automatic edits elsewhere, global installation, commits or publishing.

## Choose relationships before components
1. Separate original facts/prose, reader question, requested appearance and authorized location. Advice-only means no file writes. Preserve wording, order, complete paragraphs, data and resources. Do not invent arrows, causal links, summaries or numbers.
2. Use **one `garden compose` author entry**. Select and combine layouts, Markdown/safe HTML, semantic scenes and necessary interaction inside it. Use ordinary prose when that already communicates the idea.
3. Work relationship → shared boundaries/hierarchy → width/flow/alignment → style → actual render. Demand-load `references/visual-selection.md` and `references/composition-patterns.md`; unfamiliar combinations or visual references require `references/rendering-model.md`, then `references/layout-recipes.md` as needed. These are transferable operations, not a closed pattern whitelist. A heading and every body paragraph need one shared container to form an aligned right column.
4. Native resources/files/relations/rich choices and parameter-driven explanations all live inside Compose. Read `references/static-play.md` before choosing state; interaction must improve understanding. A missing recipe is not proof of a missing engine capability.

## Execute and verify
1. Read references/workflow.md from the site root. Run `node .agents/skills/garden-compose/scripts/scan.mjs content/posts/post.md`; retain source, diagnostics, target id/line and original whole-fence hash. Do not redraw correct blocks.
2. `npx --no-install garden ui schema` is the demand-loaded source of actual fields, props/defaults, child contracts and icon names. Use `garden ui prompt` for working recipes. Save JSON under `.garden` and inspect only the needed components/icons. Some unsupported static layout attributes are ignored: inspect normalized output and actual styles, not acceptance alone.
3. If no fence exists, insert one Compose intent block only at the authorized location, preserving prose and appearance requirements, then scan. Insertion is not apply; uncompiled intent is not a finished scene. Every candidate remains a complete `garden compose` fence, preserving original intent without rendering prose twice.
4. Inline leaves accept Markdown and safe inline HTML. Use markdown/html islands for full article blocks. Allowlisted article HTML and local CSS are useful, but scripts/events/unsafe URLs are errors. Intentional executable demos use sandbox within Compose. Read `references/static-play.md` for literal-island versus restricted DIL expression boundaries; advertise neither unrestricted HTML/JS nor zero Markdown/HTML support.
5. Body defaults inherit the **actual dynamic article** font family/size; do not invent a universal pixel baseline or shrink-to-fit. Use supported explicit variation for meaningful emphasis. Semantic values, graph labels, captions and controls retain their hierarchy; consult rendering-model for contextual source/computed sizes. Load colors/frames/examples only as needed.
6. Store the complete candidate in temporary Markdown, then use scripts/apply.mjs: --id or scanned --at, always original whole-fence --base and candidate --file. Rescan if content changed; never remove conflict protection or target a null intent hash.
7. Run scripts/check.mjs and garden check for real file paths. Match visuals using complete theme/CSS order, desktop+narrow screenshots, geometry and actual interactions. Separately report accepted markup, successful render, correct geometry/interactions and independently tested model reliability. Hand-authored passing DIL proves capability, not prompt reliability; disclose missing browser/model trials.

Scripts only delegate to the installed CLI; no parser duplication, package downloads, default model calls or clipboard writes. Report missing local dependencies rather than installing another version. Propose reusable skill improvements for normal review; do not modify skills while processing an article.
