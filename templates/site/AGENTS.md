# Garden 站点：AI 写作入口

这是 Garden 内容站点，不是引擎源码仓库。先理解现有稿件和项目技能，再动手。
本指南只提供概念地图；组件目录、语法和修复步骤按需读取，不要复制进回复。

## 内容与站点模型

- `content/posts/`：长文，UTF-8 Markdown；保留项目现有目录与文件命名。
- `content/columns.yaml`：专栏的组织与文章引用，避免另造一套重复正文。
- `site.config.yaml`：站点信息、作者、页面文案、导航与相关配置。
- 首页、博文、专栏、关于和 Garden 手册由引擎提供布局与路由。
  不要为一次写作需求复制应用代码、硬编码路由或发明新配置字段。
- 长文通常必需 `title`、`date`、`description`；文件名参与标识，不添加 `slug` 字段。
  其他字段与写作语法以项目示例及写作手册为准，不凭记忆猜测。
- `draft: true` 与未来的 `publishAt` 控制公开发布；开发预览默认包含草稿。
  草稿同样必须暴露未编译组件与格式错误，不能用草稿状态绕过检查。

## 从任务进入技能

- 作者只需给原文和一句效果需求（如“使用 garden compose 呈现横向等宽卡片”）；
  AI 应自行进入 Compose 技能、按需查布局要点并实现和校验，不要求作者写技术步骤。
- 写说明图、并排卡片、可调参数、Compose 编译或修复：先读取
  `.agents/skills/garden-compose/SKILL.md`，按需读取它的 `references/`。
  使用它的 `scripts/` 或权威 CLI 定位、验证和单块写回，不重复实现解析器。
- 审稿、结构问题、整篇检查：先读取
  `.agents/skills/garden-post-review/SKILL.md`，遵守其修改范围。
- 检查给出文件、行号、错误码后，按对应技能处理；不要把全文、组件目录、
  配方或技能说明倾倒到终端/聊天，也不要默认导出大提示词文件。
- 缺少技能时先说明；`npx --no-install garden skill` 可安装项目技能，
  但会更新管理的文件，应先确认项目的安装/更新意图。

## 写作与组件边界

- 保留作者事实、原话与论证结构；不编造数据、来源、测量或功能支持。
- 保留标题的实际层级与文字；不要自动添加章节编号或重写标题来“美化”。
- 优先使用普通 Markdown。代码、表格、数学、Mermaid、提示框、链接卡、
  附件和内置 Garden 组件各有适用场景；先查已有用法，不为每个需求写 HTML。
- Compose 的静态说明图与交互 Play 能力不同；交给技能查目录，不凭同名标签
  推断完整兼容，不注入任意样式或脚本，不为绕过验证改成其他组件。
- 保留已有链接、参考阅读与附件关系；不要自动让 references 与正文链接一一对应。

## 源文件与生成物

- 文章同名附件目录、`content/covers/` 和用户维护的 `public/images/` 是源材料。
  不要整体忽略、删除或用生成物覆盖它们。
- `.garden/` 存放运行时数据与生成缓存，包括图片尺寸、链接元数据。
- `public/media/` 与 `public/link-assets/` 是面向浏览器的生成资源；需要随构建发布，
  不等于必须日常跟踪。历史已跟踪资源可能是离线回退，不能盲目清除。
- `dist/` 是最终构建产物。能再生成的内容应留在忽略路径，不制造源码 diff。
  不手工维护生成结果；需要改变行为时修改内容源或明确提出引擎需求。

## 校验与交付

- 通常用 `make check diff`：只校验改动/新建的 Markdown，不跑全站构建。
- `make check`：全量校验；通过后还会执行站点已有构建流程，注意其额外成本。
- 没有 Make 时：`npx --no-install garden verify --diff` 或 `npx --no-install garden verify`
  只执行内容预检。单篇可用 `npx --no-install garden verify content/posts/文章.md`。
- 组件定位用 `garden ui scan`，单块写回用 `garden ui apply`；确切参数按技能执行。
  `npx --no-install garden check <文章.md>` 是单篇结构检查，不替代 Compose 校验。
- 修复后重新检查；没有浏览器证据时，不声称视觉或交互已经验证。
- 不自动提交、推送、发布或调用 AI。特别是 `make update` 会提交并推送，
  不能把它当普通校验命令；只修改用户授权的文件并汇报剩余错误。

## 按需查阅

- 项目 `README.md` 与现有同类文章优先；安装包手册在
  `node_modules/hd-garden/docs/handbook/`，站点手册入口是 `/garden`。
- 内容/字段：`writing.md`；专栏与站点配置：相应手册页与现有配置。
- 组件用法：`components/`；属性：`reference/`；流程：`workflow.md`。
- 只有确实需要目录细节时才运行 `npx --no-install garden ui prompt`，
  由模型按需读取，不将整份目录重复粘贴给用户。
