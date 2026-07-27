# Garden

用 Markdown 写作、用 GitHub Pages 发布的个人博客模板。

Garden 的目标很简单：先让你拥有一个能长期写下去的站点。文章留在仓库里，公开站点由 GitHub 自动发布；评论、随想后台和对象存储等能力，都可以等真正需要时再接入。

## 先完成这三件事

1. 点击 **Use this template**，创建自己的仓库。推荐命名为 `<你的 GitHub 用户名>.github.io`，这样会得到根地址 `https://<你的 GitHub 用户名>.github.io`。
2. 打开仓库的 **Settings → Pages**，将 Source 设为 **GitHub Actions**。
3. 修改 `site.config.yaml`，然后在 `content/posts/` 新建第一篇 Markdown。

完成后运行：

```bash
make update
```

它会把本次改动提交并推送到 GitHub；Pages 工作流完成后，站点自动更新。初次使用请跟着 [从零开始](docs/quick-start.md) 做一遍。

## 日常写作只需要知道这些

| 你想做什么 | 从哪里开始 |
| --- | --- |
| 写一篇博文 | [新建文章](docs/content-authoring.md#新建一篇博文) |
| 添加封面、图片、代码或公式 | [丰富文章内容](docs/content-authoring.md#丰富文章内容) |
| 保存为草稿或置顶文章 | [草稿与置顶](docs/content-authoring.md#草稿与置顶) |
| 建一个主题专栏 | [创建专栏](docs/content-authoring.md#创建专栏) |
| 发布一条带多媒体的随想 | [发布随想](docs/content-authoring.md#发布随想) |
| 改网站名称、作者和一级页标题 | [站点配置](docs/site-configuration.md) |
| 发布本次改动 | `make update` |

## 常用命令

```bash
make dev       # 本地预览
make check     # 检查内容与运行测试
make build     # 构建公开站点
make update    # 提交并发布本次改动
```

需要自定义提交说明时：

```bash
make update MESSAGE="新增一篇文章"
```

`make update` 会提交工作区中所有改动；不想发布的文件请先移出仓库或加入 `.gitignore`。

## 进一步配置

首次跑通以后，再按需查看：

- [评论、Webmentions 与内容分发](docs/integrations.md)
- [随想管理后台](docs/admin-service.md)
- [GitHub Pages 与自定义域名](docs/github-pages.md)
- [系统怎么工作](docs/architecture.md)
- [全部文档](docs/README.md)

## 许可证

[MIT](LICENSE)。使用或 Fork Garden 构建的站点请保留页脚中的 Garden 署名链接。
