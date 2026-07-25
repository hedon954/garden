# 外部集成

## Giscus 评论

1. 准备公开 GitHub 仓库并开启 Discussions。
2. 安装 [Giscus App](https://giscus.app/zh-CN)。
3. 在 Giscus 页面选择仓库与分类，复制仓库、仓库 ID、分类、分类 ID。
4. 在 GitHub Actions Variables 设置 `GISCUS_REPO`、`GISCUS_REPO_ID`、`GISCUS_CATEGORY`、`GISCUS_CATEGORY_ID`；本地使用 `.env.local`。

`NEXT_PUBLIC_` 配置会出现在浏览器，这是 Giscus 的正常公开配置；不要填入 GitHub PAT 或 OAuth Secret。

## Webmentions

1. 用最终公开域名登录 [webmention.io](https://webmention.io/)。
2. 设置 `WEBMENTION_IO_DOMAIN`，并确保 `SITE_URL` 是完全一致的公开地址。
3. 发布后运行 `npm run webmentions:send`，或在 GitHub Actions 手动运行 **Send Webmentions** 工作流；它会从 RSS 发现外链并发送 mention。

接收端会自动使用 webmention.io 的公开 API。没有配置时页面会提示待接入，不会伪造数据。

## 跨平台分发

- **X**：后台配置 `X_USER_ACCESS_TOKEN` 后直接请求其发帖 API；令牌必须具备用户写入权限。
- **CSDN、知乎、掘金**：设置 `CSDN_SYNC_WEBHOOK`、`ZHIHU_SYNC_WEBHOOK`、`JUEJIN_SYNC_WEBHOOK`，由你信任的桥接服务完成各平台 OAuth 与格式转换。

后台还提供复制标题、栏目和公开链接的降级路径。平台 API 与权限政策经常变化，因此不承诺绕过人工审核或自动化限制。
