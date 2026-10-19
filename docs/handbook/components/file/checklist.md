# 站点发布前检查清单

在运行 `make update` 推送更新前，可以核对以下几项：

## 1. 文章 Front Matter 与路径

- [x] `title`、`date`、`description` 均已填写，文件名只用小写字母、数字和连字符
- [x] 本地图片与随文附件放在文章同名目录下，使用 `./<slug>/file.ext` 相对路径引用
- [x] 正式发布的文章已去掉 `draft: true`

## 2. 本地校验命令

| 命令 | 检查内容 |
| :--- | :--- |
| `npx garden check content/posts/<slug>.md` | 检查单篇文章的组件字段、代码对比与图片附件路径 |
| `make check` | 运行 `npx garden sync && npx garden build` 校验全站构建 |
| `CONTENT_INCLUDE_DRAFTS=1 make dev` | 在本地连同草稿和定时文章一起预览 |
