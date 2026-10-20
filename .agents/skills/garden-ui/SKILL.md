---
name: garden-ui
description: >-
  Compiles the `garden` idea blocks in one Garden post into garden components
  (garden interactive, or card / stat / compare / ... , or prose, or garden
  html), fixes broken garden interactive blocks, and suggests where a post could
  use interaction. Older intent / ui blocks are handled the same way. Use when
  the user says 编译这篇 / 编译想法 / 重编译 <id> / 这篇哪里适合交互, or pastes a
  garden ui check fix prompt.
---

# 编译 Garden 交互块

作者在稿里用不带名字的 `garden` 围栏写一句想法，这个 skill 把它变成 `garden interactive` 或别的 `garden` 组件。交互组件和设计规则在 `npx garden ui prompt` 的输出里，9 个 `garden` 组件的用途和示例在 `node_modules/hd-garden/templates/garden-blocks.md`（在引擎仓库里是 `templates/garden-blocks.md`），以这两份为准，不凭记忆写组件。

作者提交时，提交前钩子跑的是同一个 `npx garden ui check`。你用来找块、写回、自查的命令，和拦住作者提交的命令是同一套。

所有命令在站点根目录运行。没给稿件路径时只问路径，不扫全库。

## 触发语与范围

| 用户说 | 处理哪些块 |
| --- | --- |
| 编译这篇：`<路径>`、编译想法 | 状态是 `uncompiled`、`stale`、`error` 的块 |
| 重编译 `<id>` | 只处理这一块，不管状态 |
| 粘贴了 `garden ui check` 的修复提示词 | 提示词里列出的块 |
| 这篇哪里适合交互 | 只读建议模式，见文末，不改稿 |

## 流程

1. 扫描：

   ```bash
   npx garden ui scan content/posts/路径.md
   ```

   stdout 是 JSON。`lang` 是 `garden-idea`（想法）、`garden-interactive`，或旧写法的 `intent` / `ui`。每块有 `lang`、`id`、`status`、`startLine`、`hash`（整段围栏的哈希，写回时当 `--base`）、`intentHash`（原话的哈希）、`intent`（原话）、`caption`、`section`（所在小节标题）和 `diagnostics`。不要自己用正则找围栏。

2. 读规则：

   ```bash
   npx garden ui prompt
   ```

   里面是组件目录、配方和设计规则。按配方的骨架写，不发明目录里没有的组件或属性。

3. 每块读原话和所在小节，三选一：
   - **写回正文**：一句话、一张表或一张 Mermaid 就能说清时。
   - **写 `garden interactive`**：读者需要拖、点、翻才能看懂时。
   - **写一段 `diff`**：想法紧跟在一段完整代码后面，说的是「和上一版比改了什么」时。按原话写出 diff，用一段普通 Markdown 写回（只有这一个 `diff` 围栏）。写回后它紧挨着那段代码，页面会合成「代码 / 对比上一版」切换；diff 里的新行要和上面的完整代码一致。
   - **写别的 `garden` 组件**：一张资源卡、几个指标、两种做法并排、一条时间线、一张静态图表、一张结构图、一份下载文件。
   - **写 `garden html`**：目录表达不了的画布动画、音频、物理模拟等。按 [garden-interactive-chart](../garden-interactive-chart/SKILL.md) 在同名目录写 HTML，用 `title` 写下判断。

4. 写 `garden interactive` 时：
   - 格式：围栏头写 `garden interactive #<id>`；`---` 上面是 `caption`、`intent`、可选的 `expect`；`---` 下面是 `npx garden ui prompt` 里的组件树。
   - 原话原样放进 `intent`，一个字都不改。
   - `caption` 摘原话里的判断。原话没有判断句，就根据小节内容补一句，并在回复里说明。
   - 原话里有已知点（"batch 1 时是 512 MiB"），写进 `expect`。
   - 数据写在块里。原话提到同名目录里已有的数据文件时，才用 `Data` 引用。
   - 块太大就拆成两块，各自就近放在要讲的段落旁边，不挪到别的文件。

5. 每块用 `apply` 写回，新内容从标准输入给：

   ````bash
   npx garden ui apply content/posts/路径.md --id <id> --base <hash> <<'GARDEN_UI'
   ```garden interactive #id
   caption: ...
   intent: |
     ...
   ---
   ...
   ```
   GARDEN_UI
   ````

   - 想法块没有 id，用 `--intent-hash <intentHash>` 定位；原话重复时改用 `--at <startLine>`。
   - 新内容可以是一个 `garden` 组件围栏（interactive、card、stat……），或一段普通 Markdown（写回正文时）。旧稿里的 `ui` 块也可以按原格式写回。
   - 新内容里不能再有没编译的想法。
   - 成功时 stdout 是 `{"ok":true,...}`。失败时 stderr 是 JSON，按 `code` 处理：
     - `apply-invalid`：新内容没通过校验，按 `diagnostics` 改了再写。
     - `apply-base`：块在扫描之后被改过。重新 `scan`，用新的 `hash`。
     - `apply-not-found` / `apply-ambiguous`：定位不到或不唯一，重新 `scan` 换定位方式。
   - 行号会随前面的写回变化，每写回一块就重新 `scan` 再处理下一块。

6. 全部写完后：

   ```bash
   npx garden ui check content/posts/路径.md
   npx garden check content/posts/路径.md
   ```

   前一条是提交前钩子跑的检查，要通过；后一条的 `ok` 要为 true。同一块连续三次修不好，停下来，把诊断原样报告给用户。

7. 回复一张表：

   | id | 选择 | 配方 | 假设 | expect |
   | --- | --- | --- | --- | --- |
   | kv-memory | garden interactive | 参数台 | 默认序列取 4K | batch 1 时 512 MiB |

   "假设"写原话没说、你替作者定下的东西（默认值、范围、补的 caption）。没有就写"无"。

## 禁止

- 直接编辑稿件文件。稿件只经 `apply` 改动；`garden html` 引用的 HTML 文件可以直接创建。
- 编造原话里没有的数字。需要数字但原话没给时，用原话里的公式算，或者问作者。
- 使用远程地址（图片、脚本、数据）。
- 改动目标块之外的正文。

## 建议模式：这篇哪里适合交互

只读，不改稿。先运行 `npx garden ui prompt` 读设计规则，再通读全文，挑出纯文字或贴图说不清的段落：

- 公式或数字随参数变化（参数台、换算器）
- 多步过程（步进器、流程）
- 两种做法的差别（对比）
- 一组格子、字节或内存布局（格子图）

每处给出：所在小节、为什么文字不够、一段可以直接粘贴到该段落后面的 `garden` 想法块草稿。草稿只写读者要做什么、看到什么，以及原文里已有的数字，不写组件名。最多 5 处；没有合适的就说没有。
