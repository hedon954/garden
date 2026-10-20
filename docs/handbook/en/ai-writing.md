---
title: Writing with AI
navTitle: Writing with AI
description: Describe components in one sentence for an Agent to compile, and validate staged files with the same CLI in the pre-commit hook.
section: getting-started
order: 2
---

You do not need to memorize component tags to add charts, metrics, or interactive calculators in Garden. Write a one-sentence idea in the post body, let an Agent compile it using the repository's skills, and verify the result on commit with the same CLI commands.

> [!IMPORTANT] Humans and Agents Share the Same Tools
> The Agent uses `npx garden ui scan` to locate blocks, `npx garden ui apply` to write them back, and `npx garden ui check` to validate them; the author's pre-commit hook runs `npx garden ui check` too. When a check fails, the printed prompt is the instruction to hand to the Agent.

## 1. Write a One-sentence Idea

Place an unnamed `garden` fence where the component belongs and state what the reader should do and see, without naming a component:

````markdown
```garden
Let the reader drag daily word count and writing days per week to see how many weeks an 8,000-word article takes.
```
````

Draft posts (`draft: true`) may keep uncompiled idea fences; in non-draft posts, both `npx garden ui check` and `npx garden check` report a `garden-idea` error. Depending on the content, the Agent compiles the idea into a built-in component (`garden interactive`, `card`, `stat`, `compare`, and others) or replaces it with plain prose when a paragraph is clearer.

## 2. Three Bundled Skills

Three skills live in `.agents/skills/` at the root of the site repository. `npx hd-garden init` installs them when creating a site, the first `npx garden sync` or `npx garden dev` fills in any missing skill files, and `npx garden skill` reinstalls them on demand.

| Skill Name | Example Trigger Prompt | What It Does |
| :--- | :--- | :--- |
| `garden-ui` | "Compile this post: content/posts/writing-pace.md", "Recompile writing-pace", or pasting a fix prompt | Scans `uncompiled`, `stale`, and `error` blocks, generates components, and writes them back via `npx garden ui apply`; asking where interactive blocks fit runs read-only suggestion mode and returns up to 5 ready-to-paste idea fences |
| `garden-interactive-chart` | Canvas animations or simulations beyond the built-in component catalog | Writes a standalone `.html` file inside the post's sidecar directory and embeds it in the post with a `garden html` fence |
| `garden-post-review` | "Review post: content/posts/writing-pace.md" | Fixes structural errors reported by `npx garden check`, repairs interactive blocks against the chart rules, and reads the full post to offer editorial suggestions without rewriting prose |

## 3. `garden ui` Subcommands and Post Checks

Authors and Agents run the same `garden ui` subcommands; when an idea fence has no `id`, `npx garden ui apply` targets it by the `--intent-hash` (or `--at` line number) returned by `npx garden ui scan`.

| Command | When the Author Runs It | When the Agent Runs It |
| :--- | :--- | :--- |
| `npx garden ui scan <post.md>` | Inspect which blocks in a post are uncompiled or failing | Step 1: read each block's `status`, `startLine`, `hash`, and `intentHash` |
| `npx garden ui prompt [--studio]` | Read the component catalog, design rules, and recipes | Read before writing a block so only cataloged components and props are used |
| `npx garden ui schema` | Inspect the JSON schema of the component catalog | Read structured prop constraints programmatically |
| `npx garden ui apply <post.md> --id <id>` | Rarely needed when writing by hand | Replace a single fence by `--id`, `--intent-hash`, or `--at` while keeping everything outside the fence byte-identical |
| `npx garden ui check <post.md>` | Run automatically by the pre-commit hook (also accepts `--staged` or `--all`) | Validate after applying changes until the exit code is `0` |
| `npx garden ui catalog [--out file] [--no-open]` | Generate `.garden/ui-catalog.html` for offline browsing | Not used by the Agent |
| `npx garden check <post.md>` | Check a single post's title, images, and fences | Final check after all blocks are applied, verifying `"ok": true` in the JSON output |

## 4. Pre-commit Hook and Fix Prompts

On the first `npx garden sync` or `npx garden dev` run, Garden writes `exec npx --no-install garden ui check --staged --quiet` to `.git/hooks/pre-commit` (if a custom hook already exists, it leaves the file untouched and prints the line to add). `--staged` reads staged content directly via `git show :<path>` and, on failure, prints the line numbers, diagnostic codes, and a fix prompt:

```console
content/posts/writing-pace.md:9  -  garden-idea  还有没编译的想法

──────────────────────── 发给 AI 的修复提示词 ────────────────────────
请处理下面 Garden 博文里列出的块：没编译的想法要编译，有错误的交互块要修好。
……
```

- The prompt is written to `.garden/ui-fix-prompt.md` and copied to the clipboard when `pbcopy`, `wl-copy`, `xclip`, `xsel`, or `clip` is available; pass `--no-copy` or set `GARDEN_UI_NO_COPY=1` to disable clipboard copying.
- When pasting into a web chat that cannot read your local repository, run `npx garden ui check <post.md> --standalone` to append the full `npx garden ui prompt` rules to the prompt (including source fences for up to 10 failing blocks).
- A misspelled tag inside an interactive block (such as `<Slidr>` instead of `<Slider>`) reports `ui-component` with its exact line number; to commit anyway, run `git commit --no-verify`.
- Run `npx garden hooks` to reinstall the hook (pass `--force` to overwrite an existing hook), or set `GARDEN_SKIP_HOOKS=1` to skip automatic hook installation.

## 5. Generate a Code Diff from One Sentence

Place a `garden` idea fence immediately below an updated code block and state in one sentence what changed compared with the previous version:

````markdown
```yaml
pages:
  garden:
    title: "Write in Markdown | Push to Update the Site"
```

```garden
Compared with the previous version: split the title into two lines with " | " instead of a period and newline.
```
````

Following the `garden-ui` skill, the Agent replaces that idea fence with a `diff` fence right below the code block. The page merges the adjacent code and `diff` fences into a single code frame with a toggle between the full code and the diff; see [Writing Posts & Thoughts](/garden/en/writing) for the hand-written `diff` format.

## 6. Templates and Snippets Without an Agent

When writing components by hand without AI, you can use the templates and snippets shipped in the package:

- Every draft created by `make new` includes an HTML comment at the bottom with copy-ready examples for idea fences and all 9 components; delete the comment whenever you are done.
- `templates/garden-blocks.md` lists `when` / `whenNot` guidance and copyable templates for every block; macOS, Typora, and Alfred users can import `templates/garden-snippets.plist` to expand `;gidea`, `;gcard`, `;gstat`, `;gcompare`, `;gtimeline`, `;gchart`, `;gfigure`, `;ghtml`, `;ginteractive`, and `;gfile`.
- The engine repository also ships editor integrations under `editors/vscode`, `editors/typora`, and `editors/obsidian`, and `npx garden ui catalog` generates an offline component catalog at `.garden/ui-catalog.html`.

## 7. Optional Standalone Admin

The Garden engine includes an optional `/admin` console (under `app/admin` and `worker/`) that can be deployed separately with `npm run admin:local`, `npm run admin:cloudflare`, or Docker. Once configured via environment variables, it provides:

- GitHub OAuth sign-in restricted to the `ADMIN_GITHUB_LOGINS` allowlist, a web editor that commits thoughts directly to `content/thoughts/*.md` using `CONTENT_GITHUB_TOKEN`, and direct browser uploads to Alibaba Cloud OSS via 10-minute Post Policies.
- An interactive block overview at `/admin/ui/blocks` across all posts (including drafts) with one-click copying of the same fix prompt produced by the CLI hook.
- The `/admin/ui` studio for drafting or editing components with a model (`UI_MODEL_BASE_URL`, `UI_MODEL_API_KEY`, `UI_MODEL_NAME`), the catalog at `/admin/ui/catalog`, draft previews at `/admin/preview/<path>`, and model evaluations at `/admin/ui/evals`.
