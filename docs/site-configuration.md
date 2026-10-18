# 站点界面配置

根目录的 `site.config.yaml` 用于配置站点身份，以及一级页面的主标题和副标题。

```yaml
pages:
  home:
    title: |-
      记一些正在做的事，
      和想清楚的问题。
    subtitle: 在这里写首页介绍。
  blog:
    title: 博文
    subtitle: 在这里写博文页介绍。
```

每个一级页面提供 `title` 与 `subtitle`。关于页还可以写正文，这样换站点时不必改引擎里的页面文件：

```yaml
pages:
  about:
    title: 你好，我是 Alice。
    subtitle: 在这里写下你关心的问题。
    heading: 这个网站为什么存在
    paragraphs:
      - 第一段介绍。
      - 第二段介绍。
    quote: 一句放在引用里的话。
    focus:
      - 现在关注的方向
    cta:
      href: /blog
      label: 从博文开始
```

导航、按钮结构和页面骨架由引擎统一维护。

站点的公开地址写在 `url`：

```yaml
url: https://blog.example.com
```

文章里写成完整网址的站内链接（例如 `https://blog.example.com/blog/hello/`）会按站内链接显示：在当前标签页打开，不带外链图标，也不会生成链接卡片。http 和 https、带不带 `www.`、结尾有没有 `/` 都算同一个站点；其他子域名（例如 `docs.blog.example.com`）仍是外链。链接会改写成 `/blog/hello/` 这样的站内路径，查询参数和 `#` 锚点保留。不写 `url` 时使用构建环境里的 `SITE_URL`；两者都没有，就不做这项识别。

站点图标和浏览器标签页图标写在 `brand`：

```yaml
brand:
  logo: brand/logo.svg            # 站点根目录里的 SVG，显示在站名左边；写 false 不显示
  favicon: /favicon.svg           # public/ 下的地址
  appleTouchIcon: /apple-touch-icon.png
```

都不写时使用 Garden 自带的图标。`logo` 会直接嵌进页面，高 26px，颜色跟随站名：画图标时用 `stroke="currentColor"` 或 `fill="currentColor"`。文件里的脚本和事件属性会被去掉。favicon 可以在 SVG 里用 `@media (prefers-color-scheme: dark)` 为深色标签栏换颜色。`appleTouchIcon` 是 180×180 的 PNG，写 false 不输出。

文章换过地址时，可以在 `redirects` 里列出旧路径和现在的地址，旧链接仍然能打开：

```yaml
redirects:
  /2024/01/20/go/go-gpm/: /blog/go/go-gpm/
  /wiki/rust/04-action/rust-action-httpie.html: /blog/rust-action-httpie/
```

静态导出（例如 GitHub Pages）没有服务器返回 301，构建时会为每个旧路径生成一个小页面：立即跳到新地址，保留链接里的 `#` 锚点，并用 `rel="canonical"` 告诉搜索引擎新地址。跳转页不加 noindex，搜索引擎能顺着跳转和 canonical 把旧地址归到新地址上。新地址指向的页面不存在、或旧路径上已经有页面时，这一条会跳过并在构建日志里提醒，构建照常完成。

作者资料还可以配置 GitHub 降级数据：

```yaml
author:
  name: Your Name
  github: your-github-id
  githubBio: 一句个人简介。
  githubPinned:
    - your-github-id/project-one
    - your-github-id/project-two
```

About 页打开后会直接从 GitHub REST API 同步头像、姓名、bio、位置、公开仓库数和 followers。若 GitHub 当前 `bio` 为空，这一行会隐藏，不会用模板文案冒充 GitHub 资料；只有 GitHub API 无法访问时，`githubBio` 才作为降级文案。

GitHub 个性状态、近 30 天 commits、真正的 pinned repositories 与过去一年的 contributions 热点图来自需要 Token 的 GraphQL API，因此仍在发布时使用工作流的只读 `github.token` 生成，Token 不会暴露到浏览器。本地没有 `GITHUB_TOKEN` 时，`githubPinned` 是置顶仓库的可靠降级来源。

专栏与界面配置分开：专栏标题、描述、封面和文章顺序都在 `content/columns.yaml`；博文正文始终只在 `content/posts/` 维护一份。`posts` 使用相对 `content/posts/` 的多级路径，文章 URL 也与该路径一致。详见[内容编写](content-authoring.md)。

链接卡片在构建时就已完整。想让读者打开文章时顺便拿到对方页面最新的标题和简介，可以部署仓库里的 `worker/og`（见 [worker/og/README.md](../worker/og/README.md)），再在 `site.config.yaml` 里写上它的地址：

```yaml
linkPreview:
  worker: https://garden-og.<你的子域>.workers.dev
```

不写就不会有这一步，页面也不会多出任何请求。
