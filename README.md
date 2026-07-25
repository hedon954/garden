# Hedon Log

一个以本地 Markdown 为内容源的个人博客，包含长文、混合多媒体随想、主题专栏、模糊搜索、RSS、Giscus 评论、Webmentions 与 GitHub 个人资料页。

## 本地运行

需要 Node.js `>=22.13.0`。

```bash
npm install
cp .env.example .env.local
npm run dev
```

## 发布内容

- 普通博文：`content/posts/*.md`
- 主题专栏：`content/columns/{column}/*.md`
- 随想：`content/thoughts/*.md`

也可以通过独立的 `/admin` 发布后台随想；普通博文和专栏仍只从本地 Markdown 同步。后台的访问控制、随想持久化和跨平台分发配置见 [内容管理后台](docs/admin-studio.md)。

内容文件使用 YAML front matter 与 Typora 兼容 Markdown。开发和构建前会自动运行 `npm run content:sync`，校验内容并生成站点索引。

### Typora 本地附件

Markdown 图片、原生 HTML 中的 `img/audio/video/source`，以及 front matter 的 `cover`、`poster`、`media[].src` 都可以使用相对路径：

```markdown
![书桌](./assets/desk.jpg)

<video controls src="./assets/demo.webm"></video>
```

构建时会验证文件存在，将附件复制到 `public/media/`，并自动改写网页路径。远程 URL 和以 `/` 开头的公共路径保持不变。

### 草稿与定时发布

```yaml
draft: true
publishAt: 2026-08-01T09:00:00+08:00
```

正式构建会排除草稿和尚未到发布时间的内容。本地需要预览时设置：

```bash
CONTENT_INCLUDE_DRAFTS=1 npm run dev
```

内容同步还会检查必填字段、日期、slug 格式、重复 slug、重复专栏顺序和多媒体结构，避免带病发布。

### 多媒体随想

一篇随想可以同时包含多张图片、多段声音、多个视频和链接：

```yaml
media:
  - type: image
    src: ./assets/photo-1.jpg
    alt: 雨后的街道
  - type: image
    src: ./assets/photo-2.jpg
    alt: 路灯倒影
  - type: audio
    src: ./assets/field-recording.mp3
    title: 雨声
  - type: video
    src: ./assets/walk.webm
    mime: video/webm
  - type: link
    src: https://example.com/article
    title: 延伸阅读
```

## 评论

评论使用 [Giscus](https://giscus.app/) 与 GitHub Discussions：

1. 准备一个公开 GitHub 仓库；
2. 在仓库设置中启用 Discussions；
3. 为该仓库安装 Giscus App；
4. 在 Giscus 配置页选择仓库和分类；
5. 将生成配置中的仓库、仓库 ID、分类、分类 ID 写入 `.env.local` 或线上环境变量。

配置键见 `.env.example`。未配置时页面会显示明确的待接入状态，不会再保存无法跨设备同步的本地假评论。

## Webmentions

接收端使用 [webmention.io](https://webmention.io/)，发出端使用 [webmention.app](https://webmention.app/)：

1. 确定最终公开域名并在 webmention.io 登录注册；
2. 将注册后的域名写入 `WEBMENTION_IO_DOMAIN`；
3. 将正式地址写入 `SITE_URL` 与 `NEXT_PUBLIC_SITE_URL`；
4. 部署后运行 `npm run webmentions:send`，检查 RSS 中的外链并发送 Webmentions。

文章、专栏和随想都有独立永久链接、canonical、Webmention 发现标签与 `h-entry` 微格式。

## Markdown 与订阅

网页渲染支持 GFM 表格、任务列表、删除线、脚注、自动链接、软换行、数学公式、语法高亮、原生 HTML 与 Mermaid 中性主题图表。Mermaid 支持“图表”和“Code”两种阅读方式。

RSS 位于 `/rss.xml`，包含博文、专栏、随想与全文内容。站点同时生成 `/sitemap.xml` 和 `/robots.txt`。

## 验证

```bash
npm run lint
npm test
```

视觉验收记录见 `design-qa.md`。
