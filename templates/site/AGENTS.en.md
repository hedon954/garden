# Garden site: AI writing entry point

This is a Garden content site, not the engine repository. Read existing posts and
project skills before editing. This guide is a map, not a duplicated catalog.

## Content and site model

- `content/posts/`: long-form UTF-8 Markdown; retain existing folders and naming.
- `content/columns.yaml`: column organization and references to existing articles,
  not another place to duplicate their prose.
- `site.config.yaml`: site identity, author, page copy, navigation and settings.
- The engine supplies home, blog, columns, about and handbook layouts
  and routes. Do not copy application code, hardcode routes or invent settings.
- Posts normally require `title`, `date` and `description`. Filenames participate
  in identity; do not add a `slug` field. Check examples and the writing handbook
  for optional fields and writing syntax instead of guessing.
- `draft: true` and future `publishAt` control public inclusion; development
  previews include drafts by default. Drafts still obey strict component checks.

## Choose the project skill

- Original prose plus an effect request (for example, “use garden compose for
  horizontal equal-width cards”) is enough: load the Compose skill automatically,
  consult relevant layout guidance and implement/check without asking for technical steps.
- For diagrams, side-by-side cards, adjustable parameters and Compose repair,
  read `.agents/skills/garden-compose/SKILL.md`; load its references on demand.
  Use its scripts or the authoritative CLI to locate, validate and replace one
  block. Do not implement another parser.
- For article review and structural errors, read
  `.agents/skills/garden-post-review/SKILL.md` and respect its edit boundaries.
- Use reported files, lines and diagnostic codes. Do not dump article bodies,
  catalogs, recipes or skill instructions into the terminal/chat or export a
  large prompt by default.
- If skills are missing, explain first. `npx --no-install garden skill` installs
  project skills but updates managed files; confirm installation/update intent.

## Writing and component boundaries

- Preserve facts, original intent and reasoning. Never invent data, sources,
  measurements or claims about supported features.
- Preserve heading text and actual hierarchy; do not auto-number sections or
  rewrite headings merely to make them look more polished.
- Prefer ordinary Markdown. Code, tables, math, Mermaid, callouts, link cards,
  attachments and Garden components serve different purposes; consult examples
  rather than implementing every request with HTML.
- Static Compose and interactive Play have different capabilities. Let the skill
  consult the catalog; identical tag names do not prove parity. Do not inject
  arbitrary styles/scripts or switch components to evade validation.
- Preserve links, further reading and attachment relationships. Do not force
  `references` to match body links one-to-one.

## Source versus generated files

- Same-name article attachment directories, `content/covers/` and user-maintained
  `public/images/` are source material. Never blanket-ignore/delete them.
- `.garden/` holds runtime data and generated caches, including image dimensions
  and link metadata.
- `public/media/` and `public/link-assets/` are generated browser assets. They
  must ship with the build but need not be routinely versioned. Historical
  tracked assets may provide offline fallback; do not blindly remove them.
- `dist/` is final output. Keep regenerable data in ignored paths, not source
  diffs. Change sources or propose an engine change, not generated output.

## Validation and delivery

- Usually run `make check diff`: changed/new Markdown only, without a full build.
- `make check` validates all content, then runs the site's existing build stages.
- Without Make, use `npx --no-install garden verify --diff` or
  `npx --no-install garden verify` for content preflight only. For one article:
  `npx --no-install garden verify content/posts/post.md`.
- Locate components with `garden ui scan` and replace blocks with `garden ui apply`;
  obtain exact arguments from the skill. `npx --no-install garden check <post.md>`
  checks article structure, not a replacement for Compose validation.
- Recheck after repair. Do not claim visual/interaction verification without
  browser evidence.
- Never automatically commit, push, publish or call a model. In particular,
  `make update` commits and pushes; it is not a validation command. Edit only
  authorized files and report remaining failures.

## Read on demand

- Start with project `README.md` and similar posts. The installed handbook is at
  `node_modules/hd-garden/docs/handbook/en/`; the site entry is `/garden/en`.
- Content and fields: `writing.md`; columns/settings: relevant handbook pages
  and existing configuration. Usage: `components/`; props: `reference/`;
  workflow: `workflow.md`.
- Run `npx --no-install garden ui prompt` only when catalog details are needed;
  read it as context, never paste the entire catalog back to the user.
