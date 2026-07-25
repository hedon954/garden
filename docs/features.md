# 功能特性

## 阅读与组织

- 博文、置顶博文、主题与专栏；专栏同时展示左侧篇目和右侧文章目录。
- 封面、摘要、阅读时长、字数、目录、上一篇/下一篇与 RSS。
- 全站模糊搜索，结果会高亮查询命中的标题、摘要和正文片段。
- 随想时间线与独立永久链接。

## Markdown

内容以本地 Markdown 保存，渲染覆盖 Typora 常用能力：GFM 表格、任务列表、删除线、脚注、自动链接、软换行、数学公式、原生 HTML、图片/音频/视频、代码高亮与 Mermaid。

Mermaid 固定使用中性主题，并提供“图表 / Code”两种查看方式。代码块按语言高亮，示例覆盖 TypeScript、Python、Rust、Go、SQL、Swift 与 Diff。

## 多媒体随想

`media` 可以同时包含图片、音频、视频、链接；同一类型可重复多次。公开内容使用 Git 仓库中的 Markdown，本地附件构建时会复制到 `public/media/`。

## 社交与发现

- Giscus（GitHub Discussions）评论。
- Webmentions 接收与发出。
- RSS、sitemap、robots、canonical 与 Open Graph 元数据。
- 关于页可读取 GitHub 公开资料渲染。

## 管理后台（可选）

后台与公开博客分开部署。GitHub OAuth 只负责确认登录者身份；后台使用服务端 PAT 将随想写入内容仓库。提交到 `main` 后，GitHub Pages 工作流自动发布，无需数据库。
