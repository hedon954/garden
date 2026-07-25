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

后台地址假设为 `https://admin.example.com` 时，OAuth App 的 Callback URL 是：

```text
https://admin.example.com/api/auth/github/callback
```

后台写入仓库时使用 `CONTENT_GITHUB_TOKEN`，而不是 OAuth 登录令牌。这样访问者的登录授权只负责身份识别，内容写入权限始终留在服务端。

## 发布模型

- 发布随想：创建或更新 `content/thoughts/<slug>.md`；草稿使用 `draft: true`。
- 撤回或删除：更新或删除同一个 Markdown 文件。
- 置顶博文：编辑对应博文 front matter 的 `pinned: true`。
- 分发：后台向 X 或你配置的 CSDN、知乎、掘金 webhook 发出请求；不保存正文副本。

因此 Git 仓库始终是唯一内容真源；即使后台服务更换，公开博客仍可完整构建。
