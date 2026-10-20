# My Garden

This repository holds only your writing and site configuration: `content/` and `site.config.yaml`. The page engine comes from [Garden](https://github.com/hedon954/garden).

```bash
npm install
make new TITLE="Hello, World" SLUG=hello
make dev
```

Running `npx garden dev` for the first time fills in any missing `Makefile` or skills and creates `.env.local`. Cursor and Codex read `.agents/skills/` automatically when opening this repository. Run `npx garden skill` anytime to update the bundled skills.

Comments are disabled by default. Before publishing, open [Giscus](https://giscus.app), write the repository, repository ID, category, and category ID into `.env.local`, and set the matching `GISCUS_REPO`, `GISCUS_REPO_ID`, `GISCUS_CATEGORY`, and `GISCUS_CATEGORY_ID` under GitHub Actions Variables. Leaving them empty fails the publish workflow. To publish without comments, set `GISCUS_DISABLED` to `1`.

To upgrade the engine, update `hd-garden` in `package.json` to the new version and run `npm install`.
