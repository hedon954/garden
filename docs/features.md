# 功能特性

## 阅读与组织

- 博文、置顶博文、主题与专栏；专栏同时展示左侧篇目和右侧文章目录。
- 封面、摘要、阅读时长、字数、可展开收起且会自动跟随阅读位置的目录、上一篇/下一篇与 RSS。
- 全站模糊搜索，结果会高亮查询命中的标题、摘要和正文片段。

## Markdown

内容以本地 Markdown 保存，渲染覆盖 Typora 常用能力：GFM 表格、任务列表、删除线、脚注、自动链接、软换行、数学公式、原生 HTML、图片/音频/视频、代码高亮与 Mermaid。正文里的 `.excalidraw` 图片在构建时导出成一张浅色扁平 SVG，画布背景透明，并嵌进正文，图里的文字可以选中。

单独一行的 YouTube / Bilibili 视频链接渲染成响应式站内播放器，并保留原站入口；其他单独一行的网址以及 `{card}` 链接显示为链接卡片。`make embed` / `npx garden embed` 打印可粘贴的规范化地址，不再生成 `embed` 围栏。本地文件下载与预览使用 `garden compose` 的 `<file>` / `<files>`。

兼容 Typora / Obsidian 的 `[!TYPE]` 警告框语法。`NOTE`、`TIP`、`IMPORTANT`、`WARNING`、`CAUTION` 分别显示提醒、建议、重要、警告、注意；`INFO` 同提醒，`SUCCESS` 同建议，`DANGER` 与 `FAILURE` 同注意。

Mermaid 固定使用中性主题，并提供“图表 / Code”两种查看方式。代码块按语言高亮，示例覆盖 TypeScript、Python、Rust、Go、SQL、Swift 与 Diff。

## 社交与发现

- Giscus（GitHub Discussions）评论。
- Webmentions 接收与发出。
- RSS、sitemap、robots、canonical 与 Open Graph 元数据。
- 关于页展示 GitHub 仓库数、followers、近 30 天 commits、置顶仓库、贡献热点图与最近公开活动。

## 管理后台（可选）

后台与公开博客分开部署。GitHub OAuth 只负责确认登录者身份；后台使用服务端 PAT 更新内容仓库中的文章。提交到 `main` 后，GitHub Pages 工作流自动发布，无需数据库。
