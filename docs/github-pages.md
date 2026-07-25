# 用 GitHub Pages 部署公开博客

公开博客由 GitHub Pages 托管，`main` 分支的每一次内容提交都会自动构建和发布。它只包含可静态生成的阅读端：博文、专栏、随想、搜索、RSS、Sitemap、Giscus、Webmentions 与 Mermaid 都能正常工作。

## 首次部署

1. Fork 本仓库，或使用 GitHub 的 **Use this template** 创建自己的仓库。
2. 在仓库 **Settings → Pages** 中把 Source 设为 **GitHub Actions**。
3. 在仓库 **Settings → Actions → General** 中允许工作流读写 Pages。
4. 推送一次 `main`，等待 `Deploy public blog to GitHub Pages` 工作流完成。

请将仓库命名为 `<owner>.github.io`，例如 `alice.github.io`；博客会部署到 `https://alice.github.io`。也可以在 GitHub Pages 中绑定自定义域名。

## 自定义域名和路径

在仓库 **Settings → Secrets and variables → Actions → Variables** 中设置：

| Variable | 何时需要 | 示例 |
| --- | --- | --- |
| `SITE_URL` | 自定义域名 | `https://blog.example.com` |
| `ADMIN_URL` | 已部署独立管理后台后 | `https://admin.example.com` |
| `GISCUS_REPO`、`GISCUS_REPO_ID`、`GISCUS_CATEGORY`、`GISCUS_CATEGORY_ID` | 启用 Giscus 时 | 见 [外部集成](integrations.md) |
| `WEBMENTION_IO_DOMAIN` | 启用 Webmentions 时 | `blog.example.com` |
| `ANALYTICS_DOMAIN`、`ANALYTICS_SCRIPT` | 使用无 Cookie 统计时 | `blog.example.com`、脚本 URL |

`SITE_URL` 应为最终公开域名，不要带结尾 `/`。当前版本以根域名 Pages 站点为标准路径，以避免静态导出工具在项目子路径下错误处理动态文章路由。

## 发布内容

直接在 GitHub 网页编辑 `content/` 下的 Markdown 后提交即可。工作流会校验 front matter、复制附件、生成索引、RSS、sitemap 和静态页面。构建失败不会覆盖已上线版本。

公开端不保存任何 OAuth 密钥或发布令牌；需要 GitHub OAuth、发布随想或跨平台分发时，使用独立后台，见 [独立管理后台](admin-service.md)。
