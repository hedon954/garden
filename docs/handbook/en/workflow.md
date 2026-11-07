---
title: Checks & Shortcuts
navTitle: Checks & Shortcuts
description: Validate posts with npx garden check, install the VS Code and Typora plugins, and set up the Git pre-commit hook and Agent skills.
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
| `compose-uncompiled` | Error | A non-draft `garden compose` fence is still prose, not markup |
| `compose-invalid` | Error | A `garden compose` document is invalid: unknown tag, unclosed tag, or a YAML slot tree |
| `garden-name` | Error | Unknown `garden` component name (`card`, `stat`, `compare`, `timeline`, `chart`, `compose`, `html`, `interactive`, `file`, `relations`, `list`, `choice`) |
| `garden-yaml` | Error | Invalid YAML syntax, wrong top-level shape, or unsupported keys inside a `garden` fence |
| `garden-relations` | Error | `garden relations` has fewer than 3 or more than 6 elements, or invalid `links` entries (use a `mermaid` flowchart for larger or branching diagrams, or `garden list` for one-pass steps) |
| `garden-file` / `file-outside` | Error | `garden file` manually sets `resolved`, is missing a valid `src` / `files`, or points outside `content/` |
| `file-large` | Warning | A local file referenced by `garden file` exceeds `5 MB` |
| `compare-long` | Error | A single side-by-side cell in `garden compare` exceeds roughly 60 characters (does not apply when `verdict` is used) |
| `interactive-trivial` / `steps-prose` | Error | `garden compose` only computes a single multiplication, or `<Steps>` contains only prose without state changes |

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

1. **Draft cheat sheet comment**: Running `make new SLUG=xxx TITLE="..."` appends an HTML comment to the bottom of the new `.md` file with examples for idea fences and the built-in components. HTML comments are hidden from the rendered page and can be deleted when finished.
2. **Snippet template files**: The `templates/` directory inside `hd-garden` includes two template files:
   - `templates/garden-blocks.md`: Copyable Markdown templates for idea fences and the built-in components.
   - `templates/garden-snippets.plist`: macOS text replacements (drag into **System Settings → Keyboard → Text Replacements**) with triggers `;gidea`, `;gcard`, `;gstat`, `;gcompare`, `;gtimeline`, `;gchart`, `;gcompose`, `;ghtml`, `;ginteractive`, `;gfile`, `;grel`, `;glist`, and `;gchoice`. `;gcompose` expands to a `garden compose` fence with one sentence. The others expand to their fences.
3. **Install AI Agent skills (`npx garden skill`)**: Running `npx garden skill` in a site repository (also run automatically during `npx hd-garden init`) copies two skills into `.agents/skills/`:
   - `garden-compose`: Compiles natural-language `garden` idea fences into concrete component blocks.
   - `garden-post-review`: Reviews an entire post against layout and component rules.

## 5. VS Code, Cursor, and Typora Plugins

The Intelligent UI plugins are the editor entry point for interactive components: insert a one-sentence idea, preview it, open the catalog, then hand compilation to the `garden-compose` skill. They ship inside `hd-garden`. A site does not compile `editors/vscode` or `editors/typora` from source.

### Install

`npx hd-garden init` copies the files to `.garden/editors/` (a VSIX for VS Code / Cursor, and the Typora plugin). An interactive terminal asks whether to install VS Code / Cursor, then whether to install Typora. The first `npx garden sync` or `npx garden dev` asks again when that prompt has not happened yet. `y` installs; Enter skips.

With no TTY, when `CI` is `1`, or when `GARDEN_SKIP_EDITORS` is set, Garden does not wait for input and only prints how to install later. `GARDEN_SKIP_EDITORS` skips that automatic prompt. The commands below still install, and they are safe to run again:

```bash
npx garden editors install
npx garden editors install --yes
npx garden editors install --vscode
npx garden editors install --typora
```

`garden help` lists `editors install`.

**VS Code / Cursor.** When `code` or `cursor` is on `PATH`, install adds the VSIX to that editor. If both commands exist, it installs into both. Without a CLI, open the Extensions view, choose the `...` menu, then Install from VSIX, and select the file under `.garden/editors/vscode/`.

**Typora.** Typora has no official plugin API. Install [typora-community-plugin](https://github.com/typora-community-plugin/typora-community-plugin/blob/main/docs/en-us/user-guide/1a-installation.md) first. The install command checks the usual locations. If the framework is missing, it still copies the plugin to `~/.typora/community-plugins/plugins/hedon954.garden-intelligent-ui/` and prints that prerequisite. On macOS it also copies to `~/Library/Application Support/abnerworks.Typora/plugins/plugins/hedon954.garden-intelligent-ui/`. Open Typora and enable Garden Intelligent UI under Settings, Installed plugins. A Typora upgrade overwrites the community framework inside the app. Reinstall typora-community-plugin, then enable this plugin again. The fences stay in the Markdown.

The Obsidian plugin is not installed by this command.

### Use the plugins while writing

1. **Insert an idea.** In VS Code / Cursor, use `Cmd+Alt+I` on macOS or `Ctrl+Alt+I` on Windows and Linux, or the Garden insert command. In Typora, type `/` and choose `/garden` (the next list has a small preview image on each row), or use the insert command to open the component list directly; Windows and Linux default to `Ctrl+Alt+I`. On macOS, record a shortcut under Settings, Keyboard Shortcuts, because Option rewrites the key. The insertion is a plain `garden` fence: a short brief naming the component and the facts to mention, which the `garden-compose` skill compiles later.
2. **Preview.** Open the Markdown preview. In Typora, move the cursor out of the fence. A `ui` block renders the same component as the blog. An `intent` block renders as an idea card. Clicks on sliders and buttons stay in the preview.
3. **Open the catalog.** In VS Code / Cursor, the catalog command inserts a recipe at the cursor. The terminal builds the same page:

   ```bash
   npx garden ui catalog
   ```

   That writes `.garden/ui-catalog.html`.
4. **Compile with the skill.** Copy compile prompt. On an English site (`locale: en_US`) the clipboard text is `Compile this post:` plus the post path. Paste it to an Agent that has the `garden-compose` skill. The skill runs `npx garden ui scan`, reads `npx garden ui prompt`, and replaces only that fence with `npx garden ui apply`. The plugin does not call a model. Check the result with `npx garden ui check` or the pre-commit hook.


## Strict local check

Run `make check` to check every article structure and every Compose/UI block in the working tree, including drafts and untracked files. No staging is needed. Both checks run even if structural errors are found, so Compose diagnostics and a short project `garden-compose` skill instruction are still shown. No prompt file is generated by default. No AI call or clipboard copy happens.

`make check FILE=content/posts/post.md` limits the content preflight to that file. After preflight succeeds, the existing full-site sync/build stages still run. The engine repository retains its lint/test stages instead. Failure exits nonzero and skips these later stages. This is compilation/validation, not an automatic formatting or repair command.


`make check diff` checks only changed Markdown documents under `content/`: tracked working-tree changes against HEAD (including staged changes) plus untracked files. It reads current working-tree contents, deduplicates paths, uses rename destinations and skips deleted files. It does not run all-site sync/build/lint/tests, even with `make -j check diff`. No changes is a successful no-op; missing Git/HEAD is an explicit error, never an all-content fallback. `garden verify --diff` is the underlying command. Diff mode overrides FILE; plain `make check` is unchanged.
