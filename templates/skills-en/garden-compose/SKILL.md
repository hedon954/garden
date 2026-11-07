---
name: garden-compose
description: Compile, repair and validate Garden Compose idea fences, static diagrams and interactive DIL; use when handing a validation prompt to an AI.
---
# Garden Compose

Project-local only. Change only authorized posts/blocks; never publish or silently rewrite unrelated content.

1. Work from the site root. Read references/workflow.md and references/static-play.md. Consult `npx --no-install garden ui prompt` for the live catalog. Compose authoring uses lowercase tags, not legacy PascalCase or YAML slots.
2. Run `node .agents/skills/garden-compose/scripts/scan.mjs content/posts/post.md`. Keep the original block, diagnostics, id/line and hash. Leave healthy compiled blocks alone. Requests for suggestions are read-only.
3. Run `node .agents/skills/garden-compose/scripts/check.mjs content/posts/post.md`. On failure, give the AI the whole `.garden/ui-fix-prompt.md`: diagnostics, raw fences and standalone rules. No model is called, and these wrappers do not access the clipboard. Draft and published posts follow identical rules. Uncompiled ideas and malformed markup fail. Compilation/repair is not indentation formatting.
4. Consult references/colors.md, references/frames.md and references/examples.md as needed. Preserve facts, intent and existing ids; produce one complete `garden compose` fence. Use lowercase catalog tags; state, expressions and control flow belong to Play. Never invent props/icons/data or inject arbitrary HTML/CSS/JS. Explain unsupported features rather than silently switching to html/widget.
5. Save the candidate in a temporary Markdown file. Use scripts/apply.mjs with `--id` if present, otherwise the scanned `--at` line; always provide the scanned `--base` hash and `--file`. An anonymous malformed block has no usable `intent-hash: null`. If the source changed, rescan instead of removing concurrency protection. Apply really writes the post and has no dry-run flag.
6. Run scripts/check.mjs again; use `--all` when site-wide validation is warranted. Report success only after passing. Validation is not browser/visual verification.

Wrappers delegate to the authoritative CLI, never duplicate parsers or download packages:
- scripts/scan.mjs → garden ui scan
- scripts/check.mjs → garden ui check --standalone --no-copy
- scripts/prompt.mjs → garden ui prompt
- scripts/apply.mjs → garden ui apply (writes only an authorized target)

The shared references are bilingual and ship recursively with the kit. If local Garden is missing, report the dependency gap instead of installing a different engine version.
