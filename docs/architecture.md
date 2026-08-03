# 技术架构

## 部署边界

```mermaid
flowchart LR
  A[Typora / GitHub 编辑器] --> B[源码仓库 content/]
  C[独立管理后台] -->|GitHub Contents API| B
  B -->|push main| D[GitHub Actions]
  D -->|单仓: Pages Artifact| E[GitHub Pages 公开博客]
  D -->|双仓: 静态产物| H[公开产物仓库]
  H --> E
  F[GitHub OAuth] --> C
  G[Giscus / Webmention] --> E
```

公开博客是静态输出：构建期读取 `content/`，生成路由、搜索索引、RSS、sitemap、robots 和媒体副本。默认单仓模式直接上传 Pages Artifact；GitHub Free 私有源码模式则把 `dist/client` 写入独立公开仓库。两种模式的公开结果相同，GitHub Pages 都不需要 OAuth、后台 PAT 或数据库凭据。

后台是可选的独立服务。它保存短期会话、使用 GitHub OAuth 验证登录用户是否在白名单，然后使用服务器端 `CONTENT_GITHUB_TOKEN` 创建或更新 Markdown。内容的权威副本始终在 Git 仓库。

## 代码模块

| 位置 | 职责 |
| --- | --- |
| `content/` | 唯一内容源 |
| `scripts/build-content.mjs` | 校验、媒体复制、内容索引、静态订阅文件 |
| `app/` | Next/Vinext 阅读页、Markdown 渲染、搜索与后台接口 |
| `scripts/prepare-pages-output.mjs` | 校验公开产物并准备生成文件仓库 |
| `.github/workflows/pages.yml` | `main` 检查、静态构建与单仓/双仓发布 |
| `.github/workflows/verify.yml` | Pull Request 的 lint、测试与静态导出验收 |

## 安全边界

公开构建只读取 Actions Variables（例如 `SITE_URL`）。双仓发布额外读取 `PAGES_DEPLOY_KEY`，该 Deploy Key 只能写公开产物仓库；它不能读取私有源码，也不交给后台。OAuth Client Secret、会话密钥、内容仓库 PAT 与外部平台令牌只保存于后台服务的 Secret。源码仓库中仍不得出现任何真实令牌或 `.env.local`。
