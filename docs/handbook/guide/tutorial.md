---
title: 详细教程
navTitle: 详细教程
description: 全面介绍 site.config.yaml、columns.yaml、长文 Front Matter、构建环境变量，以及 Garden 全部功能与对应详细页。
section: guide
order: 13
---

本篇是 Garden 的全量配置与功能速查手册。你可以在这里查阅每一个配置文件的全部支持字段，并跳转到任一能力的专项详细页。

---

## 1. 站点全局配置（`site.config.yaml`）

站点根目录的 `site.config.yaml` 定义站点身份、品牌图标、作者信息、一级页面标题文案、外链预览刷新服务与旧地址重定向：

```yaml
name: Hedon Garden
tagline: 记录 · 工程 · 保持好奇
description: 关于后端架构、系统工程、AI 实践与思考的个人博客。
locale: zh_CN
url: https://blog.example.com

brand:
  logo: brand/logo.svg
  favicon: /favicon.svg
  appleTouchIcon: /apple-touch-icon.png

author:
  name: Hedon
  github: hedon954
  githubBio: 一名工程师，在构建系统与写字中探索世界。
  githubPinned:
    - hedon954/garden

pages:
  home:
    title: |-
      记一些正在做的事，
      和想清楚的问题。
    subtitle: 软件、笔记，和偶尔的工作记录。
  blog:
    title: 博文
    subtitle: 阶段性的完整沉淀，关于工程、架构与技术思考。
  columns:
    title: 专栏
    subtitle: 同一主题下的一组文章，可以顺着读。
  about:
    title: 你好，我是 Hedon。
    subtitle: 一名工程师，在构建系统与写字中探索世界。
    heading: 关于我与这里
    paragraphs:
      - 主要关注后端架构、分布式系统与 AI 协作工程实践。
      - 这里是我的公开工作台与数字自留地。
    quote: ""
    focus:
      - 底层运行机制与性能工程
      - AI 与人如何更好地协同工作
    cta:
      href: /blog
      label: 浏览博文

footer: 持续记录与构建。

linkPreview:
  worker: https://garden-og.example.workers.dev

redirects:
  /2024/01/20/old-post/: /blog/new-post/
```

### `site.config.yaml` 字段全表

| 字段路径 | 必填 | 类型 | 默认行为与详细说明 |
| :--- | :--- | :--- | :--- |
| `name` | 是 | `string` | 站点名称，展示在顶栏左侧、RSS `<title>` 与页面浏览器标题后缀 |
| `tagline` | 是 | `string` | 站点副标语，用于社交分享卡片（OpenGraph / Twitter）描述 |
| `description` | 是 | `string` | 站点整体简介，用于首页 SEO 描述与 RSS 频道说明 |
| `locale` | 是 | `string` | 站点界面语言：`zh_CN` 为中文界面，`en_US`（或 `en` 开头）切换全站界面、日期格式与构建提示为英文 |
| `url` | 否 | `string` | 站点公开根地址（如 `https://hedon.top`）。正文中指向该域名的完整链接会自动按站内链接渲染，不新开标签页 |
| `brand.logo` | 否 | `string \| false` | 顶栏左侧品牌图标路径（相对仓库根目录的 `.svg` 文件，构建期做安全清洗并内联）；设为 `false` 隐藏图标，省略时使用内置图标 |
| `brand.favicon` | 否 | `string` | 浏览器标签页图标路径（相对 `public/`，默认 `/favicon.svg`，构建期同步生成 `/favicon.ico`） |
| `brand.appleTouchIcon` | 否 | `string \| false` | iOS / macOS 添加到主屏幕图标路径（默认 `/apple-touch-icon.png`，设为 `false` 可关闭） |
| `author.name` | 是 | `string` | 作者署名，显示在文章元信息栏、页脚版权行与页面元数据中 |
| `author.github` | 是 | `string` | GitHub 用户名；填写真实账号后，「关于」页会拉取公开仓库、置顶项目、年度贡献热力图与近期动态 |
| `author.githubBio` | 否 | `string` | GitHub 个人简介的离线回退文案 |
| `author.githubPinned` | 否 | `string[]` | 形如 `owner/repo` 的数组，本地无 `GITHUB_TOKEN` 时作为「关于」页置顶仓库回退列表 |
| `pages.home` | 是 | `{ title, subtitle }` | 首页顶部导语标题（支持 YAML `\|-` 换行）与副标题 |
| `pages.blog` | 是 | `{ title, subtitle }` | `/blog` 文章归档页主标题与副标题 |
| `pages.columns` | 是 | `{ title, subtitle }` | `/columns` 专栏列表页主标题与副标题 |
| `pages.about` | 是 | `AboutPage` | `/about` 关于页配置：除 `title`、`subtitle` 外，支持 `heading`（正文小标题）、`paragraphs`（多段介绍）、`quote`（引言）、`focus`（当前关注方向列表）和 `cta`（`{ href, label }` 行动按钮） |
| `footer` | 是 | `string` | 页脚版权年份与作者名之后的签名短句 |
| `linkPreview.worker` | 否 | `string` | 可选的边缘链接预览刷新 Worker 地址；未配置时链接卡片完全使用构建期静态抓取结果 |
| `redirects` | 否 | `Record<string, string>` | 迁移旧博客时的「旧路径 → 新路径」映射表。静态构建会在旧路径生成跳转页，且正文里写旧路径时会自动改写为直达新路径 |

---

## 2. 专栏编排配置（`content/columns.yaml`）

专栏不复制文章正文，只按阅读顺序引用 `content/posts/` 下已有的博文相对路径（不含 `.md` 后缀）：

```yaml
columns:
  - slug: distributed-systems
    title: 分布式系统精读
    description: 从共识算法、预写日志到事务隔离级别的连载笔记。
    status: ongoing
    cover: windowsill-herbs.svg
    coverAlt: 分布式系统专栏封面
    posts:
      - systems/wal-checkpoint
      - systems/raft-replication
```

| 字段 | 必填 | 可选值 / 类型 | 说明 |
| :--- | :--- | :--- | :--- |
| `slug` | 是 | 小写字母、数字、`-` | 专栏唯一标识，公开路径为 `/columns/#<slug>`，专栏内文章路径为 `/columns/<slug>/<文章路径>/` |
| `title` | 是 | `string` | 专栏标题；归属某专栏的文章在 `/blog` 列表中也会标注该专栏入口 |
| `description` | 是 | `string` | 专栏导读简介 |
| `status` | 否 | `default \| ongoing \| completed` | 连载状态枚举（中文界面分别显示为「持续更新」「连载中」「已完结」，也兼容直接写中文） |
| `cover` | 否 | `string` | 专栏封面图路径（相对 `content/covers/` 或完整 `https://` 地址） |
| `coverAlt` | 否 | `string` | 专栏封面无障碍说明文字 |
| `posts` | 是 | `string[]` | 相对 `content/posts/` 的文章路径数组，决定专栏内的阅读先后与上下篇翻页顺序 |

---

## 3. 长文 Front Matter 与目录约定（`content/posts/**/*.md`）

文章保存在 `content/posts/` 下（支持任意子目录分类，URL 为 `/blog/<相对路径>/`）。文件名本身就是唯一标识，只能包含小写字母、数字和连字符（`a-z`、`0-9`、`-`）：

```yaml
---
title: 深入理解 WAL丨检查点与崩溃恢复
date: 2026-10-18 14:30:00
updated: 2026-10-20
publishAt: 2026-10-18 20:00:00
description: 拆解预写日志在并发读写下的页面可见性边界，以及检查点如何回收日志空间。
tags:
  - 数据库
  - 存储引擎
pinned: true
draft: false
cover: windowsill-herbs.svg
original: https://example.com/original-article
references:
  - title: SQLite Write-Ahead Logging
    url: https://www.sqlite.org/wal.html
  - title: 《Database Internals》
---
```

| 字段 | 必填 | 类型 | 规则说明 |
| :--- | :--- | :--- | :--- |
| `title` | 是 | `string` | 文章主标题。包含 `丨`、`｜` 或带空格的 ` \| ` 时自动拆成双行并按较长行自适应字号（单侧留空会报 `title-split` 警告） |
| `date` | 是 | 日期字符串 | 创建或发布日期（如 `2026-10-18` 或精确到秒的时间） |
| `description` | 否 | `string` | 文章导语摘要；留空或省略时不显示导语，**不会**强行截取正文前几句充数 |
| `updated` | 否 | 日期字符串 | 最近修订日期，展示在标题下元信息栏并参与 RSS 更新时间计算 |
| `publishAt` | 否 | 日期字符串 | 定时发布时间；晚于构建时刻的文章在正式发布时自动排除 |
| `tags` | 否 | `string[]` | 标签数组，在文章头部渲染 `#标签` 胶囊，支持在 `/blog?t=标签` 多标签组合筛选 |
| `pinned` | 否 | `boolean` | 设为 `true` 时固定展示在首页「置顶」栏（也可在管理后台一键切换） |
| `draft` | 否 | `boolean` | 设为 `true` 时正式构建不发布；`make dev` 本地预览默认包含草稿 |
| `cover` | 否 | `string` | 文章封面路径（本地图片相对 `content/covers/`，构建期若有 `sharp` 会自动裁切多尺寸 WebP） |
| `original` | 否 | `string` | 外部首发或译文原址 URL，在元信息栏渲染 `原文 ↗` |
| `references` | 否 | `{ title, url? }[]` | 文末「参考」资料卡（达到 6 条时宽屏自动双栏排布，并自动提取显示来源域名） |

> [!CAUTION] 不要手写 `slug` 字段
> 文件名即路由标识。如果在 Front Matter 中写了 `slug`，`npx garden check` 会直接报 `unexpected-slug` 错误拦截。

---

## 4. 构建与发布环境变量（Actions Variables & `.env.local`）

| 变量名 | 作用域 | 说明 |
| :--- | :--- | :--- |
| `SITE_URL` | Actions Variable / 构建 | 公开站点根 URL（如 `https://hedon.top`），用于生成 canonical、RSS、Sitemap 与 OpenGraph 链接 |
| `PAGES_REPOSITORY` | Actions Variable | 双仓模式下目标公开仓库（如 `owner/owner.github.io`）；配合 Secret `PAGES_DEPLOY_KEY` 使用 |
| `GISCUS_REPO`、`GISCUS_REPO_ID`、`GISCUS_CATEGORY`、`GISCUS_CATEGORY_ID` | `.env.local` / Actions Variable | Giscus 评论系统必填四元组 |
| `GISCUS_DISABLED` | Actions Variable / 构建 | 设为 `1` 时明确关闭评论系统并放行无 Giscus 配置的构建 |
| `ADMIN_URL` | Actions Variable | 独立管理后台地址；设置后静态站访问 `/admin` 会给出跳转入口 |
| `WEBMENTION_IO_DOMAIN` | Actions Variable / `.env.local` | 接入 `webmention.io` 的域名，开启开放网络提及展示与接收 |
| `ANALYTICS_DOMAIN`、`ANALYTICS_SCRIPT` | Actions Variable | 无 Cookie 访问统计域名与脚本地址（默认兼容 Plausible） |
| `CONTENT_INCLUDE_DRAFTS` | 本地命令环境变量 | `make dev` 默认设为 `1`；想在本地预览不含草稿的正式效果可执行 `CONTENT_INCLUDE_DRAFTS=0 make dev` |
| `GARDEN_OFFLINE` | 本地 / CI 构建环境变量 | 设为 `1` 时跳过外链 Favicon/OG 抓取、远程图片尺寸探测与远程文件体积探测，纯用本地缓存离线构建 |
| `NEXT_PUBLIC_BASE_PATH` | 子路径构建环境变量 | 当站点挂载在子路径（如 `/garden`）时统一为路由、静态资源与搜索索引添加前缀 |

---

## 5. Garden 全部功能清单与对应详细页

| 功能模块 | 核心能力说明 | 对应详细文档 |
| :--- | :--- | :--- |
| **三级阅读宽度与防抖动排版** | `740px` 正文列、`1040px` 宽图外扩、`1340px` 宽表外扩、右侧跟随目录自动避让、构建期预置图片宽高、深色模式暖纸衬底 | [框架设计 · 设计原则](/garden/design/principles/) |
| **Markdown 写作增强语法** | 中文标点旁无缝加粗、<u>暖黄荧光笔划线</u>（`<u>` / `<mark>`）、五种语义提示框（`[!NOTE]` / `[!TIP]` / `[!IMPORTANT]` / `[!WARNING]` / `[!CAUTION]`）、LaTeX 公式（多字母带下划线标识符自动保护）、Mermaid 图表、代码块与 `diff`「对比上一版」合成切换、GFM 表格与脚注 | 本节下方速览 & [AI 协作](/garden/guide/ai-collaboration/) |
| **链接卡片（Link Card）** | 行内普通外链（自动抓站点 Favicon 并与首字同行防孤立折行）、行内 `{card}` 预览卡、独立单行链接卡片 | [内置组件 · 链接卡片](/garden/components/link-card/) |
| **图片、音频与视频播放器** | 同名资源目录配图与点击灯箱、原生本地 `<audio>` / `<video>`、独立行 Bilibili 与 YouTube 站内隐私播放器 | [内置组件 · 图片视频](/garden/components/media/) |
| **来源胶囊（Source Pill）** | `[站点](url){source}` 句内圆角出处胶囊，带站点图标与域名首字母自动回退 | [内置组件 · 来源胶囊](/garden/components/source/) |
| **文件内嵌与抽屉预览** | `<file>` / `<files>` 自动测量文件体积，支持 HTML（隔离沙箱）、PDF、Markdown 页内抽屉预览，以及 `.excalidraw` 构建期导出透明底可选中文字 SVG | [内置组件 · 文件内嵌](/garden/components/file-embed/) |
| **智能 UI（Garden Compose）** | 单一 `garden compose` 入口承载静态语义图示、Play 响应式参数交互、离线 `<sandbox>` 画布，内置 21 种推荐图示配方 | [内置组件 · 智能 UI](/garden/components/intelligent-ui/) |
| **双层离线优先全文搜索** | 构建期生成轻量标题摘要索引与按哈希缓存在 IndexedDB 的全文纯文本索引，`⌘/Ctrl + K` 秒开精准 + 模糊检索 | [框架设计 · 底层原理](/garden/design/internals/) |
| **CLI、校验门禁与 AI 技能** | `Makefile` 日常命令、`garden verify` / `garden ui` 脚本集、`AGENTS.md` 与 `garden-compose` / `garden-post-review` 技能 | [常用脚本](/garden/scripts/) |
| **编辑器原生插件** | Typora 与 VS Code / Cursor 插件：`/garden` 图形选择器、原位交互预览、CodeLens 诊断与围栏一键折叠 | [扩展插件](/garden/extensions/) |
| **独立管理后台** | GitHub OAuth 白名单登录、阿里云 OSS 媒体直传、首页置顶写回 Git、X / 知乎 / 掘金 / CSDN 分发、在线 Compose 写作台 | [使用指南 · 管理后台](/garden/guide/admin/) |

---

## 6. 常用 Markdown 增强语法速览

无需进入组件围栏，日常写在 Markdown 正文里的原生增强语法就会自动生效：

- **中文标点旁加粗与荧光笔划线**：紧挨中文引号或括号写 `**像「这样」的加粗**` 无需加空格；用 `<u>关键结论</u>` 或 `<mark>关键结论</mark>` 即可画出跨行自然折行的<u>暖黄色荧光笔重点划线，句末标点也会自动与最后一个字保持同行</u>。
- **自定义标题提示框**：支持 `NOTE`、`TIP`、`IMPORTANT`、`WARNING`、`CAUTION`，同行末尾可直接自定义标题：
  > [!TIP] 写作小贴士：同名附件目录约定
  > 若文章路径是 `content/posts/db/wal.md`，把它的专属配图、PDF、HTML 或 `.excalidraw` 都放进 `content/posts/db/wal/` 目录。构建脚本会自动识别该目录为附件目录而非子文章目录。
- **数学公式与 Mermaid**：行内写 `$Attention(Q,K,V) = \operatorname{softmax}(\frac{QK^\top}{\sqrt{d_k}})V$`，多字母带下划线变量如 `$max_batch_size$` 会自动保护为正体标识符；````` ```mermaid ````` 代码块自动按站点中性纸墨主题渲染流程图与时序图。
