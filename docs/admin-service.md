# 独立管理后台

`/admin` 是需要服务器能力的独立服务，不能部署到 GitHub Pages。它通过 GitHub OAuth 识别作者，并直接向内容仓库提交 Markdown；提交进入 `main` 后，GitHub Pages 会自动更新公开博客。

## 后台所需环境变量

| Variable | 作用 |
| --- | --- |
| `SITE_URL` | GitHub Pages 的公开博客地址 |
| `CONTENT_REPOSITORY` | 内容仓库，形如 `owner/repository` |
| `CONTENT_BRANCH` | 内容分支，通常为 `main` |
| `CONTENT_GITHUB_TOKEN` | Fine-grained PAT，授予该仓库 Contents: Read and write |
| `GITHUB_OAUTH_CLIENT_ID` | GitHub OAuth App Client ID |
| `GITHUB_OAUTH_CLIENT_SECRET` | GitHub OAuth App Client secret |
| `GITHUB_SESSION_SECRET` | 至少 32 个随机字符的后台会话密钥 |
| `ADMIN_GITHUB_LOGINS` | 允许登录的 GitHub 用户名，用逗号分隔 |
| `GITHUB_OAUTH_REDIRECT_URI` | 可选；反向代理或多域名时显式指定 OAuth 回调地址 |

后台地址假设为 `https://admin.example.com` 时，OAuth App 的 Callback URL 是：

```text
https://admin.example.com/api/auth/github/callback
```

后台写入仓库时使用 `CONTENT_GITHUB_TOKEN`，而不是 OAuth 登录令牌。这样访问者的登录授权只负责身份识别，内容写入权限始终留在服务端。

## 三种部署方式

公开博客始终部署在 GitHub Pages；以下方式只部署带 `/admin` 与 `/api/*` 的独立后台。三者使用同一组环境变量与同一份源码，域名不同只需同步更新 `ADMIN_URL`、OAuth Callback URL 和 Pages 的 `ADMIN_URL` Variable。

### 1. 本地部署

复制 `.env.example` 为 `.env.admin.local`，填入后台变量后运行：

```bash
npm ci
npm run admin:local
```

后台监听 `http://localhost:3000/admin`。本地 OAuth App 回调地址为：

```text
http://localhost:3000/api/auth/github/callback
```

也可使用容器保持后台常驻：

```bash
cp .env.example .env.admin.local
docker compose -f docker-compose.admin.yml up --build -d
```

### 2. 阿里云

仓库提供 `Dockerfile`，可部署到 ECS、ACK 或任意兼容 OCI 镜像的阿里云服务。最小 ECS 流程：

```bash
docker build -t markdown-blog-admin .
docker run -d --name markdown-blog-admin --env-file .env.admin.local \
  -p 3000:3000 --restart unless-stopped markdown-blog-admin
```

在 SLB、Nginx 或应用网关上把 HTTPS 域名反向代理到 `3000` 端口。生产环境必须让 `SITE_URL` 指向 GitHub Pages，`GITHUB_OAUTH_REDIRECT_URI` 指向这个 HTTPS 后台域名。镜像可以推送至阿里云容器镜像服务后由 ECS/ACK 拉取；不把 `.env.admin.local` 打进镜像。

### 3. Cloudflare Workers

本地安装并登录 Wrangler 后：

```bash
npx wrangler login
npm run admin:cloudflare -- --name your-blog-admin
```

也可以在 GitHub 仓库设置 `CLOUDFLARE_API_TOKEN`、`CLOUDFLARE_ACCOUNT_ID` 两个 Actions Secret，然后手动运行 **Deploy admin to Cloudflare** 工作流并输入 Worker 名称。部署后在 Cloudflare Dashboard 为 Worker 配置环境变量与 Secrets，再绑定后台域名。

Cloudflare 的构建产物由 `vinext build` 生成在 `dist/server/`；工作流使用其中的 `wrangler.json` 与 `dist/client` 静态资产。不要把公开博客改部署到 Worker，公开端仍应保持 GitHub Pages。

## 发布模型

- 发布随想：创建或更新 `content/thoughts/<slug>.md`；草稿使用 `draft: true`。
- 本地媒体：后台可将不超过 10 MB 的图片、音频、视频上传到 `content/uploads/`，随后随想用相对路径引用它；大文件使用对象存储或 CDN URL。
- 撤回或删除：更新或删除同一个 Markdown 文件。
- 置顶博文：编辑对应博文 front matter 的 `pinned: true`。
- 分发：后台向 X 或你配置的 CSDN、知乎、掘金 webhook 发出请求；不保存正文副本。

因此 Git 仓库始终是唯一内容真源；即使后台服务更换，公开博客仍可完整构建。
