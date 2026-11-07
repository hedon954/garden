---
name: garden-compose
description: 在 Garden 项目中编译、修复、校验 garden compose 想法块、静态说明图和可交互 DIL；用户要把检查提示交给 AI 时也使用。
---
# Garden Compose

这是项目技能，不安装到全局。只修改用户授权的文章/块，不发布、不自动改其他文章。

## 流程
1. 在站点根目录工作。先读本技能 references/workflow.md 与 references/static-play.md。不确定属性时，以 `npx --no-install garden ui prompt` 和引擎的实际检查为准；不要把旧 PascalCase UI/YAML 槽当成 Compose 作者语言。
2. 运行 `node .agents/skills/garden-compose/scripts/scan.mjs content/posts/文章.md`，保存目标的行号、id（如有）、hash、原始意图和 diagnostics。对已编译且无问题的块不重写。纯「哪里适合交互」请求只给建议，不写文件。
3. 运行 `node .agents/skills/garden-compose/scripts/check.mjs content/posts/文章.md`。失败时依据终端的文件、行号和错误码，再 scan 读取目标原文和哈希后修复。默认不写提示词文件、不操作剪贴板、不调用模型。draft 与 published 完全同规则，未编译白话、坏标签均失败；没有草稿豁免。这是编译/修复，不是缩进格式化。
4. 读 `references/colors.md`、`references/frames.md`、`references/examples.md`，按需读取。保留事实、原始意图和既有 id；输出一个完整 `garden compose` 围栏。作者写小写标签，Play 才用 `{@body}`、状态、表达式、条件/循环。不写任意 HTML/CSS/JS，不编造数据、图标名或属性。复杂功能超出目录时明确说明缺口；不要无声转成 html/widget。
5. 把候选围栏存到临时 Markdown 文件。只用 scripts/apply.mjs 调用权威 CLI 写回目标块：有 id 用 `--id`，无 id 用 scan 的 `--at` 行号；总是加原来的 `--base` hash，再用 `--file` 给出候选文件。没有 id 且没有 intentHash 的坏块不能用 `intent-hash: null` 定位。写回前如原文变了，重新 scan，不移除 base 保护强行覆盖。
6. 再运行 scripts/check.mjs 检查目标文件，必要时 `--all` 检查站点。只在实际通过后报告成功；检查不是视觉测试，未看浏览器不可声称外观/交互完美。

## 权威入口
- `scripts/scan.mjs` → `garden ui scan`
- `scripts/check.mjs` → `garden ui check --no-copy`
- `scripts/prompt.mjs` → `garden ui prompt`
- `scripts/apply.mjs` → `garden ui apply`（真实写文件；仅在获授权编译/修复时运行）

这些脚本只委托现有 CLI，不复制解析器/验证器，不下载包。没有本地 garden 命令则先说明项目依赖缺失，不另装版本。
