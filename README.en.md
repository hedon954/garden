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

The published npm package is `hd-garden`; once installed inside a site, you can run `npx garden` (do not run `npx garden init` directly, as `garden` on npm is an unrelated package). Running `make dev` for the first time creates `.env.local`, installs the three AI skills under `.agents/skills/`, installs the pre-commit check in `.git/hooks/pre-commit`, and starts the dev server at `http://localhost:3000` (with the built-in handbook at `http://localhost:3000/garden/en`).

## 2. Describe components in plain language (humans and Agents share the same CLI)

Where you want a component or interactive calculation, write an unnamed `garden` fence describing what the reader should adjust and see:

````markdown
```garden
让读者拖动每天写的字数和每周写几天，看写完一篇 8000 字的长文要几周。
```
````

Ask your Agent to compile the post using the bundled `garden-ui` skill: it runs `npx garden ui scan` to locate uncompiled or broken blocks, reads the component catalog from `npx garden ui prompt`, generates a `garden interactive` block (or `card`, `stat`, `compare`, `timeline`, `chart`, `figure`, `html`, `file`, or a `diff` block right below a code snippet), and writes only that fence back via `npx garden ui apply`. If you run `git commit` before compiling, the pre-commit hook runs `npx --no-install garden ui check --staged --quiet`, stops the commit, and prints a ready-to-paste fix prompt for your AI.

## 3. Common commands

```bash
make new SLUG=writing-pace TITLE="Writing Pace" # Create a draft post in content/posts/
make dev                                        # Sync content and start the local server
CONTENT_INCLUDE_DRAFTS=1 make dev               # Preview drafts and future publishAt posts
make check                                      # Run garden sync and garden build
make update MESSAGE="Add writing-pace post"     # Check, commit, and push to origin
npx garden check content/posts/writing-pace.md  # Validate front matter, components, and assets
npx garden ui check --staged                    # Check staged posts for uncompiled ideas or UI errors
npx garden ui catalog                           # Generate an offline component gallery at .garden/ui-catalog.html
```

## 4. Handbook and reference docs

Start `make dev` and open `/garden/en` (Chinese at `/garden`), or read the markdown sources directly:

- **[Garden Handbook (English)](docs/handbook/en/index.md)** · **[Garden 使用说明（中文）](docs/handbook/index.md)**: [Quick Start](docs/handbook/en/start.md), [Writing with AI](docs/handbook/en/ai-writing.md), [Site & Column Configuration](docs/handbook/en/config.md), [Deploy to GitHub Pages](docs/handbook/en/deploy.md), [Writing Posts & Thoughts](docs/handbook/en/writing.md), [How Reading Layout Works](docs/handbook/en/design.md), [9 Built-in Components](docs/handbook/en/components.md), and [Checking & Shortcuts](docs/handbook/en/workflow.md).
- **[Quick Start Guide](docs/quick-start.md)** and **[GitHub Pages Deployment](docs/github-pages.md)**: single public repository or private source + public output repository setup, plus Giscus comments.
- **[Admin Service](docs/admin-service.md)**: optional `/admin` server (local, Docker, or Cloudflare Workers) for posting thoughts from the web, uploading media to Alibaba Cloud OSS, and using the `/admin/ui` workbench.

## License

[MIT](LICENSE). Sites built with Garden should keep the Garden attribution link in the footer.
