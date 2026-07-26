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
| `OSS_ENDPOINT` | OSS 区域 Endpoint，例如 `https://oss-cn-hangzhou.aliyuncs.com` |
| `OSS_BUCKET` | 存放公开媒体的 Bucket 名称 |
| `OSS_ACCESS_KEY_ID` / `OSS_ACCESS_KEY_SECRET` | 仅授予该 Bucket 指定前缀写入权限的 RAM 凭据 |
| `OSS_PREFIX` | 可选；对象前缀，默认 `blog-media` |
| `OSS_PUBLIC_BASE_URL` | 可选；绑定 CDN/自定义域名后的公开媒体根地址 |
| `OSS_MAX_UPLOAD_MB` | 可选；单文件上限，默认 200 |

后台地址假设为 `https://admin.example.com` 时，OAuth App 的 Callback URL 是：

```text
https://admin.example.com/api/auth/github/callback
```

后台写入仓库时使用 `CONTENT_GITHUB_TOKEN`，而不是 OAuth 登录令牌。这样访问者的登录授权只负责身份识别，内容写入权限始终留在服务端。

## 阿里云 OSS 媒体上传

图片、音频和视频不会进入 Git 仓库。后台校验登录者与文件元数据后，使用后台保存的 OSS AccessKey 为单个对象签发十分钟有效、固定对象路径和限定大小的 Post Policy；浏览器随后直接上传到 OSS，Markdown 只保存公开 URL。

因此需要在 OSS Bucket 设置中完成两件事：

1. 配置 CORS，允许后台域名 `POST` 到 Bucket；允许的请求头至少包含 `*`，暴露头包含 `ETag`。
2. 让媒体对象可公开读取，或为 `OSS_PUBLIC_BASE_URL` 配置可公开访问的 CDN/自定义域名。RAM 用户只应拥有 `${OSS_PREFIX:-blog-media}/*` 的写入权限，不要使用主账号 AccessKey。

后台不会把 `OSS_ACCESS_KEY_SECRET`、Policy 签名以外的凭据发到浏览器；Policy 到期或文件大小超限后上传会被 OSS 拒绝。大文件不经过后台服务，因此不会受 Git 历史或后台运行时磁盘限制。

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
- 本地媒体：后台直接上传图片、音频、视频到阿里云 OSS；随想只保存 OSS/CDN URL，不保存二进制文件到 Git。
- 撤回或删除：更新或删除同一个 Markdown 文件。
- 置顶博文：编辑对应博文 front matter 的 `pinned: true`。
- 分发：后台向 X 或你配置的 CSDN、知乎、掘金 webhook 发出请求；不保存正文副本。

因此 Git 仓库始终是唯一内容真源；即使后台服务更换，公开博客仍可完整构建。
