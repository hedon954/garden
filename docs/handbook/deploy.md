---
title: 发布到 GitHub Pages
navTitle: 发布到 GitHub Pages
description: 配置 GitHub Actions 工作流，支持单个公开仓库或「私有源码仓库 + 公开页面仓库」两种发布方式。
section: getting-started
order: 3
---

`npx hd-garden init` 不会自动创建 `.github/workflows/pages.yml`。发布到 GitHub Pages 时，在站点仓库新建这个文件。同一份工作流同时支持**单个公开仓库**和**私有源码仓库 + 公开页面仓库**两种模式，按 `PAGES_REPOSITORY` 变量是否为空自动切换。

下面的工作流和 Garden 仓库自己的 `.github/workflows/pages.yml` 一致，改动只有两处：一是去掉只对 Garden 仓库有用的 `paths-ignore`、`npm run lint` 和 `npm test`；二是 `publish-repository` 任务先装依赖，再用 `npx garden pages:prepare static-site pages-repository` 写入公开仓库（Garden 仓库里直接调用的是同一个脚本 `scripts/prepare-pages-output.mjs`）。`npm ci` 需要仓库里有 `package-lock.json`，第一次 `npm install` 后记得一起提交。

`build` 任务只在三种情况下运行：仓库名是 `<owner>.github.io`、配置了 `SITE_URL` 变量，或配置了 `PAGES_REPOSITORY` 变量。

## 1. 完整 `.github/workflows/pages.yml` 工作流

在站点仓库新建 `.github/workflows/pages.yml`：

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

## 2. 两种部署模式的设置步骤

### 模式一：单个公开仓库（`PAGES_REPOSITORY` 留空）

如果源码仓库本身是公开的，仓库名用 `<owner>.github.io`。用别的仓库名时，要给 Pages 配上自定义域名，并把 `SITE_URL` 变量设为这个域名，否则 `build` 任务不会运行（Garden 不支持部署在 `/仓库名/` 这样的子路径下）：

1. 打开仓库 **Settings → Pages**，将 **Source** 设为 **GitHub Actions**。
2. 在 **Settings → Secrets and variables → Actions → Variables** 中新建 `GISCUS_DISABLED=1`（或者填入下方 4 个 `GISCUS_*` 变量）。
3. 推送到 `main` 分支后，工作流会走 `deploy-pages` 任务直接发布。

### 模式二：私有源码仓库 + 公开页面仓库

如果不希望公开未发布的草稿（`draft: true`）或写作历史，可以把站点源码放在私有仓库（例如 `blog-source`），只把生成的静态文件推送到公开仓库 `<owner>.github.io`：

1. **生成 SSH 部署密钥**：在本地运行命令生成一对专用密钥：
   ```bash
   ssh-keygen -t ed25519 -C "garden-pages-deploy" -f ./pages_deploy_key
   ```
2. **在公开仓库添加公钥**：打开公开仓库 `<owner>.github.io` 的 **Settings → Deploy keys → Add deploy key**，填入 `pages_deploy_key.pub` 的内容，并**勾选 Allow write access**。
3. **设置公开仓库的 Pages 来源**：打开公开仓库 `<owner>.github.io` 的 **Settings → Pages**，将 **Source** 设为 **Deploy from a branch**，分支选择 `main`、目录选择 `/ (root)`。
4. **在私有仓库配置变量与密钥**：打开私有源码仓库的 **Settings → Secrets and variables → Actions**：
   - 在 **Variables** 中新建 `PAGES_REPOSITORY`，值为 `<owner>/<owner>.github.io`（同时配置 `GISCUS_DISABLED=1` 或 4 个 `GISCUS_*` 变量）。
   - 在 **Secrets** 中新建 `PAGES_DEPLOY_KEY`，值为私钥文件 `pages_deploy_key` 的完整内容。
5. 推送到私有仓库后，工作流中的 `publish-repository` 任务会使用 `PAGES_DEPLOY_KEY` 检出公开仓库，先检查 `PAGES_DEPLOY_KEY` 是否存在、`PAGES_REPOSITORY` 是否是 `owner/repo` 格式，再确认检出的远程地址就是目标仓库（不是就停止并提示「拒绝发布到非目标仓库」）。之后运行 `npx garden pages:prepare static-site pages-repository` 清空旧文件、写入静态产物、`.nojekyll` 和一份说明用的 `README.md`，最后强制推送到公开仓库的 `main` 分支。

## 3. Giscus 评论配置说明

文章底部的评论区基于 GitHub Discussions 和 [Giscus](https://giscus.app/zh-CN)。应用代码本身只读取 `GISCUS_REPO`、`GISCUS_REPO_ID`、`GISCUS_CATEGORY`、`GISCUS_CATEGORY_ID`（以及对应的 `NEXT_PUBLIC_GISCUS_*`）；而上方 `pages.yml` 工作流里的 `Resolve the public URL` shell 步骤会在构建前检查这四项是否齐全：

- **暂不开启评论**：在 GitHub Actions Variables 中设置 `GISCUS_DISABLED=1`，工作流会清空 `GISCUS_*` 并跳过评论区。
- **开启评论**：在公开仓库启用 Discussions 并安装 Giscus App，把获取到的四个参数写入 GitHub Actions Variables。

> [!NOTE]
> `npx garden pages:validate` 负责检查 `dist/client` 静态产物目录（确认存在 `index.html`，且没有软链接、`.env` 文件、`node_modules`、`.git`、`app`、`content` 等源码目录，也没有 `.md`、`.map`、`.ts` 文件；`media/` 下作为附件发布的 `.md` 除外），它本身不会检查 Giscus 变量。

## 4. 环境变量一览

所有环境变量均可写在本地 `.env.local`（不要提交进 Git）或部署平台的 Variables / Secrets 中：

| 变量名 | 用途说明 |
| :--- | :--- |
| `SITE_URL` / `NEXT_PUBLIC_SITE_URL` | 站点公开根地址（如 `https://example.com`），用于生成 canonical、RSS 与 `sitemap.xml` |
| `NEXT_PUBLIC_BASE_PATH` | 子路径前缀（默认留空） |
| `STATIC_EXPORT` | 设为 `1` 时启用静态 HTML 导出，并自动开启站内链接末尾 `/` |
| `TRAILING_SLASH` | 服务端运行时设为 `1` 可开启站内链接末尾 `/`（`STATIC_EXPORT=1` 时已默认开启） |
| `CONTENT_INCLUDE_DRAFTS` | 设为 `1` 时将 `draft: true` 草稿和未来 `publishAt` 文章一并纳入构建 |
| `GITHUB_TOKEN` | 构建期拉取作者 GitHub 公开资料与置顶仓库信息（GitHub Actions 中可传 `${{ github.token }}`） |
| `GISCUS_DISABLED` | 供 `pages.yml` 工作流脚本识别：设为 `1` 时允许不填下方 4 个 `GISCUS_*` 变量 |
| `GISCUS_REPO` / `GISCUS_REPO_ID` | Giscus 绑定的公开仓库（`owner/repo`）及其 Repository ID |
| `GISCUS_CATEGORY` / `GISCUS_CATEGORY_ID` | Giscus 绑定的 Discussions 分类名及其 Category ID |
| `WEBMENTION_IO_DOMAIN` / `WEBMENTION_ENDPOINT` | 接收 Webmention 的域名（如 `example.com`）与自定义接收端点 |
| `ADMIN_URL` | 独立部署 `/admin` 后台时的地址 |
| `CONTENT_REPOSITORY` / `CONTENT_BRANCH` | `/admin` 后台写入的 GitHub 仓库（`owner/repo`）与分支名（默认 `main`） |
| `CONTENT_GITHUB_TOKEN` | `/admin` 后台向仓库提交随想和附件所用的 GitHub Fine-grained PAT |
| `GITHUB_OAUTH_CLIENT_ID` / `GITHUB_OAUTH_CLIENT_SECRET` | `/admin` 后台 GitHub OAuth 登录应用的 Client ID 与 Secret |
| `GITHUB_SESSION_SECRET` | `/admin` 会话签名的随机密钥字符串 |
| `ADMIN_GITHUB_LOGINS` | 允许登录 `/admin` 后台的 GitHub 用户名白名单（多个用逗号分隔） |
