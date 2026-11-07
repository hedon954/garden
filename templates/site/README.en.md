# My Garden

This repository holds only your writing and site configuration: `content/` and `site.config.yaml`. The page engine comes from [Garden](https://github.com/hedon954/garden).

```bash
npm install
make new TITLE="Hello, World" SLUG=hello
make dev
```

`make dev`, `npm run dev`, and `npx garden dev` preview drafts and future scheduled posts by default. Opt out with `CONTENT_INCLUDE_DRAFTS=0 make dev`. Production builds exclude them by default.

Running `npx garden dev` for the first time fills in any missing `Makefile` or skills and creates `.env.local`. Cursor and Codex read `.agents/skills/` automatically when opening this repository. Run `npx garden skill` anytime to update the bundled skills.

`npx hd-garden init` copies the VS Code / Cursor and Typora Intelligent UI plugins into `.garden/editors/` and asks whether to install them when the terminal is interactive. Run `npx garden editors install` later (`--yes` installs both, `--vscode` or `--typora` installs one). Typora needs typora-community-plugin first; then enable the plugin under Settings, Installed plugins. Use the plugins to insert a plain `garden` brief for the `garden-compose` skill to compile, preview a component, and open the catalog. In Typora, type `/` and choose `/garden` to list each component with a small preview image. Hand `Compile this post:` to the skill when you want it compiled.

Comments are disabled by default. Before publishing, open [Giscus](https://giscus.app), write the repository, repository ID, category, and category ID into `.env.local`, and set the matching `GISCUS_REPO`, `GISCUS_REPO_ID`, `GISCUS_CATEGORY`, and `GISCUS_CATEGORY_ID` under GitHub Actions Variables. Leaving them empty fails the publish workflow. To publish without comments, set `GISCUS_DISABLED` to `1`.

To upgrade the engine, update `hd-garden` in `package.json` to the new version and run `npm install`.

Running `make dev` again gracefully replaces a verified Vinext process from the same project, never an unrelated port owner. Markdown edits, additions and deletions update the preview. Headings stay literal; ranges like `4~6` are plain text and strikethrough requires `~~text~~`.


### AI writing entry point

New sites include a locale-appropriate root `AGENTS.md`: a short map of Garden content, source/generated files, project skills and verification commands, not a duplicated component catalog. Existing sites can run `npx --no-install garden agents` to add it only if missing. Sync/dev also fills in a missing guide. Existing files, directories and symlinks named `AGENTS.md` are never replaced; the site guide is not installed over engine-maintainer instructions.
