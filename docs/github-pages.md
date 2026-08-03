# 用 GitHub Pages 部署公开博客

Garden 支持两种发布方式。两种方式都只发布静态阅读端：博文、专栏、随想、搜索、RSS、Sitemap、Giscus、Webmentions 与 Mermaid；管理后台仍需独立部署。

## 方式一：公开源码单仓

这是最简单的默认方式，适合愿意公开 Markdown 和 Git 历史的博客。

1. 使用 Garden 模板创建公开仓库，推荐命名为 `<owner>.github.io`。
2. 在 **Settings → Pages** 中把 Source 设为 **GitHub Actions**。
3. 在 **Settings → Actions → General** 中允许工作流发布 Pages。
4. 推送一次 `main`，等待 **Verify and publish blog** 完成。

未设置 `PAGES_REPOSITORY` 时，工作流会使用 GitHub 官方 Pages Artifact 直接发布当前仓库。

## 方式二：GitHub Free 私有源码双仓

这种方式把草稿、原图、配置和 Git 历史留在私有源码仓库，只让生成后的 HTML、CSS、JavaScript 和公开媒体进入 Pages 仓库。

```text
私有 source-repository
  -> GitHub Actions 构建 dist/client
  -> 公开 <owner>.github.io
  -> GitHub Pages
```

### 1. 创建两个仓库

- 私有源码仓库：使用 Garden 模板创建，例如 `owner/blog-source`。
- 公开产物仓库：命名为 `owner/owner.github.io`，创建时加入 README 以建立 `main` 分支。

公开产物仓库不得手工编辑。每次发布都会把它替换为当前静态产物，并保留单个滚动部署提交。

### 2. 创建专用 Deploy Key

生成一对只用于发布的 SSH 密钥：

```bash
ssh-keygen -t ed25519 -C "garden-pages-deploy" -f garden-pages-deploy
```

然后分别保存：

1. 在公开产物仓库 **Settings → Deploy keys** 添加公钥 `garden-pages-deploy.pub`，勾选 **Allow write access**。
2. 在私有源码仓库 **Settings → Secrets and variables → Actions → Secrets** 新建 `PAGES_DEPLOY_KEY`，内容为私钥 `garden-pages-deploy`。
3. 确认 GitHub 已保存后，删除本地临时密钥文件。

Deploy Key 只拥有公开产物仓库的权限，不要复用管理后台的 PAT。

### 3. 指定公开产物仓库

在私有源码仓库的 Actions Variables 中设置：

```text
PAGES_REPOSITORY=owner/owner.github.io
```

之后继续在私有源码仓库运行：

```bash
make update
```

命令只提交并推送源码。Actions 检查内容、执行静态构建，再通过 Deploy Key 更新公开仓库；不需要第二条本地命令。

### 4. 配置公开仓库 Pages

在公开产物仓库 **Settings → Pages** 中选择：

```text
Source: Deploy from a branch
Branch: main
Folder: /(root)
```

工作流会自动加入 `.nojekyll`。构建或推送失败时不会改动公开仓库，线上继续保留上一个成功版本。

公开产物仓库只承担静态托管：关闭 Issues、Wiki、Projects 和 Dependabot 更新，不创建源码分支或工作流。不要给 `main` 添加会阻止 Deploy Key 强制更新的规则；每次发布都会创建无父提交的新快照，因此历史不会持续累积。

## Actions Variables

除双仓模式的 `PAGES_REPOSITORY` 外，其余构建配置都放在源码仓库：

| Variable | 何时需要 | 示例 |
| --- | --- | --- |
| `SITE_URL` | 自定义域名 | `https://blog.example.com` |
| `ADMIN_URL` | 已部署独立管理后台后 | `https://admin.example.com` |
| `GISCUS_REPO`、`GISCUS_REPO_ID`、`GISCUS_CATEGORY`、`GISCUS_CATEGORY_ID` | 启用 Giscus 时 | 见[外部集成](integrations.md) |
| `WEBMENTION_IO_DOMAIN` | 启用 Webmentions 时 | `blog.example.com` |
| `ANALYTICS_DOMAIN`、`ANALYTICS_SCRIPT` | 使用无 Cookie 统计时 | `blog.example.com`、脚本 URL |
| `PAGES_REPOSITORY` | GitHub Free 私有源码双仓 | `owner/owner.github.io` |

`SITE_URL` 应为最终公开地址，不要带结尾 `/`。当前版本以根域名 Pages 站点或自定义域名为标准路径，避免项目子路径破坏动态文章路由。

## 自定义域名迁移

将已有站点迁移到新的公开产物仓库时：

1. 先在个人账号 **Settings → Pages → Verified domains** 验证域名。
2. 先让新仓库通过默认 `github.io` 地址完成部署。
3. 再从旧 Pages 解除自定义域名，并立即绑定到新仓库。
4. 等待证书批准后开启 **Enforce HTTPS**。

不要在域名尚未验证时长时间留下“DNS 仍指向 GitHub、但没有仓库绑定域名”的空档。

### 从已有单仓站点迁移

1. 在账号级 Pages 设置完成域名验证；完成前保持旧 Pages 与自定义域名不动。
2. 保存当前仓库的 Git bundle，并记录 Pages、Actions Variables、Secrets、Environment、分支和仓库功能设置。
3. 用正式环境变量完成一次静态导出，运行 `npm run pages:validate` 保存首份产物。
4. 将原仓库改名为私有源码仓库名，更新本地 `origin`，并保留 Garden 的 `upstream`。
5. 新建公开 `<owner>.github.io`，用首份产物创建 `main`，再设置为 **Deploy from a branch → main → /(root)**。
6. 先用默认 `github.io` 地址验收，再把自定义域名从旧仓库立即切换到新仓库并恢复 HTTPS。
7. 新站稳定后，将源码仓库改为私有，删除其中失效的 Pages 设置和 `github-pages` Environment。
8. 安装 Deploy Key、设置 `PAGES_REPOSITORY`，首次自动发布成功后再清理临时密钥与公开产物仓库的非必要功能。

原仓库的 Pull Request、Dependabot 分支和 Git 历史会跟随改名后的源码仓库；新产物仓库不应复制这些内容。已经公开过的提交可能已被克隆，迁移只能保护今后的草稿与历史。

## 发布与回滚

直接编辑源码仓库 `content/` 下的 Markdown，再运行 `make update`。工作流会校验 front matter、排除草稿、复制附件、生成索引、RSS、Sitemap 和静态页面。

公开产物仓库不是内容真源，也不接受人工修复。需要回滚时，在源码仓库还原对应提交并重新运行工作流；下一次成功发布会重建完整站点。
