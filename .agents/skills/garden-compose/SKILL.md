---
name: garden-compose
description: "将 Garden 原文与参考效果编译、组合、检查为唯一 garden compose 入口内的布局、Markdown/安全 HTML、语义场景与必要交互。"
---
# Garden Compose

项目技能，只改用户授权的文章/块，不自动改其他文章、安装全局技能、提交或发布。

## 先理解关系，再组合
1. 分开原文事实、读者问题、指定效果与修改范围。只问建议就给建议，不写文件。保留事实、措辞、顺序、完整段落与资源；不补数据、摘要、推断关系或装饰性箭头。
2. 作者组件只有 **一个 `garden compose` 入口**。在其中选择和组合布局、Markdown/安全 HTML、语义场景和必要交互，不再让作者选择另一种组件围栏。普通正文已清楚时不增加组件。
3. 先推导「关系 → 共同边界与容器层级 → 宽度/流向/对齐 → 样式 → 真实渲染」。按需读 `references/visual-selection.md`、`references/composition-patterns.md`；不是套有限模板白名单。陌生组合或参考图必须读 `references/rendering-model.md`，再按需查 `references/layout-recipes.md`。标题和全部正文若要共用右栏，必须在同一个右侧容器；仅收集 icon/title/text/divider 不会自动建立关系。
4. 语义资源、文件、关系、选项卡等和可调参数均在同一 Compose 内；按需读 `references/static-play.md`。只有改变输入确实帮助理解时才加状态。先查实际组件契约，不因没有现成配方就断言不支持。

## 执行与验证
1. 在站点根目录读 `references/workflow.md`。运行 `node .agents/skills/garden-compose/scripts/scan.mjs content/posts/路径.md`，保存目标 id/行号、原始完整围栏 hash、原文和 diagnostics。对已有正确块不重画。
2. 属性、默认值、允许子项与图标以 **`npx --no-install garden ui schema`** 为准；需要配方再运行 `npx --no-install garden ui prompt`。把 JSON 存到 `.garden` 后只读取当前需要的组件/图标，不预加载整本手册。静态布局部分属性可能被忽略，须检查归一化结果与真实样式，不能把「解析接受」当作「生效」。
3. 原文没有围栏时，仅在授权位置首次插入一个 `garden compose` 意图块，保留原文与效果要求，再 scan。该插入不是 apply API；未编译意图不是完成品。候选始终是完整 `garden compose`；编译后原话保留在 intent，不重复展示。
4. `text/title/caption` 用行内 Markdown 与安全行内 HTML；完整段落、列表、表格、代码块等放 `markdown/html` 内容岛。岛内允许实际白名单 HTML/CSS，不允许脚本、事件与危险 URL。需要执行的独立演示用同一 Compose 的 `sandbox`；DIL 表达式和岛内字面内容的边界见能力参考。不要把受限语言误称任意 HTML/JS，也不要把它误称完全不支持 Markdown/HTML。
5. 正文默认随**实际文章动态配置**继承字号/字体，不设通用像素基线、不缩字凑版。需要强调才用支持的 size/tone/weight 机制；标题、数值、图标签、caption 和控件保留语义层级。当前其他语义尺寸与上下文看 rendering-model，不把某张截图的 computed 值当全局常量。按需读 colors/frames/examples。
6. 候选存临时 Markdown，再用 `scripts/apply.mjs` 调权威 CLI 写回：有 id 用 `--id`，否则 scan 的 `--at`；总是加原完整围栏 `--base` hash 和候选 `--file`。原文变了就重新 scan，不移除保护强行覆盖；不使用空 intentHash 定位。
7. 运行 `scripts/check.mjs`；本地文件另做 `npx --no-install garden check 文章.md`。陌生布局/指定视觉效果还要在完整主题及真实 CSS 顺序下验证桌面、窄屏、几何与实际交互。分别报告「解析通过」「渲染成功」「几何/交互通过」与「独立模型生成可靠性」；手写场景的通过不能证明短提示词可靠。没有浏览器或独立试验就如实写未验证。

脚本只委托本地 CLI，不复制验证器、不下载包、不默认调用模型或改剪贴板。本地 garden 缺失就报告依赖问题，不另装版本。可复用的新经验只提出技能维护候选，文章处理时不自行改技能。
