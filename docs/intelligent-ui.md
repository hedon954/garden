# Compose writing and rendering architecture

All article components use a single `garden compose` fence. Inside it, authors combine layout, prose, semantic content and interactive scenes. Ordinary Markdown outside the fence remains ordinary Markdown.

## Operational source of truth

- Read [the Compose reference](handbook/reference/compose.md) for hierarchy, alignment, typography, safe content and verification.
- `npx garden ui schema` generates contracts from the installed validators, component defaults, icon catalog and actual stylesheet declarations. Inspect only the components required for a particular scene.
- `npx garden ui prompt` supplies executable author-facing examples. The gallery and editor previews use the same Compose parser and rendering components as the site.
- `npx garden ui scan <post>` reports blocks and their source hashes. Use `npx garden ui apply <post> --id <id> --base <hash> --file <replacement>` to replace just the intended fence. Without an id use the scanned line with `--at`.
- `npx garden ui check <post>` checks Compose, including uncompiled requests in drafts. `npx garden check <post>` also checks article structure and resources. Passing syntax checks is not proof of visual correctness.

## Content and hierarchy

First identify relationships and shared alignment lines. Build the containment tree before choosing visual styles. For an editorial icon list, each row has a small icon and one shared right-hand text container; the heading and every paragraph belong in that container. Put separators between rows, not inside the prose. Verify the rendered heading/body x-coordinates and narrow-screen wrapping.

Static layout and semantic scenes use validated Compose tags. Markdown and safe HTML islands use the ordinary article content pipeline with an explicit allowlist. Native semantic scenes preserve their own fields and interactions rather than pretending to be generic HTML. Dynamic scenes use the same lowercase author tags plus `{@body}`, expression interpolation and `#if`/`#each`; PascalCase is an internal compiler target, not an author entrypoint.

Executable demonstrations belong in an isolated sandbox component, never an unrestricted HTML island. Unsupported content produces diagnostics; do not silently remove facts, resources or essential interaction to make a check pass.

## Rendering boundaries

`ui/compose` handles author contracts, layout and semantic lowering. `ui/core` implements the internal interactive IR, expression evaluator, validation and snapshots. `app/components/garden/GardenBlock` supplies real site renderers, including native semantic scenes and sandbox hosts. `ui/preview` packages the same hosts for editor and standalone previews. Node-only resource loading and stylesheet inspection stay in CLI/build modules; client imports must not reach PostCSS or filesystem modules.

Body text inherits the configured article family and size. Captions, headings and controls retain meaningful semantic sizes; explicit supported overrides remain intentional choices. Source CSS declarations are contextual evidence, not universal computed sizes. Test the actual theme and stylesheet order at desktop and narrow widths.

## Verification

Check parsing, normalization and diagnostics first; then inspect static output, hydrate the real renderer, and exercise interactions. Confirm links, resources, safe HTML behavior, body typography and geometry under the complete article theme. A hand-authored scene passing these checks does not establish independent model prompt reliability.
