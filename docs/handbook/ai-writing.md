---
title: 用 AI 写作
navTitle: 用 AI 写作
description: 用一句话描述想要的组件，交给 Agent 生成；提交前由同一个脚本检查，失败时打印可粘贴给 AI 的修复提示词。
section: getting-started
order: 2
---

在 Garden 里写图表、指标或交互组件不用记标签语法。你在正文写一句自然语言想法，Agent 按站点里的 skill 把它编译成组件，提交时再由同一套命令检查。

> [!IMPORTANT] 人和 Agent 用同一套工具
> Agent 找块用 `npx garden ui scan`，写回用 `npx garden ui apply`，自查用 `npx garden ui check`；作者提交时 pre-commit 钩子运行的也是 `npx garden ui check`。检查失败时打印的提示词，就是发给 Agent 的下一步指令。

## 1. 写一句想法

在想放组件的位置写一个不带名字的 `garden` 围栏，只写想让读者做什么、看到什么，不用写组件名：

````markdown
```garden
让读者拖动每天写的字数和每周写几天，看写完一篇 8000 字的长文要几周。
```
````

草稿（`draft: true`）里可以保留未编译的想法；非草稿文章里还有未编译的想法时，`npx garden ui check` 和 `npx garden check` 都会报 `garden-idea` 错误。Agent 会根据内容把想法编译成 `garden interactive`、`card`、`stat`、`compare` 等内置组件，或者在一段话就能说清时直接写回普通段落。

## 2. 随包安装的三个 skill

三个 skill 存放在站点根目录的 `.agents/skills/` 下。`npx hd-garden init` 建站时会自动安装，首次运行 `npx garden sync` 或 `npx garden dev` 时会补齐缺失的 skill，运行 `npx garden skill` 可手动重装。

| Skill 名称 | 触发话术示例 | 执行操作 |
| :--- | :--- | :--- |
| `garden-ui` | 「编译这篇：content/posts/writing-pace.md」「重编译 writing-pace」或直接粘贴修复提示词 | 扫描 `uncompiled`、`stale`、`error` 状态的块，按规则生成组件并用 `npx garden ui apply` 写回；说「这篇哪里适合交互」则进入只读建议模式，最多挑出 5 处可直接粘贴的想法草稿 |
| `garden-interactive-chart` | 组件目录表达不了的画布动画或模拟 | 在文章同名目录下编写独立 `.html` 文件，正文中只用 `garden html` 围栏嵌入 |
| `garden-post-review` | 「审稿：content/posts/writing-pace.md」 | 先修 `npx garden check` 报出的结构错误，再按图表规范修交互块，最后通读全文只给修改建议而不改稿 |

## 3. `garden ui` 子命令与整篇检查

`garden ui` 下的子命令供作者和 Agent 共用；想法块没有 `id` 时，`npx garden ui apply` 用 `npx garden ui scan` 输出的 `--intent-hash`（或行号 `--at`）定位。

| 命令 | 作者何时使用 | Agent 何时使用 |
| :--- | :--- | :--- |
| `npx garden ui scan <稿件.md>` | 查看文内有哪些待编译或报错的块 | 第一步：读取每块的 `status`、`startLine`、`hash` 和 `intentHash` |
| `npx garden ui prompt [--studio]` | 查看组件目录、设计规则与配方示例 | 编写组件前必读，只使用目录里存在的组件与属性 |
| `npx garden ui schema` | 查看组件目录的 JSON 定义 | 需要结构化读取组件属性约束时调用 |
| `npx garden ui apply <稿件.md> --id <id>` | 日常手写一般不用 | 按 `--id`、`--intent-hash` 或 `--at` 替换单个围栏，围栏外逐字节不变 |
| `npx garden ui check <稿件.md>` | 提交前钩子自动运行（也可传 `--staged` 或 `--all`） | 写回后自查，直到退出码为 `0` |
| `npx garden ui catalog [--out 文件] [--no-open]` | 在 `.garden/ui-catalog.html` 生成离线组件清单并在浏览器查看 | 一般不用 |
| `npx garden check <稿件.md>` | 单独检查一篇文章的标题、图片与全部围栏 | 全部块写回后的收尾检查，确认输出 JSON 的 `ok` 为 `true` |

## 4. 提交前检查与修复提示词

首次运行 `npx garden sync` 或 `npx garden dev` 时，Garden 会在 `.git/hooks/pre-commit` 写入 `exec npx --no-install garden ui check --staged --quiet`（若已有其他钩子则不覆盖，只提示需添加的命令）。`--staged` 直接通过 `git show :<路径>` 读取暂存区内容，失败时输出文件行号、诊断码和一段修复提示词：

```console
content/posts/writing-pace.md:9  -  garden-idea  还有没编译的想法

──────────────────────── 发给 AI 的修复提示词 ────────────────────────
请处理下面 Garden 博文里列出的块：没编译的想法要编译，有错误的交互块要修好。
……
```

- 提示词同时写入 `.garden/ui-fix-prompt.md`，系统有 `pbcopy`、`wl-copy`、`xclip`、`xsel` 或 `clip` 时自动复制到剪贴板；传入 `--no-copy` 或设置 `GARDEN_UI_NO_COPY=1` 可关闭自动复制。
- 需要把提示词发给无法读取本地仓库的网页端聊天窗口时，运行 `npx garden ui check <稿件.md> --standalone`，提示词末尾会附上完整的 `npx garden ui prompt` 组件规则（单次最多附 10 个问题块的原文）。
- 交互块里写错标签名（如把 `<Slider>` 写成 `<Slidr>`）也会报 `ui-component` 并指到具体行号；确实要先带病提交时可用 `git commit --no-verify`。
- 需要重装钩子时运行 `npx garden hooks`（加 `--force` 覆盖已有钩子）；不想自动安装钩子时设置 `GARDEN_SKIP_HOOKS=1`。

## 5. 用一句话生成代码对比

在改好的完整代码块正下方放一个 `garden` 想法块，用一句话写出它和上一版相比改了什么：

````markdown
```yaml
pages:
  garden:
    title: "用 Markdown 写丨推送之后网站自己更新"
```

```garden
和上一版比：标题原来用句号和换行分两行，现在改成用「丨」分行。
```
````

Agent 按 `garden-ui` skill 会把这个想法块替换成一段紧挨着完整代码的 `diff` 围栏。页面渲染时会把完整代码和 `diff` 合成一个带「代码 / 对比上一版」切换按钮的代码框，手写 `diff` 的规则见 [写文章与随想](/garden/writing)。

## 6. 不使用 Agent 时的快捷输入

不借助 AI 手写组件时，可以直接使用包内自带的模板与代码片段：

- `make new` 创建的草稿底部自带一段 `<!-- 组件速查 ... -->` 注释，包含想法块和 9 个组件的示例，写完可直接删掉。
- `templates/garden-blocks.md` 汇总了想法块与 9 个组件的适用场景（`when` / `whenNot`）和可复制示例；macOS 与 Typora / Alfred 用户可导入 `templates/garden-snippets.plist`，输入 `;gidea`（或 `;garden想法`）、`;gcard`、`;gstat`、`;gcompare`、`;gtimeline`、`;gchart`、`;gfigure`、`;ghtml`、`;ginteractive`、`;gfile` 即可展开对应围栏。
- 引擎仓库的 `editors/vscode`、`editors/typora` 与 `editors/obsidian` 目录提供了对应的编辑器片段与插件支持，运行 `npx garden ui catalog` 则可在本地生成 `.garden/ui-catalog.html` 离线组件画廊。

## 7. 可选的独立管理后台

Garden 引擎仓库内置了可选的 `/admin` 管理后台（位于 `app/admin` 与 `worker/`），可通过 `npm run admin:local`、`npm run admin:cloudflare` 或 Docker 单独部署。配置环境变量后，后台提供以下网页端功能：

- 通过 GitHub OAuth 登录（仅允许 `ADMIN_GITHUB_LOGINS` 白名单中的用户），在网页端编写随想并用 `CONTENT_GITHUB_TOKEN` 直接提交为 `content/thoughts/*.md`，图片与音视频通过十分钟有效的 Post Policy 直传阿里云 OSS。
- 在 `/admin/ui/blocks` 查看仓库内全部稿件（含草稿）的交互块状态，一键复制与命令行钩子相同的修复提示词。
- 在 `/admin/ui` 组件工作台用自然语言试写或手改组件（配置 `UI_MODEL_BASE_URL`、`UI_MODEL_API_KEY`、`UI_MODEL_NAME`），在 `/admin/ui/catalog` 浏览组件清单，在 `/admin/preview/<路径>` 预览未发布草稿，以及在 `/admin/ui/evals` 运行模型自检。
