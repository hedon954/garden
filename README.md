# Markdown Blog Kit

一个可 fork 的个人博客系统：公开阅读端由 GitHub Pages 静态托管，内容以 Typora 兼容 Markdown 为唯一真源；独立管理后台可通过 GitHub 登录发布随想、管理草稿与触发分发。

> 这是完整系统而不是 CMS 黑盒：文章、专栏、随想和配置都在 Git 仓库中，任何时候都可以脱离后台继续维护与部署。

## 30 秒开始

1. 用 **Use this template** 或 Fork 创建仓库，建议命名为 `<你的 GitHub 用户名>.github.io`。
2. 在 GitHub 的 **Settings → Pages** 将 Source 设为 **GitHub Actions**。
3. 修改 `content/` 中的示例 Markdown，提交到 `main`。
4. 等待 `Deploy public blog to GitHub Pages` 工作流完成，访问 `https://<你的用户名>.github.io`。

详细操作见[快速开始](docs/quick-start.md)与[GitHub Pages 部署](docs/github-pages.md)。

## 系统组成

| 部分 | 负责什么 | 是否必需 |
| --- | --- | --- |
| GitHub Pages | 博文、专栏、随想、搜索、RSS、站点地图 | 必需 |
| `content/` | 所有公开内容与本地附件 | 必需 |
| 独立后台服务 | GitHub 登录、发布随想、跨平台分发 | 可选 |
| Giscus / Webmention.io | 评论与 Webmentions | 可选 |

## 内容位置

- `content/posts/*.md`：普通博文
- `content/columns/<column>/*.md`：主题专栏
- `content/thoughts/*.md`：随想；支持一篇中多个不同或相同类型的附件

执行 `npm run content:sync` 会校验 front matter、复制本地附件并生成内容索引、RSS、sitemap 与 robots 文件。

## 本地开发

需要 Node.js `>=22.13.0`。

```bash
npm ci
cp .env.example .env.local
npm run dev
```

```bash
npm run lint
npm test
```

## 文档

- [功能特性](docs/features.md)
- [快速开始](docs/quick-start.md)
- [GitHub Pages 部署](docs/github-pages.md)
- [内容编写与 Typora](docs/content-authoring.md)
- [独立管理后台](docs/admin-service.md)
- [外部集成：评论、Webmention、分发](docs/integrations.md)
- [技术架构](docs/architecture.md)
- [系统实现：从 Markdown 到已发布页面](docs/system-implementation.md)
- [维护、故障排查与安全](docs/operations.md)

管理后台可在本地运行、使用 Docker 部署到阿里云，或通过 GitHub Actions 一键部署到 Cloudflare Workers；具体步骤见[独立管理后台](docs/admin-service.md)。

## 许可证

[MIT](LICENSE)。Fork 后请将站点名称、作者资料、内容、域名与第三方凭据替换为自己的信息。
