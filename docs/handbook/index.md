---
title: 用 Markdown 写丨推送之后网站自己更新
description: 文章、随想和专栏都存在你自己的 Git 仓库里。这篇页面本身就由 Garden 渲染。
section: overview
order: 0
---

这篇文章就是 `/garden/` 首页，用 Garden 自己的 `740px` 正文列渲染。你在页面上看到的标题分行、宽图、宽表格、深色模式配图衬底、代码对比和提示框，都是当前页面实时运行的效果。

## 标题分行、宽图与深色配图衬底

上方的页面标题在 `丨` 处分成两行（也支持 `｜` 或前后带空格的 ` | `），并根据较长一行的字数计算字号缩放比例 `--l`。不写分隔符的普通标题只应用 `text-wrap: balance`，不会在冒号、破折号或中间位置自动拆行改字号。

正文默认列宽是 `740px`（`17px` 字号、`1.75` 行高）。当正文里的配图显示宽度超过正文列时，页面上的测量脚本会按窗口两侧剩余空白将图框向外扩展（最宽 `1040px`）。下面这张 `2080×560` 的透明底黑线 SVG 图在桌面宽屏下会向两侧延伸；切到深色模式时，图片自身背景会垫上 `#faf9f5` 暖白纸色，黑线与文字不需要准备第二套深色图：

![740px 正文列与 1040px 宽图区尺寸示意（透明背景黑线 SVG，深色模式下自动衬上 #faf9f5 纸底）。](./assets/reading-layout.svg)

## 宽表格自动向两侧展开

普通表格留在 `740px` 列内；当表格不折行宽度超过 `740px` 且窗口宽度不小于 `900px` 时，脚本会按左右可用空白对称向外拓宽（每侧最多 `300px`，总宽最宽 `1340px`）。如果展开后的表格与右侧目录重叠，目录会自动向右让位或暂时收起。下面是一张真实的多列表格：

| 站点内容或配置 | 仓库文件路径 | 生成的页面路由与产物 | 校验与构建方式 | 常用命令或环境变量 |
| :--- | :--- | :--- | :--- | :--- |
| 长文与随文附件 | `content/posts/<slug>.md` 及同名目录 | `/blog/<path>`、`public/rss.xml`、`public/posts.xml` | 构建期校验 Front Matter、本地图片尺寸与组件字段 | `make new SLUG=my-post TITLE="标题"` |
| 短随想与多媒体记录 | `content/thoughts/<slug>.md` | `/thoughts` 列表、`/thoughts/<slug>` 独立页、`public/rss.xml` | 校验 `date`、`media` 类型（`image` / `audio` / `video` / `link`）与本地路径 | 直接新建 `.md` 文件，或在 `/admin` 页面发布 |
| 主题专栏编排 | `content/columns.yaml` | `/columns` 索引页、`/columns/<column>/<post>` 阅读页 | 校验专栏 `slug` 唯一性及引用的文章是否存在于 `content/posts/` | 在 `columns.yaml` 的 `posts` 列表按顺序填写文章路径 |
| 站点与页面文案 | `site.config.yaml` | 导航栏、首页、关于页、`/garden/` 标题及全站全文搜索索引 | `npx garden sync` 生成 `.garden/site-config.ts` 与 `public/search-index.json` | `make dev`（草稿预览：`CONTENT_INCLUDE_DRAFTS=1 make dev`） |

## 代码块与「对比上一版」切换

把一段完整代码块（写修改后的新代码）与一段 `diff` 代码块紧挨着写，页面会自动把它们合并成一个带「代码 / 对比上一版」切换按钮的代码框。默认展示干净的「代码」视图，点击右上角复制按钮时只复制完整的新代码：

```yaml
pages:
  garden:
    title: "用 Markdown 写丨推送之后网站自己更新"
    subtitle: "文章、随想和专栏都存在你自己的 Git 仓库里。"
```

```diff
 pages:
   garden:
-    title: "用 Markdown 写。"
-    subtitle: ""
+    title: "用 Markdown 写丨推送之后网站自己更新"
+    subtitle: "文章、随想和专栏都存在你自己的 Git 仓库里。"
```

> [!NOTE]
> 代码对比块前面的完整代码块必须写**修改后的新代码**，内容要与 `diff` 去掉 `-` 行后的结果一致；如果放成旧代码，`npx garden check` 会报错提示。

> [!TIP] 提示框支持自定标题
> 在 `> [!TIP]` 同一行后面直接写文字（或者下一行单独放一行粗体），会替换默认的「建议」标题。支持 `NOTE`、`TIP`、`IMPORTANT`、`WARNING`、`CAUTION` 五种类型。

## 内置 `garden` 组件

正文里除了标准 Markdown、LaTeX 公式（`$...$` 与 `$$...$$`）和 Mermaid 流程图，还可以用 ```` ```garden <name> ```` 代码块插入 9 个内置组件。组件名统一使用英文：

| 组件围栏 | 用途 | 核对要点 |
| :--- | :--- | :--- |
| [`card`](/garden/components/card) | 论文、项目或模块说明卡片 | 至少包含 `description` 或 `points` |
| [`stat`](/garden/components/stat) | 2～4 组并排指标卡片 | `items` 中每项含 `label` 与 `value` |
| [`compare`](/garden/components/compare) | 2～3 项方案并排对比 | `items` 至少 2 项，支持 `title`、`text` 与附加属性标签 |
| [`timeline`](/garden/components/timeline) | 按顺序排列的时间节点或排查步骤 | `items` 至少 2 项，每项含 `date`、`title`、`text` |
| [`chart`](/garden/components/chart) | 比例条形图与可展开数据表 | `data` 至少 2 行，不要与同组数据的 Markdown 表格重复 |
| [`figure`](/garden/components/figure) | 带分步按钮高亮的 SVG / 图片结构图 | 配合 `svg` 中的 `data-p` 分区和 `parts` 说明列表 |
| [`html`](/garden/components/html) | 独立沙盒 `iframe` 网页片段 | 通过 `src` 引用同目录 `.html` 或内联 `code` |
| [`interactive`](/garden/components/interactive) | 带参数滑杆与公式计算的交互卡片 | 必须包含 `Slider` / `Choice` 等控件及非平凡计算公式 |
| [`file`](/garden/components/file) | 本地或远程附件下载与页内预览 | 缺失文件报 `missing-asset`，超过 `5 MB` 报 `file-large` 提醒 |

## 在本地运行与日常命令

新建站点目录后，先安装依赖，再用 `Makefile` 里的命令预览、新建文章和推送更新：

```bash
npx hd-garden init my-blog
cd my-blog
npm install
make dev
```

- **本地预览**：`make dev` 启动开发服务器（若尚未安装依赖会自动执行 `npm install`）。要同时查看 `draft: true` 或未来日期的文章，运行 `CONTENT_INCLUDE_DRAFTS=1 make dev`。
- **新建长文**：`make new DIR=notes SLUG=first-post TITLE="第一篇文章"`。`SLUG` 只能包含小写字母、数字和连字符，子目录通过 `DIR` 指定；生成的文件末尾会自动附上组件速查注释。
- **同步与构建检查**：站点里的 `make check` 会依次运行 `npx garden sync` 和 `npx garden build`；检查单篇文章的排版与组件约束可运行 `npx garden check content/posts/first-post.md`。
- **提交并推送**：`make update MESSAGE="docs: update post"` 会先执行 `make check`，通过后执行 `git add -A`、`git commit` 和 `git push`。

<h2 id="garden-admin-title">外链卡片、GitHub Pages 与可选后台</h2>

- **外链图标与链接卡片**：正文里的外部链接会自动附上目标站点的 Favicon，并把图标和链接首字绑在同一行。把完整网址单独写成一行，或在行内链接末尾加上 `{card}`（如 `[链接文字](https://example.com){card}`），会在构建期抓取网页元信息生成链接卡片。需要嵌入 YouTube 或 Bilibili 视频时，在【随想】（`content/thoughts/*.md`）的 `media` 列表里将 `type` 设为 `link`。
- **GitHub Pages 发布**：公开仓库可以直接构建部署；如果想把 Markdown 草稿留在私有仓库、只把构建产物推到公开的 `<owner>.github.io` 仓库，在私有仓库配置 `PAGES_REPOSITORY` 变量和 `PAGES_DEPLOY_KEY`（SSH 部署密钥），详见 [发布到 GitHub Pages](/garden/deploy)。
- **可选的 `/admin` 后台**：仓库自带 `/admin` 路由，配置 `GITHUB_OAUTH_CLIENT_ID`、`GITHUB_OAUTH_CLIENT_SECRET`、`GITHUB_SESSION_SECRET`、`ADMIN_GITHUB_LOGINS` 和 `CONTENT_GITHUB_TOKEN` 后，可以在网页端登录 GitHub 编写随想或上传图片并写回仓库。
