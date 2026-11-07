---
name: garden-compose
description: Select, compose and validate suitable Garden Compose visuals from source content; use for visualization suggestions, choosing a diagram when no form is specified, implementing requested effects, and compiling or repairing static diagrams and interactive DIL.
---
# Garden Compose

Project-local only. Change only authorized posts/blocks; never publish or silently rewrite unrelated content.

## Select a representation from content
1. Separate source content, the reader's question, any requested effect and the authorized edit location. The effect request is not display copy. Suggestion-only requests produce candidate forms and reasons, not edits; implement only when drawing/editing is authorized.
2. Extract entities, peer categories, explicit sequence, containment, interacting parties, comparison dimensions, numbers and formulas. Distinguish stated relations from inference. Preserve wording, facts and order; map existing bold labels to titles and remaining text to bodies without adding summaries or conclusions.
3. Honor a specified effect first. Otherwise read `references/visual-selection.md` on demand and choose the simplest supported form that answers the reader's question. Do not invent arrows, causation, stages or values. Keep ordinary prose/lists when drawing adds no explanatory value.
4. Read `references/composition-patterns.md` to decompose the form into containers, content leaves, repeated units and justified connectors; compose around the content instead of copying a rigid whole-diagram template. Typical forms are evolving experience, not a whitelist. If none fits, derive the source relations, inspect the primitive inventory/operations in that reference and relevant live capabilities, construct a new combination and validate it. A missing recipe is not an unsupported capability; only actual engine limits establish that boundary. Read the relevant section of `references/layout-recipes.md` for equal cards or icon-led editorial lists.
5. Choose Play only when varying an input is useful and source formulas/data exist. Check `references/static-play.md`; do not freely mix static and Play tags. For ambiguous relations, use neutral grouping or identify the uncertainty rather than guessing.
6. For an unfamiliar combination or a reference-image match, read `references/rendering-model.md` on demand. Derive shared boundaries and container hierarchy first, then verify width allocation, defaults, nesting, inheritance and complete-theme rendering. The icon rail and shared right-hand text column are taught in `references/layout-recipes.md`.
7. Audit against the source: account for every fact, justify every connector, separate decoration from topology and avoid information loss through shortening/clipping. Then follow scan/apply/check below. Consult the catalog only for uncertain components/props, not every reference up front. Passing checks is not browser verification.

For reusable combinations discovered in practice, prepare candidates using the maintenance protocol in `references/composition-patterns.md`. Skill maintenance requires normal authorization/review; never self-edit skills while processing an article.

## Workflow
1. Work from the site root. Read references/workflow.md and references/static-play.md. When an attribute is unclear, consult the relevant reference or `npx --no-install garden ui prompt` for the live catalog. Compose authoring uses lowercase tags, not legacy PascalCase or YAML slots.
2. If no fence exists, insert one idea fence with the verbatim source and effect in `<intent>` at the authorized location, then scan; leave other prose untouched. For an existing block, scan directly. Run `node .agents/skills/garden-compose/scripts/scan.mjs content/posts/post.md`. Keep the original block, diagnostics, id/line and hash. Leave healthy compiled blocks alone. Requests for suggestions are read-only.
3. Run `node .agents/skills/garden-compose/scripts/check.mjs content/posts/post.md`. On failure, use the printed file/line/error diagnostics; scan the target for source and hash before repair. No prompt file, clipboard operation, or model call occurs by default. Draft and published posts follow identical strict rules. Compilation/repair is not indentation formatting.
4. Consult references/colors.md, references/frames.md and references/examples.md as needed. Preserve facts, intent and existing ids; produce one complete `garden compose` fence. Use lowercase catalog tags; state, expressions and control flow belong to Play. Never invent props/icons/data or inject arbitrary HTML/CSS/JS. Explain unsupported features rather than silently switching to html/widget.
5. Save the candidate in a temporary Markdown file. Use scripts/apply.mjs with `--id` if present, otherwise the scanned `--at` line; always provide the scanned `--base` hash and `--file`. An anonymous malformed block has no usable `intent-hash: null`. If the source changed, rescan instead of removing concurrency protection. Apply really writes the post and has no dry-run flag.
6. Run scripts/check.mjs again; use `--all` when site-wide validation is warranted. Report success only after passing. Validation is not browser/visual verification.

Wrappers delegate to the authoritative CLI, never duplicate parsers or download packages:
- scripts/scan.mjs → garden ui scan
- scripts/check.mjs → garden ui check --no-copy
- scripts/prompt.mjs → garden ui prompt
- scripts/apply.mjs → garden ui apply (writes only an authorized target)

The shared references are bilingual and ship recursively with the kit. If local Garden is missing, report the dependency gap instead of installing a different engine version.
