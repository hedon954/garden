# Layout recipes · 布局组合要点

Read only the section matching the requested layout. / 按需读取对应布局小节。

## Horizontal equal-width cards · 横向等宽卡片

## Source mapping · 原文映射
- Count the source items; create one card per item and set `cols` to that count (1–6). For more than six items, use multiple rows with at most six columns. / 按原文条目数创建卡片并设置 cols（1–6）；超过六项时分多行，每行不超过六列。
- Keep wording, facts and order. Promote existing labels to titles without inventing new claims; retain the original source and request verbatim in `<intent>`. / 保留措辞、事实、顺序；现有标签可作标题，不发明结论，intent 原样保留材料和要求。
- Use static `grid`, not `compare`, for independent topics with no comparison. / 不是实际对比时，不用 compare 充当卡片布局。

## Verified static DIL · 已核对的静态 DIL
Use `<grid cols={3} gap={3}>` with three direct `<card>` children. `cols` accepts 1–6. Equal `minmax(0, 1fr)` tracks give equal widths. At viewport width ≤800px the current theme switches to one column. Use this built-in behavior; do not add `nowrap` or custom CSS.

三个直接 card 子元素配 `grid cols={3} gap={3}`；cols 为 1–6。等宽来自等分网格；当前主题在视口 ≤800px 时收为单列，不强制窄屏横排。

- `gap` and `padding`: 0–4 → 0/4/8/12/16px. A restrained consistent default is `padding={3} radius="md" border="subtle" background="surface"` on each card. Apply the same tokens to every card unless a distinct style was requested. / 未指定差异样式时，为所有卡片使用同一组 token。
- Supported radii: none/sm/md/lg/xl/full. Borders: true/false/subtle/none/strong. Backgrounds include surface, surface-secondary, surface-accent, surface-tip, surface-muted, paper, well, transparent. Consult tokens only when needed.
- Equal width does not mean equal word count, forced line breaks or fixed heights. Grid items stretch within their row by normal CSS grid behavior; content remains natural, without height clamps or filler text. / 不为等宽删改原文、补字或强插换行，也不把多行内容裁成固定高度。
- Icons and semantic colors are optional, not mandatory decoration. Do not invent icons or inject arbitrary CSS. / 图标与颜色可选，不强行装饰。

## Example · 示例

```garden compose
<intent>
- **人员**：解决的是团队到底需要哪几类人，各自管什么、不管什么，他们如何进行合作。
- **流程**：从冒出一个点子到软件上线，先迈左脚还是先迈右脚，怎么用最低成本试错。
- **产品**：一款真正的好产品本身长什么样，有哪些绝不能碰的死穴。
使用 garden compose 来呈现横向等宽卡片。
</intent>
<grid cols={3} gap={3}>
  <card padding={3} radius="md" border="subtle" background="surface">
    <title>人员</title>
    <text>解决的是团队到底需要哪几类人，各自管什么、不管什么，他们如何进行合作。</text>
  </card>
  <card padding={3} radius="md" border="subtle" background="surface">
    <title>流程</title>
    <text>从冒出一个点子到软件上线，先迈左脚还是先迈右脚，怎么用最低成本试错。</text>
  </card>
  <card padding={3} radius="md" border="subtle" background="surface">
    <title>产品</title>
    <text>一款真正的好产品本身长什么样，有哪些绝不能碰的死穴。</text>
  </card>
</grid>
```

Follow workflow.md for id/line/hash safeguards. No default prompt export, clipboard or model call. Structural validation does not prove browser appearance. / 扫描、带 hash 单块写回和复检由 AI 内部完成；不默认导出提示词或调用模型，未看浏览器不声称视觉验收。

## 图标窄栏 + 共用右栏的纵向条目

适用：多个独立主题各有标题和一到多段解释，图标帮助扫读，细线区分同级单元；不是流程，不添加箭头，也不默认卡片化。参考图要求标题/正文共用左边界时，关键是层级，不是凑齐图标、文字与线。

结构：`stack → (row → icon + group → 标题text + 正文text…) → divider → 下一row`。
图标直接在 row 中固定大小，group 独占其余宽度；标题与全部正文放同一个 group。不要把正文放到 row 外，也不要把标题和正文分到不同的右栏。

最小语法示意（实施时使用原文；占位文字不是正文素材）：
```garden compose
<intent>语法示意：固定图标列，共用右侧文字列。</intent>
<figure frame="none">
<stack gap={3}>
<row wrap="nowrap" gap={3}>
<icon name="book-open" size="xl"/>
<group gap={3}>
<text>**原文标题甲**</text>
<text>原文第一段。</text>
<text>原文第二段。</text>
</group>
</row>
<divider/>
<row wrap="nowrap" gap={3}>
<icon name="message-circle" size="xl"/>
<group gap={3}>
<text>**原文标题乙**</text>
<text>原文正文。</text>
</group>
</row>
</stack>
</figure>
```

标题用 text + 加粗保证与正文同字号；需要不同标题层级才改用 title 并核对实际字号。图标选真实目录中的合适名字，不要求作者指定。divider 是外层 stack 的子项，不是 list 的直接子项。编辑性段落默认采用外层 figure frame="none" 融入文章；作者明确要独立场景边界时保留。不要误用内部 box 的 border。

上下文、默认值、prose 与 group 的差别及窄屏规则读取 rendering-model.md。检查后的视觉验收：图标列对齐；标题及所有正文段落共用右侧左边界；标题不居中；段落不回到图标列；每两个单元仅一条细线；没有卡片背景、箭头或窄屏横向溢出。

### Icon-led editorial list: operational summary
Use this for independent explanations, not a workflow. Derive the alignment hierarchy before selecting leaves: an outer `stack` repeats `row wrap="nowrap"` with a fixed-size direct `icon` and one flexible `group`. Put the bold heading and **every** original paragraph into separate `text` children of that same group. Place `divider` between rows in the outer stack. Do not place the body outside the row, center the ancestor, use a direct list divider, or substitute a nested stack without checking its contextual padding. The tested syntax above is illustrative; substitute real source text and catalog icons. For editorial prose prefer an outer frameless figure unless a scene boundary was requested; an explicit outer scene `figure frame="none"` removes only the scene frame. Verify shared heading/body left edges, fixed icon alignment, retained paragraphs, separators and no narrow-screen overflow under the complete article theme.


## flow-row / flow-stack · 短阶段与长阶段
只有原文明确顺序才用箭头。短阶段用row中的text与right箭头；正文基线、不加粗、不为塞入横排设size。作者明确“略小”时仅在文字叶子设sm，勿父子重复缩放。长阶段默认stack与down箭头。手机不能只是让right箭头随row纵向换行：方向必须与实际流向一致。当前没有经此技能验证的自动双向响应配方；发布推荐前须浏览器验证或明确选择全尺寸纵向保真回退，不发明响应式属性。作者硬性要求横排且手机容纳不下才说明取舍。

## centered-chip · 整体居中、图标贴标题（候选，待浏览器验证）
关系是“图标＋标题”为一个内容宽整体，正文另占一行；不是图标与一个flex:1标题平分整格。
候选沿用真实文章的结构：`stack align="center" → card frame="text" padding={0} → row align="center" gap={0} wrap="nowrap" → icon inline + text`；正文作为外stack的下一text。frame=text标题壳不是信息卡片。不得把此候选称作跨主题已验证；检查标题壳实际宽度、图文距离、图标与标题行盒、整体中心、长标题、窄屏溢出。icon inline当前另带6px右距，gap=0不等于零距离；row>text仍有flex规则。若失败，记录引擎缺口，不用换字号掩盖。

## prose-list · 正文列表手感
不需要场景时保留普通Markdown。需要嵌入icon-rail时，把真实Markdown无序/有序列表放右侧group内的markdown岛，保留全部子项和层级。title/text是行内内容，不能用“•”拼出列表。结构上核对ul/li；完整主题另验悬挂缩进、段距和换行，不由AST宣称观感相同。

## frameless-scene · 正交的框选项
编辑性说明默认外`figure frame="none"`，内card是否有border、background分别决定；独立实验或明确要求场景边界时保留外框。详见frames.md。默认不加size/tone来补救布局，不删事实、不裁正文。

## 内部验收卡（不是作者表单）
选定路线后在工作笔记记：读者问题、源条目/段落数、共享容器与悬挂、居中对象、相对正文的字号、三层框选择、桌面/窄屏回退、禁止项。唯一推荐不等于凭经验宣称已验证：centered-chip与响应式flow尚须实际浏览器证据；已有icon-rail/equal-cards也须在本次上下文核对。
