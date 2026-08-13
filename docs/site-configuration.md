# 站点界面配置

根目录的 `site.config.yaml` 用于配置站点身份，以及一级页面的主标题和副标题。

```yaml
pages:
  home:
    title: |-
      把复杂的事，
      慢慢想明白。
    subtitle: 在这里写首页介绍。
  blog:
    title: 长期写下去，偶尔回头整理。
    subtitle: 在这里写博文页介绍。
```

每个页面只提供 `title` 与 `subtitle` 两个文案入口。导航、按钮、分区标题和页面结构由模板统一维护，不需要逐项配置。

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
