# Changelog

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
