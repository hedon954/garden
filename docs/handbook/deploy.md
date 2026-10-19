---
title: 发布到 GitHub Pages
navTitle: 发布到 GitHub Pages
description: 配置 GitHub Actions 工作流，支持单个公开仓库或「私有源码仓库 + 公开页面仓库」两种发布方式。
section: getting-started
order: 3
---

`npx hd-garden init` 不会自动创建 `.github/workflows/pages.yml`。发布到 GitHub Pages 时，在站点仓库新建 `.github/workflows/pages.yml`，可以选用**单个公开仓库**，也可以选用**私有源码仓库 + 公开页面仓库**（把草稿和原稿留在私有仓库，只把构建好的静态页面推送到公开仓库）。

## 1. 方式一：单个公开仓库

如果源码仓库本身是公开的（推荐命名为 `<你的GitHub用户名>.github.io`）：

1. 打开 GitHub 仓库的 **Settings → Pages**，在 **Build and deployment** 下将 **Source** 设为 **GitHub Actions**。
2. 在仓库根目录创建 `.github/workflows/pages.yml`：

```yaml
name: Deploy GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - name: Build static site
        env:
          STATIC_EXPORT: "1"
          SITE_URL: https://<owner>.github.io
          GISCUS_DISABLED: "1"
        run: |
          npx garden build
          npx garden pages:validate
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist/client

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

## 2. 方式二：私有源码仓库 + 公开页面仓库

如果不希望公开未发布的草稿（`draft: true`）或写作历史，可以把站点源码放在私有仓库（例如 `blog-source`），把生成的静态文件推送到公开仓库 `<owner>.github.io`：

1. **生成 SSH 部署密钥**：在本地运行命令生成一对专用密钥（不要设密码）：
   ```bash
   ssh-keygen -t ed25519 -C "garden-pages-deploy" -f ./pages_deploy_key -N ""
   ```
2. **在公开仓库添加公钥**：打开公开仓库 `<owner>.github.io` 的 **Settings → Deploy keys → Add deploy key**，填入 `pages_deploy_key.pub` 的内容，并**勾选 Allow write access**。
3. **设置公开仓库的 Pages 来源**：打开公开仓库 `<owner>.github.io` 的 **Settings → Pages**，将 **Source** 设为 **Deploy from a branch**，分支选择 `main`、目录选择 `/ (root)`。
4. **在私有仓库配置变量与密钥**：打开私有源码仓库的 **Settings → Secrets and variables → Actions**：
   - 在 **Variables** 中新建 `PAGES_REPOSITORY`，值为 `<owner>/<owner>.github.io`。
   - 在 **Secrets** 中新建 `PAGES_DEPLOY_KEY`，值为私钥文件 `pages_deploy_key` 的完整内容。
5. Working workflow 会通过 `ssh-agent` 加载 `PAGES_DEPLOY_KEY`，将 `dist/client` 静态产物提交并强制推送到公开仓库的 `main` 分支。

## 3. Giscus 评论配置与 `GISCUS_DISABLED`

文章底部的评论区基于 GitHub Discussions 和 [Giscus](https://giscus.app/zh-CN)。

> [!WARNING]
> 在静态发布构建中，如果既没有填写完整的 `GISCUS_REPO`、`GISCUS_REPO_ID`、`GISCUS_CATEGORY`、`GISCUS_CATEGORY_ID`，也没有显式设置 `GISCUS_DISABLED=1`，发布校验会报错终止，防止线上出现坏掉的空白评论框。

- **暂不开启评论**：在环境变量或 GitHub Actions Variables 中设置 `GISCUS_DISABLED=1`。
- **开启评论**：在公开讨论仓库启用 Discussions 并安装 Giscus App，把获取到的四个参数填入环境变量。

## 4. 环境变量一览

所有环境变量均可写在本地 `.env.local`（不要提交进 Git）或部署平台的 Variables / Secrets 中：

| 变量名 | 用途说明 |
| :--- | :--- |
| `SITE_URL` | 站点公开根地址（如 `https://example.com`），用于生成 canonical、RSS 与 `sitemap.xml` |
| `NEXT_PUBLIC_BASE_PATH` | 子路径前缀（默认留空；Garden 默认面向根域名 `<owner>.github.io` 或自定义域名，子路径非官方推荐用法） |
| `NEXT_PUBLIC_TRAILING_SLASH` | 设为 `1` 时站内链接与导出路径统一带末尾 `/`（`STATIC_EXPORT=1` 时自动启用） |
| `CONTENT_INCLUDE_DRAFTS` | 设为 `1` 时将 `draft: true` 草稿和未来 `publishAt` 文章一并纳入构建 |
| `GITHUB_TOKEN` | 构建期拉取作者 GitHub 公开资料与置顶仓库信息（GitHub Actions 中可传 `${{ github.token }}`） |
| `GISCUS_DISABLED` | 设为 `1` 时显式关闭评论区；未设此项时必须配齐下方 4 个 `GISCUS_*` 变量 |
| `GISCUS_REPO` / `GISCUS_REPO_ID` | Giscus 绑定的公开仓库（`owner/repo`）及其 Repository ID |
| `GISCUS_CATEGORY` / `GISCUS_CATEGORY_ID` | Giscus 绑定的 Discussions 分类名及其 Category ID |
| `WEBMENTION_IO_DOMAIN` | 接收 Webmention 的域名（如 `example.com`）；可选配合 `WEBMENTION_ENDPOINT` |
| `ADMIN_URL` | 独立部署 `/admin` 后台时的地址 |
| `CONTENT_REPOSITORY` / `CONTENT_BRANCH` | `/admin` 后台写入的 GitHub 仓库（`owner/repo`）与分支名（默认 `main`） |
| `CONTENT_GITHUB_TOKEN` | `/admin` 后台向仓库提交随想和附件所用的 GitHub Fine-grained PAT |
| `GITHUB_OAUTH_CLIENT_ID` / `GITHUB_OAUTH_CLIENT_SECRET` | `/admin` 后台 GitHub OAuth 登录应用的 Client ID 与 Secret |
| `GITHUB_SESSION_SECRET` | `/admin` 会话签名的随机密钥字符串 |
| `ADMIN_GITHUB_LOGINS` | 允许登录 `/admin` 后台的 GitHub 用户名白名单（多个用逗号分隔） |
