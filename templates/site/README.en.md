# My Garden

This repository holds only your writing and site configuration: `content/` and `site.config.yaml`. The page engine comes from [Garden](https://github.com/hedon954/garden).

```bash
npm install
make new TITLE="Hello, World" SLUG=hello
make dev
```

Running `npx garden dev` for the first time fills in any missing `Makefile` or skills and creates `.env.local`. Cursor and Codex read `.agents/skills/` automatically when opening this repository. Run `npx garden skill` anytime to update the bundled skills.

`npx hd-garden init` copies the VS Code / Cursor and Typora Intelligent UI plugins into `.garden/editors/` and asks whether to install them when the terminal is interactive. Run `npx garden editors install` later (`--yes` installs both, `--vscode` or `--typora` installs one). Typora needs typora-community-plugin first; then enable the plugin under Settings, Installed plugins. Use the plugins to insert an idea, preview a component, open the catalog, and hand `Compile this post:` to the `garden-ui` skill.

Comments are disabled by default. Before publishing, open [Giscus](https://giscus.app), write the repository, repository ID, category, and category ID into `.env.local`, and set the matching `GISCUS_REPO`, `GISCUS_REPO_ID`, `GISCUS_CATEGORY`, and `GISCUS_CATEGORY_ID` under GitHub Actions Variables. Leaving them empty fails the publish workflow. To publish without comments, set `GISCUS_DISABLED` to `1`.

To upgrade the engine, update `hd-garden` in `package.json` to the new version and run `npm install`.
