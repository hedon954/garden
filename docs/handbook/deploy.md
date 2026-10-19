---
title: 发布到 GitHub Pages 与可选功能
description: 用单仓库或「私有草稿仓 + 公开展示仓」发布到 GitHub Pages，按需开启 Giscus 评论和手机端发随想。
section: getting-started
order: 3
---

## 自动发布到 GitHub Pages

用 `npx hd-garden init` 创建的仓库已经带好了 GitHub Actions 自动发布配置（`.github/workflows/pages.yml`）。

把仓库推到 GitHub 后，只需要在 GitHub 仓库网页上打开 **Settings → Pages**，把 **Build and deployment → Source** 选成 **GitHub Actions**。之后每次运行 `make update`（或者 `git push`），GitHub 就会自动帮你检查语法、生成网页并发布上线。

```garden compare
items:
  - title: 单个公开仓库（最省事）
    text: 直接在公开仓库写文章，推送后自动发到 GitHub Pages。
    草稿可见性: 仓库可见
    适合谁: 公开原稿的个人博客
  - title: 私有仓库写稿 + 公开仓库展示
    text: 平时在私有仓库存草稿，只把生成的网页自动推到公开仓库。
    草稿可见性: 仅自己可见
    适合谁: 不想公开半成品原稿
```

## 怎么用「私有仓库写稿 + 公开仓库展示」

如果你不想让别人看到还没写完的草稿（`draft: true`），可以建两个仓库：一个**私有仓库**用来平时写稿，一个**公开仓库**（比如 `<你的用户名>.github.io`）用来对外展示网页。

只需要在**私有写作仓库**的 GitHub 网页上打开 **Settings → Secrets and variables → Actions**，填两个配置：

1. 在 **Variables** 标签页新建一个变量 `PAGES_REPOSITORY`，值填你的公开仓库名（比如 `octocat/octocat.github.io`）；
2. 在 **Secrets** 标签页新建一个密钥 `PAGES_DEPLOY_TOKEN`，值填一个有那个公开仓库读写权限的 GitHub Personal Access Token。

配好以后，你平时只需要在私有仓库里运行 `make update`，生成的静态网页就会自动同步到公开仓库。

## 评论区与可选环境变量

评论区、自定义子路径和手机端发随想都是可选功能，不配的时候不会加载任何多余的第三方脚本：

| 环境变量 | 用在什么地方 | 说明 |
| :--- | :--- | :--- |
| `SITE_URL` | 打包构建时 | 覆盖 `site.config.yaml` 里的 `url` 域名。 |
| `SITE_BASE_PATH` | 打包构建时 | 如果网站不是挂在域名根目录，而是挂在子目录（如 `https://example.com/blog`），填 `/blog`。 |
| `CONTENT_INCLUDE_DRAFTS` | 本地预览时 | 设为 `1` 时，把标了 `draft: true` 的草稿和定时文章也显示出来。 |
| `NEXT_PUBLIC_GISCUS_REPO` | 文章底部评论 | 开启 Giscus 评论区（基于 GitHub Discussions），填 `用户名/仓库名`。 |
| `NEXT_PUBLIC_GISCUS_REPO_ID` | 文章底部评论 | Giscus 提供的仓库 ID（配合下面两项一起填入即可显示评论框）。 |
| `NEXT_PUBLIC_GISCUS_CATEGORY` | 文章底部评论 | GitHub Discussions 的分类名（如 `General` 或 `Announcements`）。 |
| `NEXT_PUBLIC_GISCUS_CATEGORY_ID` | 文章底部评论 | 对应的分类 ID。 |
| `NEXT_PUBLIC_WEBMENTION_DOMAIN` | 文章底部互动 | 接收并显示其他独立博客对本文的 Webmention 引用。 |

## `/admin` 随想速记页面（可选）

如果你部署在支持服务端运行的环境（比如 Vercel 或自己的服务器），可以配好 GitHub 登录环境变量（`GITHUB_CLIENT_ID`、`GITHUB_CLIENT_SECRET`、`ADMIN_GITHUB_USER`、`ADMIN_SESSION_SECRET`）来启用 `/admin` 页面。

它的用途很单纯：方便你在手机或平板上随手发一条带图的随想、切换哪篇文章置顶，或者把写好的文章转成适合发社交平台的纯文本格式。所有操作都会直接变成你 Git 仓库里的一次正常提交，不需要额外部署数据库。
