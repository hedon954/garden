---
name: garden-ui
description: >-
  Compiles the intent blocks in one Garden post into ui blocks (or prose, or
  garden html), recompiles stale or broken ui blocks, and suggests where a post
  could use interaction. Use when the user says 编译这篇 / 编译意图块 / 重编译
  <id> / 这篇哪里适合交互, or pastes a garden ui check fix prompt.
---

# 编译 Garden 交互块

作者在稿里用 `intent` 围栏写一句想法，这个 skill 把它变成 `ui` 块。`ui` 块的格式、组件和设计规则都在 `npx garden ui prompt` 的输出里，以那份为准，不凭记忆写组件。

所有命令在站点根目录运行。没给稿件路径时只问路径，不扫全库。

## 触发语与范围

| 用户说 | 处理哪些块 |
| --- | --- |
| 编译这篇：`<路径>`、编译意图块 | 状态是 `uncompiled`、`stale`、`error` 的块 |
| 重编译 `<id>` | 只处理这一块，不管状态 |
| 粘贴了 `garden ui check` 的修复提示词 | 提示词里列出的块 |
| 这篇哪里适合交互 | 只读建议模式，见文末，不改稿 |

## 流程

1. 扫描：

   ```bash
   npx garden ui scan content/posts/路径.md
   ```

   stdout 是 JSON。每块有 `lang`、`id`、`status`、`startLine`、`hash`（整段围栏的哈希，写回时当 `--base`）、`intentHash`（原话的哈希）、`intent`（原话）、`caption`、`section`（所在小节标题）和 `diagnostics`。不要自己用正则找围栏。

2. 读规则：

   ```bash
   npx garden ui prompt
   ```

   里面是组件目录、配方和设计规则。按配方的骨架写，不发明目录里没有的组件或属性。

3. 每块读原话和所在小节，三选一：
   - **写回正文**：一句话、一张表或一张 Mermaid 就能说清时。
   - **写 `ui`**：读者需要拖、点、翻才能看懂时。
   - **写 `garden html`**：目录表达不了的画布动画、音频、物理模拟等。按 [garden-interactive-chart](../garden-interactive-chart/SKILL.md) 在同名目录写 HTML，用 `title` 写下判断。

4. 写 `ui` 时：
   - 原话原样放进块头的 `intent`，一个字都不改。`compiled` 不用写，`apply` 会写。
   - `caption` 摘原话里的判断。原话没有判断句，就根据小节内容补一句，并在回复里说明。
   - 原话里有已知点（"batch 1 时是 512 MiB"），写进 `expect`。
   - 数据写在块里。原话提到同名目录里已有的数据文件时，才用 `Data` 引用。
   - 块太大就拆成两块，各自就近放在要讲的段落旁边，不挪到别的文件。

5. 每块用 `apply` 写回，新内容从标准输入给：

   ````bash
   npx garden ui apply content/posts/路径.md --id <id> --base <hash> <<'GARDEN_UI'
   ```ui
   ---
   id: ...
   caption: ...
   intent: |
     ...
   ---
   ...
   ```
   GARDEN_UI
   ````

   - 没写 id 的 `intent` 块用 `--intent-hash <intentHash>` 定位；原话重复时改用 `--at <startLine>`。
   - 新内容可以是一个 `ui` 围栏、一个 `garden html` 围栏，或一段普通 Markdown（写回正文时）。
   - 成功时 stdout 是 `{"ok":true,...}`。失败时 stderr 是 JSON，按 `code` 处理：
     - `apply-invalid`：新内容没通过校验，按 `diagnostics` 改了再写。
     - `apply-base`：块在扫描之后被改过。重新 `scan`，用新的 `hash`。
     - `apply-not-found` / `apply-ambiguous`：定位不到或不唯一，重新 `scan` 换定位方式。
   - 行号会随前面的写回变化，每写回一块就重新 `scan` 再处理下一块。

6. 全部写完后：

   ```bash
   npx garden check content/posts/路径.md
   ```

   直到 `ok` 为 true。同一块连续三次修不好，停下来，把诊断原样报告给用户。

7. 回复一张表：

   | id | 选择 | 配方 | 假设 | expect |
   | --- | --- | --- | --- | --- |
   | kv-memory | ui | 参数台 | 默认序列取 4K | batch 1 时 512 MiB |

   "假设"写原话没说、你替作者定下的东西（默认值、范围、补的 caption）。没有就写"无"。

## 禁止

- 直接编辑稿件文件。稿件只经 `apply` 改动；`widget` 的 HTML 文件可以直接创建。
- 编造原话里没有的数字。需要数字但原话没给时，用原话里的公式算，或者问作者。
- 使用远程地址（图片、脚本、数据）。
- 改动目标块之外的正文。

## 建议模式：这篇哪里适合交互

只读，不改稿。先运行 `npx garden ui prompt` 读设计规则，再通读全文，挑出纯文字或贴图说不清的段落：

- 公式或数字随参数变化（参数台、换算器）
- 多步过程（步进器、流程）
- 两种做法的差别（对比）
- 一组格子、字节或内存布局（格子图）

每处给出：所在小节、为什么文字不够、一段可以直接粘贴到该段落后面的 `intent` 草稿。草稿只写读者要做什么、看到什么，以及原文里已有的数字，不写组件名。最多 5 处；没有合适的就说没有。
