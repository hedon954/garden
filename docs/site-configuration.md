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

专栏与界面配置分开：专栏标题、描述、封面和文章顺序都在 `content/columns.yaml`；博文正文始终只在 `content/posts/` 维护一份。`posts` 可使用相对 `content/posts/` 的多级路径，也兼容 slug。详见[内容编写](content-authoring.md)。
