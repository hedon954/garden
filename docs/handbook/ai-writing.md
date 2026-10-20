---
title: 用 AI 写作
navTitle: 用 AI 写作
description: 用一句话描述想要的组件，交给 Agent 生成；提交前由同一个脚本检查，不通过时给出可以直接发给 AI 的提示词。
section: getting-started
order: 2
---

在 Garden 里，图表、指标、交互这些组件不用记语法。写一句话说清想让读者看到什么，Agent 照着站点里的 skill 把它变成组件，提交时再由脚本检查一遍。

> [!IMPORTANT] 人和 Agent 用同一套工具
> Agent 找待转换的块用 `npx garden ui scan`，写回用 `npx garden ui apply`，自查用 `npx garden ui check`；作者提交时，提交前钩子跑的也是 `npx garden ui check`。检查不通过时打印的提示词，就是交给 Agent 的下一步任务。

## 1. 写一句话

在想放组件的地方写一个不带名字的 `garden` 围栏，只写读者要做什么、看到什么，不写组件名：

````markdown
```garden
让读者拖动每天写的字数和每周写几天，看写完一篇 8000 字的长文要几周。
```
````

草稿里可以一直留着这样的想法。不是草稿的文章里还有没转换的想法时，`npx garden ui check` 和 `npx garden check` 都会报 `garden-idea`。

想法转换后可能是一块 `garden interactive`，也可能是资源卡、指标、并排对比、时间线等别的 `garden` 组件。如果一段话就能说清，Agent 也会直接改成普通段落。

## 2. Garden 自带的三个 skill

skill 放在站点的 `.agents/skills/` 目录里。`garden init` 建站时会装好；`garden sync` 或 `garden dev` 运行时会补上缺的；想全部重装，运行 `npx garden skill`。

| skill | 对 Agent 说 | 它做什么 |
| :--- | :--- | :--- |
| `garden-ui` | 「编译这篇：content/posts/文章.md」「重编译 kv-memory」，或贴上修复提示词 | 把想法转换成 `garden` 组件，修好有错误的交互块 |
| `garden-interactive-chart` | 组件目录做不出的动画、模拟 | 在文章同名目录里写一个独立 HTML 文件，正文用 `garden html` 嵌入 |
| `garden-post-review` | 「审稿：content/posts/文章.md」 | 先修 `npx garden check` 报的问题，再看交互块，最后只给文字建议，不改稿 |

`garden-ui` 还有一个只读的建议模式：问它「这篇哪里适合交互」，它会挑出最多 5 处，每处给一段可以直接粘贴的 `garden` 想法草稿。

## 3. 同一组命令

| 命令 | 作者什么时候用 | Agent 什么时候用 |
| :--- | :--- | :--- |
| `npx garden ui scan <稿件>` | 想看看还有哪些块没转换 | 第一步，拿到每块的状态、行号、原话和哈希 |
| `npx garden ui prompt` | 想看组件目录和写作规则 | 写组件之前读一遍，不凭记忆写 |
| `npx garden ui apply <稿件> --id <id>` | 一般不用 | 只替换一块，围栏外的文字逐字节不变 |
| `npx garden ui check <稿件>` | 提交前钩子自动运行 | 写完自查，直到通过 |
| `npx garden check <稿件>` | 想单独查一篇稿 | 收尾，检查标题、日期、图片和所有 `garden` 块 |

想法块没有 id，`npx garden ui apply` 用 `--intent-hash` 定位；`npx garden ui scan` 的输出里有这个哈希。

## 4. 提交前检查与修复提示词

`garden sync` 或 `garden dev` 第一次运行时会写入 `.git/hooks/pre-commit`，内容是 `exec npx --no-install garden ui check --staged --quiet`。它读的是暂存区里的版本，部分暂存时检查的正好是要提交的内容。仓库里已经有别的提交前钩子时，Garden 不覆盖，只打印需要加上的那一行。

检查不通过时，每个问题先打印一行（文件和行号、块的 id、诊断码、说明），接着是一段「发给 AI 的修复提示词」：

```console
content/posts/writing-pace.md:9  -  garden-idea  还有没编译的想法

──────────────────────── 发给 AI 的修复提示词 ────────────────────────
请处理下面 Garden 博文里列出的块：没编译的想法要编译，有错误的交互块要修好。
……
```

- 提示词同时写进 `.garden/ui-fix-prompt.md`，能用剪贴板时自动复制。不想复制时加 `--no-copy`，或者设置 `GARDEN_UI_NO_COPY=1`。
- 要贴给不能读仓库的聊天窗口时，手动运行 `npx garden ui check <稿件> --standalone`，提示词后面会附上完整的组件规则。
- 交互块里写错组件名或属性，也会在这里报出来，并指到出错的那一行。
- 确实要先提交，可以用 `git commit --no-verify`。
- 钩子被删了，运行 `npx garden hooks` 重装（加 `--force` 覆盖已有的钩子）；不想装钩子时设置 `GARDEN_SKIP_HOOKS=1`。

## 5. 代码改动也能用一句话

在改好的完整代码块下面写一个想法，说明和上一版比改了什么：

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

`garden-ui` 会把它换成一段 `diff`。这段 `diff` 紧挨着完整代码，页面就会合成可以切换「代码」和「对比上一版」的代码框。手写 `diff` 的格式见 [写文章与随想](/garden/writing)。

## 6. 不用 Agent 时

- `make new` 新建的草稿末尾附有想法块和 9 个组件的示例，写完可以删掉。
- Typora 和 Alfred 可以导入 `templates/garden-snippets.plist`，输入 `;gidea`、`;gcard` 等触发词插入骨架。
- `npx garden ui catalog` 生成一份离线的组件清单页面。

## 7. 管理后台（可选）

管理后台在 Garden 引擎仓库里，需要单独部署，部署方式和环境变量见引擎仓库的 `docs/admin-service.md`。部署后可以：

- 用 GitHub 账号登录（只允许 `ADMIN_GITHUB_LOGINS` 里列出的用户），在网页上发随想，提交为 `content/thoughts/` 下的 Markdown 文件；
- 把图片、音视频直接上传到阿里云 OSS；
- 在 `/admin/ui/blocks` 查看所有稿件里的交互块和状态，复制和提交前钩子同一份的修复提示词；
- 在 `/admin/ui` 试写组件，在 `/admin/preview/` 下预览草稿。
