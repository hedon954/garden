# Horizontal equal-width cards · 横向等宽卡片

Read only for an equal-card request. / 仅在需要等宽卡片时读取。

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
