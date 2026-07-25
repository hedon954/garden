# Hedon Log

一个以 Markdown 为内容源的个人博客，包含长文、随想、主题专栏、模糊搜索、RSS、评论适配层、Webmentions 展示位与 GitHub 个人资料页。

## 本地运行

需要 Node.js `>=22.13.0`。

```bash
npm install
npm run dev
```

## 发布内容

- 普通博文：`content/posts/*.md`
- 主题专栏：`content/columns/{column}/*.md`
- 随想：`content/thoughts/*.md`

内容文件使用 YAML front matter 与 Typora 兼容 Markdown。开发和构建前会自动运行 `npm run content:sync`，生成供站点读取的内容索引。

Markdown 渲染支持 GFM 表格、任务列表、删除线、脚注、自动链接、软换行、数学公式、语法高亮、原生 HTML 与 Mermaid 图表。

## 验证

```bash
npm test
```

视觉验收记录见 `design-qa.md`。
