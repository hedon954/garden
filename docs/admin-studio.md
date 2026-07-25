# 内容管理后台

`/admin` 是独立于公开博客导航的运营入口。它不会编辑普通博文或专栏正文：这些内容继续以 `content/` 中的 Typora Markdown 文件为唯一真源。

## 随想

后台发布的随想保存到 D1。发布后会立即出现在 `/thoughts` 和对应的永久链接中；草稿只在后台出现。每条随想可附加多个 http(s) 地址，图片、音频、视频和链接可以混用。

首次部署会应用 `drizzle/0000_lazy_albert_cleary.sql`，建立随想与分发任务表。

## 访问控制

后台通过 GitHub OAuth 登录识别访问者，并只允许 `ADMIN_GITHUB_LOGINS` 中列出的 GitHub 用户名进入。在线上设置 `GITHUB_OAUTH_CLIENT_ID`、`GITHUB_OAUTH_CLIENT_SECRET`、`GITHUB_SESSION_SECRET` 与允许名单后，再访问 `/admin`；不要把密钥或令牌写进仓库。

在 GitHub 的 OAuth App 设置中，将回调地址填写为：

```text
https://你的正式域名/api/auth/github/callback
```

后台只请求 `read:user` 身份范围，不读取仓库内容。OAuth App 的 Client Secret 只在服务端交换 GitHub 回调 code 时使用，不会发送给浏览器。

## 内容分发

普通博文和专栏会在后台列出，但只读。后台可以复制标题、栏目和公开链接，并为目标平台创建分发动作：

- **X**：填写 `X_USER_ACCESS_TOKEN` 后，后台调用 X 的发帖接口；令牌必须有用户上下文的写入权限。
- **CSDN、知乎、掘金**：填写对应的 `*_SYNC_WEBHOOK`，由你可信的发布桥接服务接收下列 JSON 并完成各平台的 OAuth、格式转换与发布。

```json
{
  "platform": "zhihu",
  "title": "文章标题",
  "markdown": "Typora Markdown 正文",
  "summary": "文章摘要",
  "canonicalUrl": "https://hedon.top/blog/example",
  "tags": ["标签"]
}
```

没有凭据时，后台不会假装已同步：任务会明确标为“等待凭据”，并保留一键复制分发包的人工发布路径。
