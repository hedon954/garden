---
title: 语法检查与快捷输入
navTitle: 语法检查与快捷输入
description: 使用 npx garden check 检查文章诊断码，配置 Git 提交前检查钩子、编辑器代码片段与 Agent 技能。
section: workflow
order: 40
---

为了防止写错组件 YAML 缩进、漏掉必填字段或引用不存在的本地文件，Garden 提供了命令行检查工具、Git pre-commit 钩子、代码片段模板以及内置的 Agent 技能。

## 1. 文章检查命令

在站点仓库中，有三条不同粒度的检查命令：

- **检查单篇或多篇文章（`npx garden check`）**：
  ```bash
  npx garden check content/posts/my-post.md
  # 也可以一次传入多篇 .md 文件
  npx garden check content/posts/*.md
  ```
- **检查交互块与组件语法（`npx garden ui check`）**：
  ```bash
  npx garden ui check content/posts/my-post.md
  # 检查 Git 暂存区修改过的 Markdown 文件
  npx garden ui check --staged
  # 检查仓库内全部 Markdown 文件
  npx garden ui check --all
  ```
- **全站同步与构建检查（`make check`）**：
  ```bash
  make check
  ```
  站点 `Makefile` 中的 `make check` 实际运行的是 `npx garden sync && npx garden build`，会完整执行全站内容同步、组件校验与生产构建。

## 2. `npx garden check` 常见诊断码

`npx garden check`（内部调用 `scripts/check-post.mjs`、`ui/garden/check.mjs` 与 `ui/garden/file-paths.mjs`）会输出具体行号、诊断码和修复建议。下表是代码中实际检查的诊断项：

| 诊断码 | 级别 | 触发原因与修复方法 |
| :--- | :--- | :--- |
| `missing-title` / `missing-description` | 错误 | Front Matter 缺少有效的 `title` 或 `description` |
| `unexpected-slug` | 错误 | Front Matter 中手写了 `slug` 字段（文件名即标识，删掉 `slug`） |
| `date-format` | 错误 | `date` 不是合法的 `YYYY-MM-DD`、`YYYY-MM-DD HH:mm:ss` 或带时区的 ISO 时间 |
| `missing-cover` / `missing-asset` | 错误 | `cover` 封面图、正文图片或 `garden file` 引用的本地文件不存在 |
| `heading-h1` / `heading-skip` | 错误 | 正文使用了 `#` 一级标题，或标题层级跳级（例如从 `##` 直接跳到 `####`） |
| `reference-heading` | 错误 | 正文写了 `## 参考` 或 `## 参考资料` 标题（应改放到 Front Matter 的 `references` 列表） |
| `callout-type` | 错误 | `> [!TYPE]` 使用了不支持的提示框类型 |
| `title-split` | 警告 | 标题包含 `丨` 分隔符，但分隔符左边或右边为空（应写成「主题丨副题」） |
| `diff-orphan` | 错误 | `diff` 代码块前面没有紧挨着的完整代码块 |
| `legacy-fence` | 错误 | 使用了旧版围栏名（如 `garden:stat`、`widget`、`embed`、`html garden`），需改为 `garden <name>` |
| `garden-idea` | 错误 | 非草稿文章里还有未编译的空白 `garden` 想法块 |
| `garden-name` | 错误 | 未知的 `garden` 组件名（仅支持 `card`、`stat`、`compare`、`timeline`、`chart`、`figure`、`html`、`interactive`、`file`） |
| `garden-yaml` | 错误 | `garden` 围栏内 YAML 语法错误、顶层不是键值/列表，或包含该组件不支持的键名 |
| `garden-file` / `file-outside` | 错误 | `garden file` 手写了 `resolved`、缺少有效的 `src` / `files`，或本地路径越出了 `content/` 目录 |
| `file-large` | 警告 | `garden file` 引用的单个本地文件体积超过 `5 MB` |
| `compare-long` | 错误 | `garden compare` 单个对比格的正文超过约 60 字 |
| `interactive-trivial` / `steps-prose` | 错误 | `garden interactive` 只有一次简单乘法，或步骤只是散文而没有状态变化 |

## 3. Git 提交前钩子与组件画廊

- **启用 pre-commit 钩子**：运行以下命令会在 `.git/hooks/pre-commit` 安装检查脚本，每次 `git commit` 时自动对暂存区的 Markdown 文件运行 `npx --no-install garden ui check --staged --quiet`：
  ```bash
  npx garden hooks
  ```
- **生成本地组件画廊**：运行以下命令会在 `.garden/ui-catalog.html` 生成包含全部内置组件的静态预览页：
  ```bash
  npx garden ui catalog
  ```

## 4. 快速输入组件模板与 Agent 技能

Garden 通过以下三种方式提供组件模板与智能辅助：

1. **新建文章自动附带速查表**：运行 `make new SLUG=xxx TITLE="..."` 创建文章时，生成的 `.md` 文件底部会自动带有一段 `<!-- 组件速查 ... -->` HTML 注释，列出想法块和 9 个组件的示例写法，复制需要的那块即可。这段注释不会显示在页面上，写完可以删掉。
2. **代码片段模板文件**：`hd-garden` 包内的 `templates/` 目录自带两份模板文件：
   - `templates/garden-blocks.md`：想法块和 9 个内置组件的可复制 Markdown 模板。
   - `templates/garden-snippets.plist`：macOS 系统文本替换词条（可拖入「系统设置 → 键盘 → 文本替换」），触发词是 `;gidea`（也可以输入 `;garden想法`）、`;gcard`、`;gstat`、`;gcompare`、`;gtimeline`、`;gchart`、`;gfigure`、`;ghtml`、`;ginteractive`、`;gfile`，每个展开成对应的 `garden` 围栏。
3. **安装 AI Agent 技能（`npx garden skill`）**：在站点目录运行 `npx garden skill`（`npx hd-garden init` 时也会自动执行），会把三个技能复制到站点根目录下的 `.agents/skills/`：
   - `garden-ui`：把文章里的 `garden` 想法描述编译成具体的组件围栏。
   - `garden-interactive-chart`：根据文章数据编写 `interactive`、`chart`、`figure` 与 `html` 组件。
   - `garden-post-review`：按排版与组件规范审阅整篇文章。
