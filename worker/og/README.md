# 链接卡片刷新（可选）

文章里的链接卡片在构建时就已经完整：标题、简介和本地配图都写进了静态页面，不开 JavaScript 也能看。这个 Worker 只做一件事：读者打开文章时，悄悄问一下对方页面现在的标题和简介，有变化就换上新的文字。配图始终用构建时下载到站内的那张，不会从对方网站直接加载。

## Worker 部署说明

### 1. 目录和入口

- 目录：`worker/og/`，CI 不会部署它，需要时手动部署。
- 入口：`worker/og/index.mjs`（`wrangler.toml` 里的 `main`），请求处理逻辑在 `handler.mjs`，抓取和解析页面用的是与构建共用的 `scripts/link-meta-core.mjs`。

```bash
npx wrangler deploy --config worker/og/wrangler.toml
```

部署后得到 `https://garden-og.<你的子域>.workers.dev`。

### 2. 变量和绑定

在 `wrangler.toml` 的 `[vars]` 里设置：

| 变量 | 作用 | 默认 |
|---|---|---|
| `SITE_ORIGIN` | 站点地址，Worker 从 `${SITE_ORIGIN}/link-allowlist.json` 读取允许的网址 | `https://hedon.top` |
| `ALLOWED_ORIGINS` | 允许调用的页面来源，逗号分隔；其他来源一律 403 | 同 `SITE_ORIGIN` |
| `ALLOW_LOCALHOST` | 设为 `"1"` 时也接受 `http://localhost:*` 和 `http://127.0.0.1:*`，方便本地预览 | `"1"` |
| `RATE_PER_MINUTE` | 每个 IP 每分钟最多请求次数，超出返回 429 | `30` |

可选绑定 `RATE_LIMITER`：Cloudflare 的限流绑定（`wrangler.toml` 里有注释掉的示例），跨实例共享计数。不配置时按单个实例内存计数。

缓存用 Workers 自带的边缘缓存（`caches.default`），不需要 KV 绑定：读到的结果缓存 24 小时，读取失败缓存 10 分钟，这段时间内不会再去请求对方网站。

### 3. 允许名单从哪来，怎么更新

- 站点每次 `garden build` 时生成 `public/link-allowlist.json`，内容是已发布文章里所有写了 `{card}` 的链接。它随站点一起部署，不需要提交到仓库。
- Worker 不内置名单，运行时从站点读取：每个实例最多 5 分钟重新拉一次，Cloudflare 对这份文件的缓存也是 5 分钟。
- 所以新文章发布后，最迟约 10 分钟 Worker 就认得新链接，**不需要重新部署 Worker**。只有改了变量或 Worker 代码时才需要重新部署。
- 名单拉取失败时沿用上一份；一份都没有时拒绝所有网址。

### 4. 站点里在哪里填 Worker 地址

在站点仓库（例如 garden-blog）的 `site.config.yaml` 里：

```yaml
linkPreview:
  worker: https://garden-og.<你的子域>.workers.dev
```

不写这一项，页面就不会请求 Worker，卡片保持构建时的内容。只有包含 `{card}` 的文章页面才会加载刷新脚本。

## 它会拒绝什么

- 不是来自 `ALLOWED_ORIGINS`（以及开启 `ALLOW_LOCALHOST` 时的 `http://localhost:*`）的请求。
- 不在站点 `/link-allowlist.json` 里的网址。
- 指向本机、内网、链接本地地址或非 80/443 端口的网址；跳转到这些地址的也一样，每一跳都会重新检查。
- 不是 HTML 的页面、超过 1 MB 或 5 秒没读完的页面。
- 同一个 IP 每分钟超过 `RATE_PER_MINUTE` 次的请求。

浏览器端每张卡片的请求各自 6 秒超时，一张卡片慢不会影响其他卡片；离开页面时所有请求一起取消。Worker 出错或不可用时，页面保持构建时的内容。
