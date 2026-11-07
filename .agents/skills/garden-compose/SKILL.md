---
name: garden-compose
description: 根据 Garden 原文选择、组合和校验合适的 Compose 说明图或交互 DIL；用于内容可视化建议、未知图形时的选型、指定视觉效果的实现，以及编译和修复检查错误。
---
# Garden Compose

这是项目技能，不安装到全局。只修改用户授权的文章/块，不发布、不自动改其他文章。

## 从内容选择表达方式
1. 分离原文、读者需要回答的问题、作者指定效果和授权修改位置。效果要求不是展示文案。若只要求建议，输出候选形式与理由，不写文件；明确要求绘制时才实施。
2. 抽取原文的实体、并列类别、明确顺序、包含层级、交互双方、比较维度、数值及公式；区分已陈述关系与推测。保留事实、措辞、顺序；已有加粗标签映射标题，余文映射正文，不补摘要或结论。
3. 有指定效果时优先实现该效果；没有时按需读取 `references/visual-selection.md`，从读者问题选择最简单的受支持形式。原文没有关系或数据时，不凭空制造箭头、因果、阶段或数值；普通段落/列表已清楚就不画。
4. 用 `references/composition-patterns.md` 将所选关系拆成容器排列、内容叶子、重复单元与必要连接器；按内容组合，不机械套整张模板。典型形式是可增长的经验，不是白名单；没有匹配时，从原文关系出发，查该参考的基础组件与组合操作，再按需核对当前目录，构造新组合并验证。不能仅因没有现成配方就断言不支持；只有实际能力限制才构成边界。横向等宽卡片的具体 token 与响应式规则读取 `references/layout-recipes.md`。
5. 只有读者改变输入确实有价值，且原文提供公式/数据时才选 Play；先核对 `references/static-play.md`，不要把静态标签与 Play 任意混用。关系含糊时保留中性分组，或说明待确认之处，不替作者猜。
6. 首次使用陌生组合或需要匹配参考图时，按需读取 `references/rendering-model.md`：先推导共同边界与容器层级，再核实宽度、默认样式、嵌套和完整主题效果；图标窄栏与多段右栏见 `references/layout-recipes.md`。
7. 对照原文逐项检查：每个事实都有去处、每条连接有依据、没有把装饰当拓扑、没有因截断/缩写丢失信息；再按下方流程 scan/apply/check。仅不确定的组件/属性查目录，不预加载全部参考；检查不等于浏览器视觉验收。

实践中形成的可复用组合，按 `references/composition-patterns.md` 的维护规则提炼候选；维护技能须走正常授权与审阅，不在文章处理时自行改技能。

## 流程
1. 在站点根目录工作。先读本技能 references/workflow.md 与 references/static-play.md。不确定属性时，以 `npx --no-install garden ui prompt` 和引擎的实际检查为准；不要把旧 PascalCase UI/YAML 槽当成 Compose 作者语言。
2. 原文尚无围栏时，只在授权位置把原文与效果要求原样放进一个 `<intent>` 围栏，再 scan；不改其他正文。已存在块直接 scan。运行 `node .agents/skills/garden-compose/scripts/scan.mjs content/posts/文章.md`，保存目标的行号、id（如有）、hash、原始意图和 diagnostics。对已编译且无问题的块不重写。纯「哪里适合交互」请求只给建议，不写文件。
3. 运行 `node .agents/skills/garden-compose/scripts/check.mjs content/posts/文章.md`。失败时依据终端的文件、行号和错误码，再 scan 读取目标原文和哈希后修复。默认不写提示词文件、不操作剪贴板、不调用模型。draft 与 published 完全同规则，未编译白话、坏标签均失败；没有草稿豁免。这是编译/修复，不是缩进格式化。
4. 按需读取 `references/colors.md`、`references/frames.md`、`references/examples.md`。保留事实、原始意图和既有 id；输出一个完整 `garden compose` 围栏。使用小写标签，Play 才用 `{@body}`、状态、表达式、条件/循环。不写任意 HTML/CSS/JS，不编造数据、图标名或属性。复杂功能超出目录时明确说明缺口；不要无声转成 html/widget。
5. 把候选围栏存到临时 Markdown 文件。只用 scripts/apply.mjs 调用权威 CLI 写回目标块：有 id 用 `--id`，无 id 用 scan 的 `--at` 行号；总是加原来的 `--base` hash，再用 `--file` 给出候选文件。没有 id 且没有 intentHash 的坏块不能用 `intent-hash: null` 定位。写回前如原文变了，重新 scan，不移除 base 保护强行覆盖。
6. 再运行 scripts/check.mjs 检查目标文件，必要时 `--all` 检查站点。只在实际通过后报告成功；检查不是视觉测试，未看浏览器不可声称外观/交互完美。

## 权威入口
- `scripts/scan.mjs` → `garden ui scan`
- `scripts/check.mjs` → `garden ui check --no-copy`
- `scripts/prompt.mjs` → `garden ui prompt`
- `scripts/apply.mjs` → `garden ui apply`（真实写文件；仅在获授权编译/修复时运行）

这些脚本只委托现有 CLI，不复制解析器/验证器，不下载包。没有本地 garden 命令则先说明项目依赖缺失，不另装版本。
