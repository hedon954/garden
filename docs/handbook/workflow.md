---
title: 语法检查与快捷输入
navTitle: 语法检查与快捷输入
description: 使用 npx garden check 检查文章错误码，配置 Git 提交前检查钩子、编辑器代码片段与 Agent 技能。
section: workflow
order: 40
---

为了防止写错组件 YAML 缩进、漏掉必填字段或引用不存在的本地图片，Garden 提供了命令行检查工具、Git pre-commit 钩子、编辑器代码片段以及内置的 Agent 技能。

## 1. 文章检查命令

在站点仓库中，有两条不同粒度的检查命令：

- **检查单篇文章（`npx garden check`）**：
  ```bash
  npx garden check content/posts/my-post.md
  # 也可以一次传入多篇 .md 文件
  npx garden check content/posts/*.md
  ```
  如果只想把可自动修复的 `garden ui` 块交给本地安装的 `codex` 或 `claude` 修复，可加上 `--fix`（或运行 `npx garden ui check content/posts/my-post.md --fix`）。
- **全站同步与构建检查（`make check`）**：
  ```bash
  make check
  ```
  站点 `Makefile` 中的 `make check` 实际运行的是 `npx garden sync && npx garden build`，会完整执行全站内容同步、组件编译与生产构建。

## 2. `npx garden check` 常见诊断码

`npx garden check` 会输出具体行号、诊断码和修复建议。下表是代码中实际检查的诊断项：

| 诊断码 | 级别 | 触发原因与修复方法 |
| :--- | :--- | :--- |
| `title-pipe` | 错误 | 标题包含 `丨`，但分隔符左边或右边为空。去掉多余的 `丨` 或补全两侧文字 |
| `code-diff-mismatch` | 错误 | 代码对比块中，前面的完整代码块内容与紧随其后的 `diff` 去掉 `-` 行后的新版代码不一致。把前面的代码块改为修改后的新代码（报错输出会直接给出算好的新代码） |
| `missing-asset` | 错误 | 正文图片、`garden html` 的 `src` 或 `garden file` 的本地文件路径不存在。核对相对当前 `.md` 文件的路径 |
| `file-outside` | 错误 | `garden file` 引用的本地路径越出了 `content/` 目录。把附件放回文章同名文件夹内 |
| `file-large` | 警告 | `garden file` 中的单个本地附件体积超过 `5 MB`。建议压缩或改用外部对象存储 `https://` 链接 |
| `garden-file` | 错误 | `garden file` 缺少 `src` / `files`、同时写了 `src` 和 `files`，或写了未知属性 |
| `yaml` / `shape` | 错误 | `garden` 组件围栏内 YAML 缩进错误，或顶层不是键值对 |
| `unknown` | 错误 | 未知的 `garden` 组件名（仅支持 `card`、`stat`、`compare`、`timeline`、`chart`、`figure`、`html`、`interactive`、`file` 及 `ui`） |
| `card-empty` / `stat-empty` | 错误 | `card` 既没有 `description` 也没有 `points`；或 `stat` 缺少 `label` / `value` |
| `compare-short` / `timeline-short` / `chart-short` | 错误 | `compare`、`timeline` 或 `chart` 的条目数少于 2 项 |
| `figure-empty` / `html-empty` | 错误 | `figure` 未提供 `svg` 或 `image`；`html` 未提供 `code` 或 `src` |
| `interactive-empty` / `interactive-prose-steps` / `interactive-trivial` | 错误 | `interactive` 缺少组件体、只放了纯文字 `<Steps>` 没有输入控件，或公式只是形如 `a * b` 的单次乘法 |
| `chart-table-dup` | 警告 | 同一小节内既有 `garden chart` 又有一张包含相同数字（3 个及以上相同数值）的 Markdown 表格 |

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

Garden 没有 `npx garden blocks` 或 `npx garden snippets` 子命令，而是通过以下三种方式提供组件模板与智能辅助：

1. **新建文章自动附带速查表**：运行 `make new SLUG=xxx TITLE="..."` 创建文章时，生成的 `.md` 文件底部会自动带有一段 `<!-- 组件速查 ... -->` HTML 注释，包含常用围栏写法与提示框模板，写完可直接保留（不会渲染到页面上）或删掉。
2. **编辑器代码片段（Snippets）**：`hd-garden` 包内自带 `templates/garden-blocks.md`（完整 Markdown 模板）、`templates/garden-snippets.plist`（macOS 系统文本替换文件）以及 `editors/vscode/snippets/markdown.json`（VS Code 代码片段）。常用触发词包括：
   - `gcard`、`gstat`、`gcompare`、`gtimeline`、`gchart`、`gfigure`、`ghtml`、`ginteractive`、`gfile`：一键展开对应组件的 YAML 骨架。
   - `gdiff`：展开「新版完整代码块 + `diff` 块」组合。
   - `gidea`：展开供 `garden-ui` 技能编译的 `garden ui` 意图块。
3. **安装 AI Agent 技能（`npx garden skill`）**：在站点目录运行 `npx garden skill`（`npx hd-garden init` 时也会自动执行），会把三个技能安装到 `.agents/skills/`（同时支持链接到 `.claude/skills/`）：
   - `garden-ui`：把文章里的 `garden ui` 意图描述编译成具体的组件围栏。
   - `garden-interactive-chart`：根据文章数据编写 `interactive`、`chart`、`figure` 与 `html` 组件。
   - `garden-post-review`：按排版与组件规范审阅整篇文章。
