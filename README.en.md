# Garden

[中文](README.md)

Garden is a Claude-inspired personal blog framework. You write posts, short thoughts, and multi-part columns in Markdown inside your own Git repository, and describe structured or interactive components in a single plain-language sentence.

Your site repository keeps only `site.config.yaml` and `content/`. Rendering, static export, and verification come from the `hd-garden` package.

## 1. Create a site

Requires **Node.js `>= 22.13.0`**, **Git**, and **GNU Make**:

```bash
npx hd-garden init my-blog
cd my-blog
npm install
make dev
```

The published npm package is `hd-garden`; once installed inside a site, you can run `npx garden` (do not run `npx garden init` directly, as `garden` on npm is an unrelated package). `init` copies the VS Code / Cursor and Typora Intelligent UI plugins into the site and, in an interactive terminal, asks whether to install each one (see the next section). Running `make dev` for the first time creates `.env.local`, installs the three AI skills under `.agents/skills/`, installs the pre-commit check in `.git/hooks/pre-commit`, and starts the dev server at `http://localhost:3000` (with the built-in handbook at `http://localhost:3000/garden/en`).

## 2. Write interactives in VS Code, Cursor, and Typora

The Intelligent UI plugins ship inside `hd-garden`. You do not compile them in the site. They insert a one-sentence idea, preview the rendered component in the editor, open the component catalog, and hand the post to the `garden-ui` skill to compile.

`npx hd-garden init` copies the files to `.garden/editors/` (a `.vsix` for VS Code / Cursor, and the Typora plugin). In an interactive terminal it asks about VS Code / Cursor first, then Typora. The first `npx garden sync` (`make dev` syncs first) asks again if that prompt has not happened yet. `y` installs; pressing Enter skips.

With no TTY (a pipe or a CI log), with `CI=1`, or with `GARDEN_SKIP_EDITORS=1`, the command does not wait for input. It prints the install command below. You can run it later, and running it again is safe:

```bash
npx garden editors install                 # Ask again about VS Code and Typora
npx garden editors install --yes           # Install both, without asking
npx garden editors install --vscode        # VS Code / Cursor only
npx garden editors install --typora        # Typora only
```

### VS Code / Cursor

- **Insert an idea**: `Cmd+Alt+I` on macOS, `Ctrl+Alt+I` on Windows and Linux. The Command Palette and the editor context menu have the same Garden command. It inserts a plain `garden` fence: a short brief for the `garden-ui` skill, which compiles it later. In Typora, type `/` and choose `/garden`; the next list gives each component a small preview image.
- **Preview**: Open the Markdown preview. A `ui` fence renders the same component as the blog. An `intent` fence renders as an idea card. The extension reads sidecar data files next to the post.
- **Check**: Errors show up in the Problems panel and as squiggles in the source. A CodeLens above each block says whether it is ok, broken, stale, or not compiled yet.
- **Catalog**: The Garden catalog command inserts a recipe at the cursor when you choose to start from it. The same catalog from the terminal is `npx garden ui catalog` (it writes `.garden/ui-catalog.html`).
- **Compile**: Copy the compile prompt. On an English site (`locale: en_US`) it is `Compile this post:` plus the path. Paste that to an Agent that has the `garden-ui` skill. The skill runs `npx garden ui scan`, reads `npx garden ui prompt`, and writes the fence back with `npx garden ui apply`. The plugin does not call a model and does not store a key.

When `code` or `cursor` is on `PATH`, `garden editors install` runs `--install-extension`. If both commands exist, it installs into both. Without a CLI, open the Extensions view, choose the `...` menu, then **Install from VSIX**, and select the file under `.garden/editors/vscode/`.

### Typora

Typora has no official plugin API. Install [typora-community-plugin](https://github.com/typora-community-plugin/typora-community-plugin/blob/main/docs/en-us/user-guide/1a-installation.md) first (on macOS it patches `index.html` inside `Typora.app`). `garden editors install` looks in the usual locations. If the framework is missing, it still copies the plugin and prints that prerequisite.

The plugin is copied to `~/.typora/community-plugins/plugins/hedon954.garden-intelligent-ui/`. On macOS it is also copied to `~/Library/Application Support/abnerworks.Typora/plugins/plugins/hedon954.garden-intelligent-ui/`, which is the directory the Installed Plugins list reads. Open Typora and enable Garden Intelligent UI under Settings, Installed plugins.

Use it the same way as VS Code: leaving a fence previews `ui` / `intent` (as with Mermaid, click into the fence to edit the source; clicks on sliders and buttons stay in the preview). Type `/`, choose `/garden`, or use the insert command (`Ctrl+Alt+I` on Windows and Linux; on macOS, Option rewrites the key, so record a shortcut under Settings, Keyboard Shortcuts). Copy compile prompt hands the post to the `garden-ui` skill.

A Typora upgrade overwrites the community framework inside the app. Reinstall typora-community-plugin, then enable this plugin again. The fences stay in the Markdown, and `make dev` still previews them.

The Obsidian plugin is not installed by this command.

## 3. Describe components in plain language (humans and Agents share the same CLI)

Where you want a component or interactive calculation, write an unnamed `garden` fence describing what the reader should adjust and see:

````markdown
```garden
让读者拖动每天写的字数和每周写几天，看写完一篇 8000 字的长文要几周。
```
````

Ask your Agent to compile the post using the bundled `garden-ui` skill: it runs `npx garden ui scan` to locate uncompiled or broken blocks, reads the component catalog from `npx garden ui prompt`, generates a `garden compose` block (or `card`, `stat`, `compare`, `timeline`, `chart`, `figure`, `html`, `file`, `relations`, `list`, `choice`, or a `diff` block right below a code snippet), and writes only that fence back via `npx garden ui apply`. If you run `git commit` before compiling, the pre-commit hook runs `npx --no-install garden ui check --staged --quiet`, stops the commit, and prints a ready-to-paste fix prompt for your AI.

## 4. Common commands

```bash
make new SLUG=writing-pace TITLE="Writing Pace" # Create a draft post in content/posts/
make dev                                        # Sync content and start the local server
CONTENT_INCLUDE_DRAFTS=1 make dev               # Preview drafts and future publishAt posts
make check                                      # Run garden sync and garden build
make update MESSAGE="Add writing-pace post"     # Check, commit, and push to origin
npx garden check content/posts/writing-pace.md  # Validate front matter, components, and assets
npx garden ui check --staged                    # Check staged posts for uncompiled ideas or UI errors
npx garden ui catalog                           # Generate an offline component gallery at .garden/ui-catalog.html
npx garden editors install --yes                # Install the Intelligent UI plugins into VS Code / Cursor and Typora
```

## 5. Excalidraw

Point a Markdown image at the `.excalidraw` source. `garden build` exports one light flat SVG beside that file, with a transparent background, and embeds that SVG in the article so its text can be selected. No separate export command.

```markdown
![A sketch](./assets/flow.excalidraw)
```

The first page that references `.excalidraw` downloads the exporter (Chromium is not required; fonts are embedded in the SVG). See [Local Image](docs/handbook/en/components/image.md).

## 6. Handbook and reference docs

Start `make dev` and open `/garden/en` (Chinese at `/garden`), or read the markdown sources directly:

- **[Garden Handbook (English)](docs/handbook/en/index.md)** · **[Garden 使用说明（中文）](docs/handbook/index.md)**: [Quick Start](docs/handbook/en/start.md), [Writing with AI](docs/handbook/en/ai-writing.md), [Site & Column Configuration](docs/handbook/en/config.md), [Deploy to GitHub Pages](docs/handbook/en/deploy.md), [Writing Posts & Thoughts](docs/handbook/en/writing.md), [How Reading Layout Works](docs/handbook/en/design.md), [12 Built-in Components](docs/handbook/en/components.md), and [Checking & Shortcuts](docs/handbook/en/workflow.md).
- **[Quick Start Guide](docs/quick-start.md)** and **[GitHub Pages Deployment](docs/github-pages.md)**: single public repository or private source + public output repository setup, plus Giscus comments.
- **[Admin Service](docs/admin-service.md)**: optional `/admin` server (local, Docker, or Cloudflare Workers) for posting thoughts from the web, uploading media to Alibaba Cloud OSS, and using the `/admin/ui` workbench.

## License

[MIT](LICENSE). Sites built with Garden should keep the Garden attribution link in the footer.
