# 链接卡片刷新（可选）

文章里的链接卡片在构建时就已经完整：标题、简介和本地配图都写进了静态页面，不开 JavaScript 也能看。这个 Worker 只做一件事：读者打开文章时，悄悄问一下对方页面现在的标题和简介，有变化就换上新的文字。配图始终用构建时下载到站内的那张，不会从对方网站直接加载。

## 部署

```bash
npx wrangler deploy --config worker/og/wrangler.toml
```

然后在站点的 `site.config.yaml` 里写上 Worker 地址：

```yaml
linkPreview:
  worker: https://garden-og.<你的子域>.workers.dev
```

不写这一项，页面就不会请求它。

## 它会拒绝什么

- 不是来自 `ALLOWED_ORIGINS`（以及开启 `ALLOW_LOCALHOST` 时的 `http://localhost:*`）的请求。
- 不在站点 `/link-allowlist.json` 里的网址。这份清单由构建生成，只包含已发布文章里写了 `{card}` 的链接。
- 指向本机、内网、链接本地地址或非 80/443 端口的网址；跳转到这些地址的也一样，每一跳都会重新检查。
- 不是 HTML 的页面、超过 1 MB 或 5 秒没读完的页面。
- 同一个 IP 每分钟超过 `RATE_PER_MINUTE` 次的请求。配置了 `RATE_LIMITER` 绑定时用 Cloudflare 的限流，否则按单个实例计数。

结果在边缘缓存 6 小时。Worker 出错或不可用时，页面保持构建时的内容。
