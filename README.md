# Garden

用 Markdown 写作、用 GitHub Pages 发布的个人博客引擎。

站点仓库只保存稿件和身份：`content/` 与 `site.config.yaml`。页面、构建和发布工作流来自这个 Garden 包。

## 新建站点

```bash
npx github:hedon954/garden init my-blog
cd my-blog
npm install
```

推荐把 GitHub 仓库命名为 `<你的 GitHub 用户名>.github.io`，并在 **Settings → Pages** 把 Source 设为 **GitHub Actions**。然后修改 `site.config.yaml`，再写第一篇 Markdown。

也可以继续用 **Use this template**；该仓库同时是可运行的演示站。

完成后运行：

```bash
make update
```

它会把本次改动提交并推送到源码仓库；发布工作流完成后，站点自动更新。初次使用请跟着[从零开始](docs/quick-start.md)做一遍。

## 日常写作只需要知道这些

| 你想做什么 | 从哪里开始 |
| --- | --- |
| 写一篇博文 | [新建文章](docs/content-authoring.md#新建一篇博文) |
| 添加封面、图片、代码或公式 | [丰富文章内容](docs/content-authoring.md#丰富文章内容) |
| 保存为草稿或置顶文章 | [草稿与置顶](docs/content-authoring.md#草稿与置顶) |
| 建一个主题专栏 | [创建专栏](docs/content-authoring.md#创建专栏) |
| 发布一条带多媒体的随想 | [发布随想](docs/content-authoring.md#发布随想) |
| 改网站名称、作者和一级页标题 | [站点配置](docs/site-configuration.md) |
| 给 AI 装可交互图表 skill | 第一次 `npx garden dev` 会自动装；更新用 `npx garden skill` |
| 升级 Garden 引擎 | 把 `package.json` 里的 `garden` tag 改到新版本，再 `npm install` |
| 发布本次改动 | `make update` |

## 常用命令

```bash
make new       # 创建文章草稿（无需安装 npm 依赖）
make skill     # 安装可交互图表 skill
make dev       # 首次准备并本地预览
make check     # 检查内容与运行测试
make build     # 构建公开站点
make update    # 检查、提交并触发自动发布
```

需要自定义提交说明时：

```bash
make update MESSAGE="新增一篇文章"
```

`make dev` 会在首次运行时自动安装依赖并创建 `.env.local`。`make update` 会先检查，再提交并推送工作区中的所有改动。不想发布的文件请先移出仓库或加入 `.gitignore`。

## 进一步配置

首次跑通以后，再按需查看：

- [评论、Webmentions 与内容分发](docs/integrations.md)
- [随想管理后台](docs/admin-service.md)
- [GitHub Pages 与自定义域名](docs/github-pages.md)
- [系统怎么工作](docs/architecture.md)
- [全部文档](docs/README.md)

## 许可证

[MIT](LICENSE)。使用 Garden 构建的站点请保留页脚中的 Garden 署名链接。
