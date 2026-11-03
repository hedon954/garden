---
title: 语法检查与快捷输入
navTitle: 语法检查与快捷输入
description: 使用 npx garden check 检查文章诊断码，安装 VS Code 与 Typora 插件，配置 Git 提交前检查钩子与 Agent 技能。
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
| `compose-uncompiled` | 错误 | 非草稿里的 `garden compose` 还是白话，没有编译成 YAML 树 |
| `compose-invalid` | 错误 | `garden compose` 的 YAML 树不合法：未知零件、对不上的 `for`，或重复的 `id` |
| `garden-name` | 错误 | 未知的 `garden` 组件名（支持 `card`、`stat`、`compare`、`timeline`、`chart`、`compose`、`html`、`interactive`、`file`、`relations`、`list`、`choice`） |
| `garden-yaml` | 错误 | `garden` 围栏内 YAML 语法错误、顶层不是键值/列表，或包含该组件不支持的键名 |
| `garden-relations` | 错误 | `garden relations` 的要素数量不在 3～6 个之间，或 `links` 配置不合法（要素更多或有分支改用 `mermaid` 流程图，只走一遍的步骤用 `garden list`） |
| `garden-file` / `file-outside` | 错误 | `garden file` 手写了 `resolved`、缺少有效的 `src` / `files`，或本地路径越出了 `content/` 目录 |
| `file-large` | 警告 | `garden file` 引用的单个本地文件体积超过 `5 MB` |
| `compare-long` | 错误 | `garden compare` 并排模式下单个对比格的正文超过约 60 字（带 `verdict` 的上下对照不受此限） |
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

1. **新建文章自动附带速查表**：运行 `make new SLUG=xxx TITLE="..."` 创建文章时，生成的 `.md` 文件底部会自动带有一段 `<!-- 组件速查 ... -->` HTML 注释，列出想法块和各个组件的示例写法，复制需要的那块即可。这段注释不会显示在页面上，写完可以删掉。
2. **代码片段模板文件**：`hd-garden` 包内的 `templates/` 目录自带两份模板文件：
   - `templates/garden-blocks.md`：想法块和内置组件的可复制 Markdown 模板。
   - `templates/garden-snippets.plist`：macOS 系统文本替换词条（可拖入「系统设置 → 键盘 → 文本替换」），触发词是 `;gidea`（也可以输入 `;garden想法`）、`;gcard`、`;gstat`、`;gcompare`、`;gtimeline`、`;gchart`、`;gcompose`、`;ghtml`、`;ginteractive`、`;gfile`、`;grel`、`;glist`、`;gchoice`。`;gcompose` 展开成带一句白话的 `garden compose`；其余展开成对应围栏。
3. **安装 AI Agent 技能（`npx garden skill`）**：在站点目录运行 `npx garden skill`（`npx hd-garden init` 时也会自动执行），会把三个技能复制到站点根目录下的 `.agents/skills/`：
   - `garden-ui`：把文章里的 `garden` 想法描述编译成具体的组件围栏。
   - `garden-interactive-chart`：根据文章数据编写 `interactive`、`chart`、`compose` 与 `html` 组件。
   - `garden-post-review`：按排版与组件规范审阅整篇文章。

## 5. VS Code、Cursor 与 Typora 插件

Intelligent UI 插件是写交互组件的编辑器入口：插入一句想法、在编辑器里预览、打开组件清单，再把编译交给 `garden-ui` skill。插件随 `hd-garden` 发布，站点不用从 `editors/vscode` 或 `editors/typora` 源码编译。

### 安装

`npx hd-garden init` 把产物复制到 `.garden/editors/`（VS Code / Cursor 的 VSIX，以及 Typora 插件）。终端可交互时会分别询问要不要装进 VS Code / Cursor、要不要装进 Typora。第一次 `npx garden sync` 或 `npx garden dev` 如果还没问过，会再问一次。`y` 安装，直接回车跳过。

没有 TTY、环境变量 `CI` 为 `1`，或设置了 `GARDEN_SKIP_EDITORS` 时，不会等待输入，只提示手动安装。`GARDEN_SKIP_EDITORS` 只跳过这次自动询问；下面的命令照常安装，并且可以重复执行：

```bash
npx garden editors install
npx garden editors install --yes
npx garden editors install --vscode
npx garden editors install --typora
```

`garden help` 里也能看到 `editors install`。

**VS Code / Cursor。** 本机有 `code` 或 `cursor` 时，安装会把 VSIX 装进那个编辑器。两个命令都在时各装一次。没有命令行时，打开扩展视图，点右上角「…」，选择 Install from VSIX，文件在 `.garden/editors/vscode/`。

**Typora。** Typora 没有官方插件接口，要先安装 [typora-community-plugin](https://github.com/typora-community-plugin/typora-community-plugin/blob/main/docs/en-us/user-guide/1a-installation.md)。安装命令会检查常见位置；没找到时仍把插件复制到 `~/.typora/community-plugins/plugins/hedon954.garden-intelligent-ui/`。macOS 还会复制到 `~/Library/Application Support/abnerworks.Typora/plugins/plugins/hedon954.garden-intelligent-ui/`。然后打开 Typora，在「设置 → 已安装插件」里勾选 Garden Intelligent UI。升级 Typora 会覆盖社区框架改过的程序文件，需要重新安装 typora-community-plugin，再勾选本插件。围栏原文还在稿件里。

Obsidian 插件这一轮不随包安装。

### 在编辑器里怎么用

1. **插入想法。** VS Code / Cursor：macOS 用 `Cmd+Alt+I`，Windows / Linux 用 `Ctrl+Alt+I`，或命令「插入 Garden 块」。Typora：输入 `/` 后选 `/garden`（下一层列表每一项有一张小预览图），或命令「插入 Garden 块」直接打开组件列表（Windows / Linux 默认 `Ctrl+Alt+I`，macOS 请到「设置 → 快捷键」里自己录，因为 Option 会改写按键）。插入的是不带组件名的 `garden` 围栏，正文说明要写成哪种组件、写上哪些事实，交给 `garden-ui` skill 编译。
2. **预览。** 打开 Markdown 预览（Typora 里光标离开围栏即可）。`ui` 块画成和博客一样的组件，`intent` 块显示成想法卡片。点滑杆、按钮不会跳回源码。
3. **看组件清单。** VS Code / Cursor 里用「查看组件清单」，点「用它开始」把配方插进当前稿件。终端里的同一份清单：

   ```bash
   npx garden ui catalog
   ```

   生成 `.garden/ui-catalog.html`。
4. **交给 skill 编译。** 「复制编译提示词」在中文站点得到 `编译这篇：<相对路径>`，在 `locale: en_US` 的站点得到 `Compile this post: <相对路径>`。把这句话发给装了 `garden-ui` skill 的 Agent。它会运行 `npx garden ui scan`，阅读 `npx garden ui prompt`，再用 `npx garden ui apply` 只替换这一块。插件本身不调用模型。写完用 `npx garden ui check` 或提交前钩子再查一遍。
