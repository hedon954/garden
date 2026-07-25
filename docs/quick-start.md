# 快速开始

## 1. Fork 并改名

点击 GitHub 的 **Use this template** 或 Fork。为了使用最可靠的根路径 GitHub Pages 部署，请将仓库命名为 `<owner>.github.io`，例如 `alice.github.io`；站点地址将是 `https://alice.github.io`。

若使用自定义域名，仓库名称可自由选择，并在 Actions Variable 中配置 `SITE_URL`。

## 2. 替换身份与样例内容

先编辑以下位置：

- `site.config.json`：站点名、作者、GitHub 用户名、SEO 默认值、首页与关于页文案。
- `content/`：删除或替换所有示例 Markdown 与附件。

内容格式见[内容编写](content-authoring.md)。不要直接编辑 `app/lib/generated-content.ts` 或 `public/media/`，它们由构建生成。

## 3. 在本地验证

```bash
npm ci
cp .env.example .env.local
npm run lint
npm test
```

本地预览使用 `npm run dev`。默认排除草稿和未来定时文章；需要预览时执行：

```bash
CONTENT_INCLUDE_DRAFTS=1 npm run dev
```

## 4. 发布公开博客

按[GitHub Pages 部署](github-pages.md)设置 Pages；将修改推送到 `main`。工作流完成后即可公开访问。

## 5. 按需接入服务

- 评论：配置 Giscus。
- Webmentions：注册 webmention.io。
- 后台：部署一份支持 Node/Worker 运行时的服务，并按[独立管理后台](admin-service.md)设置 OAuth 与仓库写入令牌。

所有敏感值都只放在部署平台的 Secret 中，不提交 `.env.local`。
