---
title: Deploy to GitHub Pages
navTitle: Deploy to GitHub Pages
description: Configure a GitHub Actions workflow that supports either a single public repository or a private source repo paired with a public Pages repo.
section: getting-started
order: 4
---

`npx hd-garden init` does not create `.github/workflows/pages.yml` automatically. Add this file to your site repository when you are ready to publish to GitHub Pages. The same workflow supports both a **single public repository** and a **private source repository + public Pages repository**, switching automatically based on whether the `PAGES_REPOSITORY` variable is set.

The workflow below matches Garden's own `.github/workflows/pages.yml` with two adjustments for a site repo: it omits `paths-ignore`, `npm run lint`, and `npm test` (which only apply to the engine repo), and its `publish-repository` job installs dependencies before running `npx garden pages:prepare static-site pages-repository` (the same `scripts/prepare-pages-output.mjs` script Garden calls directly). Commit `package-lock.json` after your first `npm install` so `npm ci` can run in CI.

The `build` job runs only when the repository is named `<owner>.github.io`, or when the `SITE_URL` or `PAGES_REPOSITORY` variable is set.

## 1. Full `.github/workflows/pages.yml` Workflow

Create `.github/workflows/pages.yml` in your site repository:

```yaml
name: Verify and publish blog

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read

concurrency:
  group: publish-blog
  cancel-in-progress: true

jobs:
  build:
    if: github.event.repository.name == format('{0}.github.io', github.repository_owner) || vars.SITE_URL != '' || vars.PAGES_REPOSITORY != ''
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7

      - uses: actions/setup-node@v7
        with:
          node-version: 22
          cache: npm

      - run: npm ci

      - name: Resolve the public URL
        env:
          SITE_URL_OVERRIDE: ${{ vars.SITE_URL }}
          ADMIN_URL_OVERRIDE: ${{ vars.ADMIN_URL }}
          GISCUS_REPO: ${{ vars.GISCUS_REPO }}
          GISCUS_REPO_ID: ${{ vars.GISCUS_REPO_ID }}
          GISCUS_CATEGORY: ${{ vars.GISCUS_CATEGORY }}
          GISCUS_CATEGORY_ID: ${{ vars.GISCUS_CATEGORY_ID }}
          GISCUS_DISABLED: ${{ vars.GISCUS_DISABLED }}
          WEBMENTION_IO_DOMAIN: ${{ vars.WEBMENTION_IO_DOMAIN }}
          ANALYTICS_DOMAIN: ${{ vars.ANALYTICS_DOMAIN }}
          ANALYTICS_SCRIPT: ${{ vars.ANALYTICS_SCRIPT }}
        run: |
          owner="$GITHUB_REPOSITORY_OWNER"
          default_url="https://$owner.github.io"
          giscus_ready=1
          if [ -z "$GISCUS_REPO" ] || [ "$GISCUS_REPO" = "owner/repository" ]; then giscus_ready=0; fi
          if [ -z "$GISCUS_REPO_ID" ] || [ "$GISCUS_REPO_ID" = "R_xxxxxxxxxx" ]; then giscus_ready=0; fi
          if [ -z "$GISCUS_CATEGORY" ]; then giscus_ready=0; fi
          if [ -z "$GISCUS_CATEGORY_ID" ] || [ "$GISCUS_CATEGORY_ID" = "DIC_xxxxxxxxxx" ]; then giscus_ready=0; fi
          if [ "$giscus_ready" != 1 ]; then
            if [ "$GISCUS_DISABLED" = "1" ]; then
              GISCUS_REPO=
              GISCUS_REPO_ID=
              GISCUS_CATEGORY=
              GISCUS_CATEGORY_ID=
              echo "GISCUS_DISABLED=1，本次构建不开放评论。"
            else
              echo "评论还没有配置，构建已停止。"
              echo "1. 准备一个公开 GitHub 仓库，并开启 Discussions。"
              echo "2. 打开 https://giscus.app/zh-CN ，安装 Giscus App，选中该仓库和分类。"
              echo "3. 在 Settings → Secrets and variables → Actions → Variables 写入："
              echo "   GISCUS_REPO、GISCUS_REPO_ID、GISCUS_CATEGORY、GISCUS_CATEGORY_ID"
              echo "确定不开放评论时，把 GISCUS_DISABLED 设为 1。留空和示例值 owner/repository 都不会通过。"
              exit 1
            fi
          fi
          {
            echo "SITE_URL=${SITE_URL_OVERRIDE:-$default_url}"
            echo "NEXT_PUBLIC_SITE_URL=${SITE_URL_OVERRIDE:-$default_url}"
            echo "ADMIN_URL=$ADMIN_URL_OVERRIDE"
            echo "GISCUS_REPO=$GISCUS_REPO"
            echo "GISCUS_REPO_ID=$GISCUS_REPO_ID"
            echo "GISCUS_CATEGORY=$GISCUS_CATEGORY"
            echo "GISCUS_CATEGORY_ID=$GISCUS_CATEGORY_ID"
            echo "NEXT_PUBLIC_GISCUS_REPO=$GISCUS_REPO"
            echo "NEXT_PUBLIC_GISCUS_REPO_ID=$GISCUS_REPO_ID"
            echo "NEXT_PUBLIC_GISCUS_CATEGORY=$GISCUS_CATEGORY"
            echo "NEXT_PUBLIC_GISCUS_CATEGORY_ID=$GISCUS_CATEGORY_ID"
            echo "WEBMENTION_IO_DOMAIN=$WEBMENTION_IO_DOMAIN"
            echo "NEXT_PUBLIC_ANALYTICS_DOMAIN=$ANALYTICS_DOMAIN"
            echo "NEXT_PUBLIC_ANALYTICS_SCRIPT=$ANALYTICS_SCRIPT"
            echo "STATIC_EXPORT=1"
          } >> "$GITHUB_ENV"

      - name: Build the public site
        env:
          GITHUB_TOKEN: ${{ github.token }}
        run: npm run build

      - name: Validate the static output
        run: npm run pages:validate

      - name: Configure GitHub Pages
        if: ${{ vars.PAGES_REPOSITORY == '' }}
        uses: actions/configure-pages@v6

      - name: Upload the GitHub Pages artifact
        if: ${{ vars.PAGES_REPOSITORY == '' }}
        uses: actions/upload-pages-artifact@v5
        with:
          path: dist/client

      - name: Upload the public-repository artifact
        if: ${{ vars.PAGES_REPOSITORY != '' }}
        uses: actions/upload-artifact@v7
        with:
          name: static-site
          path: dist/client
          include-hidden-files: true
          if-no-files-found: error
          retention-days: 1

  deploy-pages:
    if: ${{ vars.PAGES_REPOSITORY == '' }}
    needs: build
    permissions:
      pages: write
      id-token: write
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - name: Deploy the GitHub Pages artifact
        id: deployment
        uses: actions/deploy-pages@v5

  publish-repository:
    if: ${{ vars.PAGES_REPOSITORY != '' }}
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7

      - uses: actions/setup-node@v7
        with:
          node-version: 22
          cache: npm

      - run: npm ci

      - name: Check the split-repository configuration
        env:
          PAGES_DEPLOY_KEY: ${{ secrets.PAGES_DEPLOY_KEY }}
          TARGET_REPOSITORY: ${{ vars.PAGES_REPOSITORY }}
        run: |
          test -n "$PAGES_DEPLOY_KEY" || { echo "缺少 PAGES_DEPLOY_KEY Secret"; exit 1; }
          [[ "$TARGET_REPOSITORY" =~ ^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$ ]] || {
            echo "PAGES_REPOSITORY 格式无效"
            exit 1
          }

      - uses: actions/download-artifact@v8
        with:
          name: static-site
          path: static-site

      - name: Check out the public output repository
        uses: actions/checkout@v7
        with:
          repository: ${{ vars.PAGES_REPOSITORY }}
          ssh-key: ${{ secrets.PAGES_DEPLOY_KEY }}
          path: pages-repository
          fetch-depth: 1

      - name: Start a clean rolling deployment
        working-directory: pages-repository
        env:
          TARGET_REPOSITORY: ${{ vars.PAGES_REPOSITORY }}
        run: |
          expected_remote="git@github.com:$TARGET_REPOSITORY.git"
          actual_remote="$(git remote get-url origin)"
          test "$actual_remote" = "$expected_remote" || {
            echo "拒绝发布到非目标仓库：$actual_remote"
            exit 1
          }
          echo "PAGES_PREVIOUS_TREE=$(git rev-parse 'HEAD^{tree}')" >> "$GITHUB_ENV"
          git checkout --orphan pages-deploy
          git rm -q -r -f .

      - name: Prepare generated-only repository contents
        run: npx garden pages:prepare static-site pages-repository

      - name: Publish the rolling deployment commit
        working-directory: pages-repository
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
          git add -A
          new_tree="$(git write-tree)"
          if [ "$new_tree" = "$PAGES_PREVIOUS_TREE" ]; then
            echo "静态产物没有变化，无需发布"
            exit 0
          fi
          git commit -m "Deploy ${GITHUB_SHA}"
          git push --force origin HEAD:main
```

## 2. Setting Up Each Deployment Mode

### Mode 1: Single Public Repository (`PAGES_REPOSITORY` Left Empty)

If your source repository is public, name it `<owner>.github.io`. If you use another repository name, attach a custom domain to Pages and set the `SITE_URL` variable to that domain, or the `build` job will not run (Garden does not support subpath deployments such as `/<repo>/`):

1. Open **Settings → Pages** in the repository and set **Source** to **GitHub Actions**.
2. In **Settings → Secrets and variables → Actions → Variables**, add `GISCUS_DISABLED=1` (or set the 4 `GISCUS_*` variables below).
3. Push to `main`; the workflow runs `deploy-pages` to publish directly.

### Mode 2: Private Source Repository + Public Pages Repository

To keep drafts (`draft: true`) and commit history private, store your source files in a private repository (such as `blog-source`) and push only the generated static files to a public `<owner>.github.io` repository:

1. **Generate an SSH deploy key** locally:
   ```bash
   ssh-keygen -t ed25519 -C "garden-pages-deploy" -f ./pages_deploy_key
   ```
2. **Add the public key to the public repository**: Open **Settings → Deploy keys → Add deploy key** in `<owner>.github.io`, paste `pages_deploy_key.pub`, and check **Allow write access**.
3. **Configure Pages on the public repository**: Open **Settings → Pages** in `<owner>.github.io`, set **Source** to **Deploy from a branch**, and select `main` with `/ (root)`.
4. **Configure variables and secrets on the private repository**: Open **Settings → Secrets and variables → Actions** in the private source repo:
   - Under **Variables**, add `PAGES_REPOSITORY` set to `<owner>/<owner>.github.io` (along with `GISCUS_DISABLED=1` or the 4 `GISCUS_*` variables).
   - Under **Secrets**, add `PAGES_DEPLOY_KEY` with the full contents of the private key file `pages_deploy_key`.
5. On every push to the private repo, the `publish-repository` job checks out the public repository using `PAGES_DEPLOY_KEY`, verifies that `PAGES_DEPLOY_KEY` is present, `PAGES_REPOSITORY` matches `owner/repo`, and the remote URL matches the target repository, then runs `npx garden pages:prepare static-site pages-repository` to write the static output, `.nojekyll`, and a short `README.md` before force-pushing a single orphan commit to `main`.

## 3. Giscus Comments Configuration

Article comments use GitHub Discussions via [Giscus](https://giscus.app). The application code reads `GISCUS_REPO`, `GISCUS_REPO_ID`, `GISCUS_CATEGORY`, and `GISCUS_CATEGORY_ID` (and their `NEXT_PUBLIC_GISCUS_*` counterparts), while the `Resolve the public URL` step in `pages.yml` checks that all four values are present before building:

- **Disable comments**: Set `GISCUS_DISABLED=1` in GitHub Actions Variables; the workflow clears `GISCUS_*` and omits the comment section.
- **Enable comments**: Enable Discussions on a public repository, install the Giscus App, and copy the four values into GitHub Actions Variables.

> [!NOTE] Note
> `npx garden pages:validate` inspects the `dist/client` directory (verifying that `index.html` exists and that no symlinks, `.env` files, `node_modules`, `.git`, `app`, `content`, `.md`, `.map`, or `.ts` files leaked into the export, apart from `.md` attachments under `media/`). It does not check Giscus variables itself.

## 4. Environment Variables Reference

All environment variables can be placed in a local `.env.local` file (never committed to Git) or in your deployment platform's Variables and Secrets:

| Variable | Purpose |
| :--- | :--- |
| `SITE_URL` / `NEXT_PUBLIC_SITE_URL` | Public root URL of the site (such as `https://example.com`), used for canonical URLs, RSS feeds, and `sitemap.xml` |
| `NEXT_PUBLIC_BASE_PATH` | Optional base path prefix (empty by default) |
| `STATIC_EXPORT` | Set to `1` to export static HTML and enable trailing slashes on internal links |
| `TRAILING_SLASH` | Set to `1` in server builds to enable trailing slashes on internal links (already on when `STATIC_EXPORT=1`) |
| `CONTENT_INCLUDE_DRAFTS` | Set to `1` to include `draft: true` drafts and future `publishAt` posts in the build |
| `GITHUB_TOKEN` | Fetches public GitHub profile data and pinned repositories at build time (pass `${{ github.token }}` in GitHub Actions) |
| `GISCUS_DISABLED` | Read by the `pages.yml` workflow script: set to `1` to build without the 4 `GISCUS_*` variables |
| `GISCUS_REPO` / `GISCUS_REPO_ID` | Public GitHub repository (`owner/repo`) and Repository ID for Giscus |
| `GISCUS_CATEGORY` / `GISCUS_CATEGORY_ID` | Discussions category name and Category ID for Giscus |
| `WEBMENTION_IO_DOMAIN` / `WEBMENTION_ENDPOINT` | Domain registered with Webmention.io (such as `example.com`) and custom endpoint override |
| `ADMIN_URL` | Public URL of a separately deployed `/admin` instance |
| `CONTENT_REPOSITORY` / `CONTENT_BRANCH` | Target GitHub repository (`owner/repo`) and branch (defaults to `main`) where `/admin` commits content |
| `CONTENT_GITHUB_TOKEN` | Fine-grained GitHub PAT used by `/admin` to commit thoughts and assets |
| `GITHUB_OAUTH_CLIENT_ID` / `GITHUB_OAUTH_CLIENT_SECRET` | Client ID and Secret of the GitHub OAuth App for `/admin` sign-in |
| `GITHUB_SESSION_SECRET` | Random secret string used to sign `/admin` session cookies |
| `ADMIN_GITHUB_LOGINS` | Comma-separated allowlist of GitHub usernames permitted to sign in to `/admin` |
