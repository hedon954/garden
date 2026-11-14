# Changelog

## 0.14.13

- Make `file:../garden` and npm `hd-garden` share one Vinext overlay: runtime now links `ui/` (and `scripts/`, `docs/`), Vite `server.fs.allow` includes the engine package, and `?raw` title runtimes load in both layouts.
- Pin the Vite cache under `.garden/runtime/.vite` (next to the overlay `node_modules`), prebundle known markdown/react deps, ignore media/test/editor trees, recycle workerd children on `garden dev` replacement, and skip link-asset fetches when no Markdown changed.
- Keep list routes on metadata-only `generated-content.ts`; post and handbook bodies live in separate modules so the homepage does not parse every article. A later `garden sync` / Vite start rewrites the body modules even when an older `generated-content.ts` is already on disk.
- Default `garden dev` to Node RSC preview; pass `--worker` for the Cloudflare workerd path used by Admin.
- Render single-line YouTube and Bilibili links as in-article players, and print a canonical URL from `make embed` for pasting.
- Vertically align Compose row icons with the first line of text.
- Ship matching Garden 0.14.13 Cursor / VS Code VSIX and Typora ZIP.

## 0.14.12

This is an editor release. Garden’s rendering engine and authoring format are unchanged.

- In Typora, `/garden` lists recognizable graphic types with a short use-case and a schematic, plus Other when no built-in type fits and the author needs to combine text and graphics freely.
- Choosing an item replaces the typed `/garden` query with a unified `garden compose` block that already holds the recommended prompt; authors do not copy a snippet or learn a new fence language.
- When the caret is near the bottom of the window, the list opens upward, keeps a readable width inside the viewport, and scrolls inside the menu.
- Enter on the `/garden` command hint completes `/garden` and immediately shows the diagram list, so the next choice can insert the compose block. IME confirmation, Tab, click and cancel stay on their existing paths.
- Ship matching Garden 0.14.12 Cursor / VS Code VSIX and Typora ZIP.

## 0.14.8

- Keep closing punctuation with inline math, and contain long inline formulas in local scroll viewports without widening the article.
- Fit complete featured article titles to one line above a readable, summary-relative font-size floor; wrap only when the minimum is reached, without splitting or truncating titles.
- Follow the current reading ancestry in the contents outline, with explicit expand-all/manual overrides, clear heading hierarchy, compact 40px mobile rows and the persistent 44px header entry.
- Use actual scrollbar-adjusted viewports, wait for client hydration before mutating neutral fixtures, bound test concurrency, and keep neutral contents regressions independent of optional live Webmention services, and ship matching Garden 0.14.8 Cursor / VS Code VSIX and Typora ZIP.

## 0.14.7

- Remove the Thoughts content feature end to end: public routes, navigation, discovery/feed/search integration, schemas, configuration, templates, author guidance and Admin management. Removed routes return 404, without compatibility redirects. Ordinary articles, book notes and Compose notes remain supported; historical Git records are not rewritten.
- Align the bundled Admin with current unified Compose contracts: include all ten model recipes, evaluate parsed native/interactive components, preserve manuscript bytes when changing pinned state, distinguish same-name attachments from articles and retain separate paths for identical-source book notes.
- Restore dynamic authenticated draft routes, share Markdown/HTML media rewriting with publication, constrain preview data paths, support authenticated audio/video assets and load the documented local Admin environment file.
- Ship matching Garden 0.14.7 Cursor / VS Code VSIX and Typora ZIP. Author skill sources and the 0.14.6 persistent mobile contents behavior are unchanged.

Validation: 750 automated tests, 736 passed and 14 skipped; complete authenticated Admin UI interaction has not been verified. The author will validate that workflow after publication. Existing TypeScript diagnostics remain a baseline, not a clean typecheck claim. Admin body preview is not a replacement for the full site/attachment build, and publishing npm alone does not deploy a separately hosted Admin service.

## 0.14.6

- Restore mobile contents access throughout long articles using one 44px control in the existing sticky site header, without floating over prose or duplicating the article-start entry.
- Preserve chapter selection, current-section visibility, destination focus, Escape/Tab navigation, no-JavaScript links and safe-area spacing; retain desktop sticky contents and independent fullscreen Escape behavior.
- Add full-theme long-reading regressions at 300/344/375/430 CSS pixels, header-breakpoint and desktop widths, including normal client navigation, middle/end access, chapter jumps, keyboard interaction and no-JavaScript operation.
- Ship matching Garden 0.14.6 Cursor / VS Code VSIX and Typora ZIP. Compose behavior, author skills, article content and site configuration are unchanged.

## 0.14.5

The first npm release of this rendering and authoring-quality batch. The immutable `v0.14.4` tag remains at its original commit and was not published to npm: its Linux browser gate incorrectly compared content width with the outer window instead of the actual scrollbar-adjusted viewport. This release corrects that assertion, adds reserved-scrollbar coverage on overlay-scrollbar hosts, and retains strict page-overflow and interaction checks.

- Keep explicit row justification independent of cross-axis alignment, and size title/badge leaves to their content instead of forcing full-width rows.
- Prioritize usable article width, remove duplicate host padding, wrap long site names naturally, and keep mobile contents navigation out of the reading area. Do not shrink prose to fit.
- Mount isolated sandboxes only with their complete prepared document, preserving normal client Links, re-entry, history and direct-link interaction without reloads, polling, or relaxed sandbox permissions.
- Keep default backgrounds transparent while retaining intentional borders and explicit fills; fullscreen uses an independent readable paper surface.
- Keep pie legends and original values in normal flow so wrapped labels cannot overlap captions. Reuse measured straight, elbow and dashed connector recipes with readable, keyboard-scrollable local spatial canvases; no automatic graph layout or obstacle avoidance is claimed.
- Ship equivalent concise Chinese/English author routes, source-derived component guidance, and final exported HTML/CSS/JS/asset validation with real full-theme navigation, no-JavaScript, narrow-viewport and resize regressions.
- Ship matching Garden 0.14.5 VS Code / Cursor VSIX and Typora ZIP in both npm and GitHub Release assets, with shared runtime/CSS and complete author-reference integrity checks.

## 0.14.3

- Route author effects to recommended Compose layouts, with demand-loaded recipes, internal geometry constraints, frame-layer guidance and safe whole-fence micro-edits.
- Prefer mobile reading tasks before local decoration: responsive short flows, vertical long sequences, real prose lists, icon rails and equal cards, preserving original source content.
- Add opt-in structural layout lint using the authoritative parser, including responsive top-level flow guards without banning local icon/title rows; default checks remain compatible.
- Separate parser, source-fidelity, browser geometry and whole-scene reading evidence. Multi-line centered icon/title chips remain browser-verified candidates, not a guarantee of mobile optical alignment.
- Ship the matching Garden 0.14.3 VS Code / Cursor VSIX with the existing Garden brand icon; no runtime component API or Marketplace publication changes.

## 0.14.2

- Allow omitted, null, empty and whitespace-only post descriptions; omit empty article decks, archive summaries and draft-preview paragraphs without fabricating a body excerpt. Keep invalid description types as preflight errors.
- Keep the Garden VS Code / Cursor extension version and lockfile synchronized with Garden releases, validate release tags and package versions, and ship the matching VSIX inside the npm package (not a Marketplace publication).
- Reuse Garden’s existing brand icon from `public/apple-touch-icon.png` in the extension, with byte-for-byte packaging checks and no separate generated logo.
- Fix the Compose editor preview options TypeScript error and retain strict structural preflight and bilingual handbook diagnostics with optional descriptions.

## 0.14.1

The first published release of the 0.14 Compose unification batch. The immutable `v0.14.0` tag was not published to npm because its CI tests failed.

- Make browser release gates wait for real hydration and isolated sandbox readiness with bounded timeouts, retaining all behavior assertions.
- Build the standalone preview into test-owned output so browser tests also pass on a clean checkout without prebuilt local artifacts.

### Breaking

- Make `garden compose` the single author entry for static content and Play: migrate shipped examples and remove deprecated named fences, PascalCase author compatibility, obsolete adapters and catalog guidance. Existing sites must migrate old author syntax before upgrading.

### Added

- Compose semantic scenes for resources, metrics, timelines, relationships, choices, icon lists, charts, files and comparisons, including isolated sandbox and Play rendering.
- Shared Markdown and safe HTML content, article-inherited typography, explicit frameless layouts, source-derived rendering references and a unified bilingual Compose skill kit with visual-selection and composition recipes.
- VS Code / Cursor Garden block folding commands and native Markdown gutter folding.
- Strict draft and published-content preflight, concise actionable diagnostics, and `make check diff` for changed documents.

### Fixed

- Preserve literal code and comparison text, semantic source metadata, file validation and export behavior across Compose rendering paths.
- Keep shared article rendering browser-safe, avoiding the PostCSS default-export preview failure; align list spacing and heading hierarchy with article prose.
- Refresh link metadata incrementally during development, preserve usable caches on failures, and store generated metadata in ignored Garden caches reusable by deployment.

## 0.13.3

- Safely replace a verified same-runtime Vinext dev process on repeated `garden dev`; serialize concurrent starts and refuse unproven process ownership instead of killing arbitrary port owners.
- Watch Markdown creation/change/deletion, invalidate generated imports before browser reload, and preserve last-good preview assets through invalid saves. Avoid rewriting unchanged generated output.
- Render body headings and desktop/mobile TOC literally, without automatic numbering or extracting author-written numbers; preserve existing heading anchors and inline markup.
- Require double tildes for strikethrough: ranges such as `4~6` and `7~8` stay literal while `~~text~~` remains supported.

## 0.13.2

- `garden dev` previews drafts and future scheduled posts by default; explicit `CONTENT_INCLUDE_DRAFTS=0` opts out. Initial sync and watcher inherit the setting; production commands remain draft-safe by default.
- New-site templates and authoring instructions document plain `make dev`; regression tests cover preview-to-public regeneration.

## 0.13.1

### Fixed

- Handbook reference sidebar: pages that share a `COMPONENT_BADGE` (compose + compose-icons) keep the code pill and append the `navTitle` remainder after a separator (` 图标` / ` icons`), so ZH/EN no longer show two identical `compose` entries.
- Sidebar labels prefer authored `navTitle` (ZH and EN).
- Official chart-example links on the compose reference pages use `#ui-compose-chart-active-hours` (play root DOM id prefix `ui-`), matching `ui/react/index.tsx`.

## 0.13.0

### Added

- Chart foundation for play/DIL: `palette` (`series`|`categorical`), `yStep`, `overflow` (`expand`|`clip`), `legend` (`auto`|`show`|`hide`), `legendPosition` (`top`|`bottom`).
- Series colors bind Claude `--gui-info` / `--gui-cat-*` (not paper `--blue`).
- Block header `frame: none` for frameless chart hosts; stack `justify="between"` for title/badge rows.
- Official compose handbook examples (ZH/EN): static active-hours eight bars + interactive fusion weights (default 45%).
- Prompt/catalog props document `palette`, `yStep`, `overflow`, `legend`, `legendPosition`.

### Fixed

- Chart bars no longer paint near-black from Claude paper `--blue`.
- Axis ticks honor explicit `yStep`; domain expansion vs clip via `overflow`.
- Single-series legend authorable with `legend="show"`.

## 0.12.1

Author-facing surfaces catch up to the 0.12 compose DIL engine. `garden ui prompt` now injects a generated compose catalog (lowercase tags + tokens + icon count) beside the interactive PascalCase reference; rules and the compose recipe stop forbidding `{@body}` and document play on the same fence. `garden-ui` skills (ZH/EN), CLI fix-prompt locale, and `garden-blocks` no longer tell authors to fill YAML trees for compose. VS Code / Typora editor packages rebuild at `0.1.1` so shipped `editors/dist` matches. Publish as `hd-garden@0.12.1`.

## 0.12.0

`garden compose` DIL rewrite: Markdown leaves plus lowercase catalog tags (`row` / `box` / `icon` / `text` / …), Claude paper tokens, and ~690 Lucide icons. Handbook usage stays short; reference pages list all tags in groups and icons as a searchable glyph grid. Compare scenes (including 近四日 / 最近 7 天 push frequency) stretch day chips across the full banner; phrasing leaves keep footnote markers like `* 假设…`. Publish as `hd-garden@0.12.0`. Independent sites bump `hd-garden` (for example garden-blog) after the npm tag lands.

## 0.11.0

`garden compose` is an explanation diagram: a YAML tree of cards, arrows, badges, and notes, rendered to static HTML at build time. The fence starts as one sentence and stays `garden compose` after compile. Light and dark both use the existing theme tokens, and a narrow screen stacks the diagram into one column. Clicking a step shows its note without a runtime. Compose now compiles Markdown leaves and catalog tags into one static tree, the same split ChatGPT uses for DIL, without streaming or a script sandbox. The handbook still teaches the idea sentence, then shows the seven capability diagrams. The diagram frame uses the page paper color. The `garden figure` component is gone: fences, the renderer, the picker, and the handbook page. Publish as `hd-garden@0.11.0`. Independent sites bump `hd-garden` (for example garden-blog) after the npm tag lands.

## 0.10.4

Ship the VS Code / Cursor and Typora Intelligent UI plugins inside `hd-garden`. `garden init` and the first `garden sync` copy them into `.garden/editors/` and, on a TTY, ask before installing. `garden editors install` (`--vscode`, `--typora`, `--yes`) installs them later. In Typora, `/` offers `/garden`, then a thumbnail picker. Insert paths paste a plain `garden` brief for the `garden-ui` skill.

0.10.3 is already published from main. That release is the Excalidraw inline SVG work below, not this plugin kit.

## 0.10.3

Markdown images that point at `.excalidraw` export one light flat SVG with a transparent canvas. The build inlines that SVG in the article so the figure text can be selected. Readers do not load Excalidraw.

## 0.10.2

Same-site and external jump links share one link-card pipeline (bare URL paragraphs and `{card}`). Build marks standalone jump URLs as cards and follows HTML meta refresh when fetching OG. Pathname `/og.png` is never used as a card cover. Blog/column pages without a cover use twitter `summary` and omit the brand `/og.png` fallback. Site `public/og.png` refreshed (1200×630) with updated layout/handbook OG alt.

## 0.10.1

List pages share one PageIntro (eyebrow, title, deck). Primary nav drops 标签; `/tags/` stays. Blog and column articles share PostReadingView: classic title, 约N字 meta, and the v0.10.0 sticky TOC. A column article adds a desktop SeriesEdgeNav of that column only.

## 0.10.0

Restore the pre-bookshelf engine. The source tree matches tag [`v0.8.4`](https://github.com/hedon954/garden/releases/tag/v0.8.4) (commit `41964cba`), except this version and this note. This is not a republish of 0.8.4.

The bookshelf added in 0.9.0–0.9.4 is removed: `/bookshelf` routes, shelf components, catalog and demo data, navigation entries, handbook sections, sample notes and covers, and bookshelf tests.
