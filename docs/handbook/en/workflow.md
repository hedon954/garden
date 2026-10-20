---
title: Checks & Shortcuts
navTitle: Checks & Shortcuts
description: Validate posts and diagnostic codes with npx garden check, install the Git pre-commit hook, and use editor snippets and Agent skills.
section: workflow
order: 40
---

To catch YAML indentation mistakes, missing required fields, or broken local file paths before publishing, Garden ships a CLI validator, a Git pre-commit hook, snippet templates, and bundled Agent skills.

## 1. Validation Commands

Three commands check your content at different scopes:

- **Check one or more posts (`npx garden check`)**:
  ```bash
  npx garden check content/posts/my-post.md
  # Or pass multiple Markdown files at once
  npx garden check content/posts/*.md
  ```
- **Check interactive blocks and component syntax (`npx garden ui check`)**:
  ```bash
  npx garden ui check content/posts/my-post.md
  # Check staged Markdown files in Git
  npx garden ui check --staged
  # Check all Markdown files in the repository
  npx garden ui check --all
  ```
- **Sync and build the entire site (`make check`)**:
  ```bash
  make check
  ```
  In the site `Makefile`, `make check` runs `npx garden sync && npx garden build` to execute full content synchronization, component validation, and the production build.

## 2. `npx garden check` Diagnostic Codes

`npx garden check` (backed by `scripts/check-post.mjs`, `ui/garden/check.mjs`, and `ui/garden/file-paths.mjs`) reports exact line numbers, diagnostic codes, and fix suggestions:

| Code | Severity | Cause and Fix |
| :--- | :--- | :--- |
| `missing-title` / `missing-description` | Error | Front Matter is missing a non-empty `title` or `description` |
| `unexpected-slug` | Error | Front Matter includes a manual `slug` field (remove `slug`; the filename is the slug) |
| `date-format` | Error | `date` is not a valid `YYYY-MM-DD`, `YYYY-MM-DD HH:mm:ss`, or ISO timestamp with timezone |
| `missing-cover` / `missing-asset` | Error | A local file referenced by `cover`, a Markdown image, or `garden file` does not exist |
| `heading-h1` / `heading-skip` | Error | The post body uses an `#` H1 heading or skips a heading level (such as jumping from `##` to `####`) |
| `reference-heading` | Error | The post body contains a references section heading (move references to the `references` Front Matter list) |
| `callout-type` | Error | `> [!TYPE]` uses an unsupported callout type |
| `title-split` | Warning | The title contains a split delimiter with an empty left or right side |
| `diff-orphan` | Error | A `diff` code fence is not immediately preceded by a complete code block |
| `legacy-fence` | Error | Uses a legacy fence name (such as `garden:stat`, `widget`, `embed`, or `html garden`); replace with `garden <name>` |
| `garden-idea` | Error | A non-draft post still contains an uncompiled `garden` idea fence |
| `garden-name` | Error | Unknown `garden` component name (must be `card`, `stat`, `compare`, `timeline`, `chart`, `figure`, `html`, `interactive`, `file`, `relations`, `list`, or `choice`) |
| `garden-yaml` | Error | Invalid YAML syntax, wrong top-level shape, or unsupported keys inside a `garden` fence |
| `garden-relations` | Error | `garden relations` has fewer than 3 or more than 6 elements, or invalid `links` entries (use a `mermaid` flowchart for larger or branching diagrams, or `garden list` for one-pass steps) |
| `garden-file` / `file-outside` | Error | `garden file` manually sets `resolved`, is missing a valid `src` / `files`, or points outside `content/` |
| `file-large` | Warning | A local file referenced by `garden file` exceeds `5 MB` |
| `compare-long` | Error | A single side-by-side cell in `garden compare` exceeds roughly 60 characters (does not apply when `verdict` is used) |
| `interactive-trivial` / `steps-prose` | Error | `garden interactive` only computes a single multiplication, or `<Steps>` contains only prose without state changes |

## 3. Git Pre-commit Hook and Component Catalog

- **Install the pre-commit hook**: Run `npx garden hooks` to write `.git/hooks/pre-commit`, which runs `npx --no-install garden ui check --staged --quiet` on every `git commit`:
  ```bash
  npx garden hooks
  ```
- **Generate the local component catalog**: Run `npx garden ui catalog` to write a static preview page of all built-in components to `.garden/ui-catalog.html`:
  ```bash
  npx garden ui catalog
  ```

## 4. Component Templates, Snippets, and Agent Skills

Garden provides three ways to insert or generate components quickly:

1. **Draft cheat sheet comment**: Running `make new SLUG=xxx TITLE="..."` appends an HTML comment to the bottom of the new `.md` file with examples for idea fences and all 12 components. HTML comments are hidden from the rendered page and can be deleted when finished.
2. **Snippet template files**: The `templates/` directory inside `hd-garden` includes two template files:
   - `templates/garden-blocks.md`: Copyable Markdown templates for idea fences and all 12 built-in components.
   - `templates/garden-snippets.plist`: macOS text replacements (drag into **System Settings → Keyboard → Text Replacements**) with triggers `;gidea`, `;gcard`, `;gstat`, `;gcompare`, `;gtimeline`, `;gchart`, `;gfigure`, `;ghtml`, `;ginteractive`, `;gfile`, `;grel`, `;glist`, and `;gchoice`.
3. **Install AI Agent skills (`npx garden skill`)**: Running `npx garden skill` in a site repository (also run automatically during `npx hd-garden init`) copies three skills into `.agents/skills/`:
   - `garden-ui`: Compiles natural-language `garden` idea fences into concrete component blocks.
   - `garden-interactive-chart`: Authors `interactive`, `chart`, `figure`, and `html` components from article data.
   - `garden-post-review`: Reviews an entire post against layout and component rules.
