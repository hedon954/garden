# Rendering model · 从结构推导真实排版

本参考解释经过验证的行为与查证方法，不是另一份标签白名单。标签、属性、枚举和图标名称以当前 `garden ui prompt` 为入口；运行结果以本地安装引擎为准。需要某种组合时只读相关部分，不将整份手册塞入作者提示词。

## 执行：关系 → 层级 → 布局 → 样式 → 实际渲染
1. 从原文确定实体、同级/包含关系、顺序；从参考图另外抽取几何约束：哪些元素共享左边界、哪些同行、谁独占固定窄栏、谁占剩余宽度、哪里跨栏、何处分隔。不能只识别“图标、标题、正文、线”四种对象。
2. 先写出容器树。需要共同对齐的标题与多段正文必须放进同一个右栏容器；不是把图标与标题做一行，再把正文放到外层。每个同级内容单元重复相同子树。
3. 核实容器的布局机制和上下文：父元素怎样分配宽度、子元素是否会等分、默认是否换行、嵌套是否有额外间距、窄屏规则是否改排列。不要只凭标签名判断布局。
4. 最后选择字体、强调、间距、边框。明确“容器对齐/子项排列”和“文字对齐”不是同一回事；不要在祖先上加 center 再期待后代自动左对齐。指定视觉效果不能成为编造属性/任意 CSS 的理由。
5. 先检查，再渲染完整主题下的最小局部，确认通过后重复组合。检查不能代替几何和视觉验收。

## 权威行为从哪里查
- `ui/compose/markup.mjs`：属性实际读取、枚举、默认值、父子筛选、静态 Markdown 到节点的转换。
- `ui/compose/render.mjs`：节点到 DOM、默认包装、哪些属性实际输出、段落如何渲染。
- `ui/compose/compose.css`：直接子元素选择器、宽度分配、上下文样式和媒体查询。
- 主题：`app/globals.css` → `app/styles/tokens.css` → `app/styles/a2.css` → `app/styles/shell.css`；以站点实际加载顺序为准。必须保留实际 `.markdown-body`/文章祖先；仅复制组件 CSS 或基础变量不是完整主题测试。

目录是发现入口，不等于完整行为契约。例如当前目录的“任意子元素”不表示每个子元素同样分宽；属性被接受也不代表被读取。陌生组合按上述三层源码只查相关分支，记录具体行为；不能把未查证的印象写成支持能力。可把反复验证的上下文行为持续补入这一份参考，不在多个配方复制一套可能过期的属性表。

## 已核实的局部行为
| 元件/上下文 | 实际行为与后果 |
|---|---|
| 外层场景 | `renderCompose` 总会生成外层 figure；默认有框。唯一最外层 `<figure frame="none">…</figure>` 可移除场景边框、圆角、背景和内边距；不移除内部 card，不改变正常外边距。与 box frame 或 Play 头部不是同一契约。 |
| row | flex；默认 wrap、stretch；gap 默认为 8px。直接 card/stack/title/text 被设为 `flex:1 1 0`，不要用两个 stack 期待自动得到固定窄图标栏。 |
| row + icon | icon 是固定大小、不伸缩的直接子项；md 15px、xl 22px。相同 size 保持重复项的图标栏等宽，不需要编造 width。名字必须查实际图标目录；不存在的名字会报错。 |
| row + group | group 是纵向 flex 容器，width:100%、min-width:0；flex 收缩后占图标与 gap 之外的宽度。group 支持 gap；内部所有独立 text 共用左边界。已在完整主题下验证。 |
| row + prose | prose 也为纵向容器，width:100%；但解析器只保留 children，不读取 gap。因此不要给 prose 编造可控 gap。其 CSS 间距会继承祖先 `--gc-gap`。prose 内 title 自身默认不居中；完整主题下已验证 title size="lg" 与正文共用左边界。若祖先开启 center，仍须检查继承结果。 |
| row > stack | 有专门的 padding-top:12px；其直接 title 又有专门 font 规则。不能把已验证 group 随意替换为 stack，并假设同样的顶部与字号。 |
| 标题/正文 | title 默认 14px/1.3、500；text 默认 15px/1.6、400。要标题与正文同字号，用单独 text 加 **原文标题**，不是 caption。每个原始段落单独 text；一个 text 的空行只是 `<br><br>`，不是独立段落。实际主题可能覆盖最终值，须测 computed style。 |
| 对齐 | row align=center 不仅改变交叉轴，还会使文字居中；stack align=center 同样影响后代。align=start 当前不输出显式 data-align，不可声称它会生成 flex-start CSS。本配方不需要中心对齐。 |
| 窄屏 ≤800px | 普通 row 变纵向；nowrap 保持横向并启用横向溢出机制，row gap 被改为4px。右栏仍须可收缩，必须测长正文无横向溢出，不能只看到 nowrap 就宣称移动端正确。 |
| divider | 渲染为 hr，1px 上边线，固定上下 margin；放在外层 stack 的两个 row 之间。普通 list 会筛掉直接 divider，即使解析成功。不能把它当任意父级都能保留的装饰。 |

## 实际验收与证据层级
- **语法接受**：parse/check 成功。未知标签或图标会报错；某些未读取属性和被筛选子项可能静默丢失，不能靠“无报错”判断完成。
- **渲染保留**：SSR HTML 中应能逐项找到原文、独立正文段落、图标和分隔线；数清重复项与分隔线。
- **几何正确**：完整文章 CSS 顺序与祖先上下文；桌面及窄屏分别检查标题、各段正文左边界相同且在图标右侧，所有图标列对齐，标题非居中，正文不跨回图标列，无卡片/箭头和横向溢出；截图检查视觉密度。
- **模型可靠性**：手写 DIL 通过上述检查，只能证明该组合能工作，不能证明新的模型仅凭作者一句需求就会稳定生成。若做独立模型试验，另记输入、环境和实际输出。

仓库已有完整主题浏览器回归：`node --test tests/compose-editorial-layout.test.mjs`；无 Chrome 时会 skip，不能报告浏览器通过。已有文章必须使用授权范围与 hash 保护，不能为了验证擅自改正文。

## English execution reference
- Extract semantic relations from the source and geometric constraints from the reference independently. Identify shared edges, same-row items, fixed versus flexible columns, spanning content and separators. Preserve source facts and wording.
- Build the container tree first: elements sharing a text-column edge belong to one content container. A row of icon plus heading followed by an outer body is a different layout from icon plus a shared heading/body column.
- Inspect the current relevant branches of `ui/compose/markup.mjs`, `render.mjs`, and `compose.css`, then the actual article theme and ancestor context. The catalog is a discovery entry, not a full behavioral contract. Do not load the whole catalog into a prompt.
- Current verified behaviors: row defaults to wrapping/stretch, 8px gap. Direct card/stack/title/text share flex space; a direct icon is fixed (md 15px, xl 22px). A direct group is a width:100%, min-width:0 vertical container with a supported gap; it shrinks beside the icon. Prose keeps children but does not read a gap prop. A direct row>stack receives 12px top padding and contextual title styling.
- `title` defaults to 14px/1.3, weight 500; `text` to 15px/1.6, weight 400, before theme overrides. A separate bold text heading keeps the body size. Each original paragraph gets its own text; blank lines inside one text become breaks, not independent paragraphs. Ancestor center alignment can center text; align=start does not emit a data-align override.
- At viewport <=800px a normal row stacks; nowrap stays horizontal, gains overflow behavior and a 4px row gap. Test long content rather than assuming nowrap proves mobile correctness. A divider is an hr with a 1px line and vertical margins; list filters out direct dividers even if parsing succeeds.
- Static scenes retain their default frame. A sole outer `figure frame="none"` removes scene border, radius, background and padding, not internal cards or normal scene margins. This is not a Play header or an internal box setting.
- Keep four evidence levels distinct: accepted syntax; retained SSR leaves; correct geometry/appearance under the complete theme at wide and narrow viewports; independent model-generation reliability. Hand-authored passing DIL proves only the tested combination, not that a fresh model reliably generates it from a short request.
- Regression entry: `node --test tests/compose-editorial-layout.test.mjs`. A skipped browser test is not a pass. For existing articles, retain authorized scope and hash-protected writes.
