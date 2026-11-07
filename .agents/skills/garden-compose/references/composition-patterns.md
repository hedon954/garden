# Composition grammar · 灵活组合基础组件

Read after selecting a relation; examples are syntax probes, not replacement source material. / 选好关系后读取；示例只演示语法，实施时必须换成真实原文，不借示例添加事实。

## Build from small parts · 从基本单元组合
1. **Scene/container**: `stack` for vertical groups, `row` for short horizontal arrangements, `grid` for equal repeated units. Nest containers to represent a real hierarchy or combine local relations. Layout is not itself causation.
2. **Semantic unit**: `card`/`box` groups one source unit; `title`, `text`, `caption`, `badge` provide source-derived leaves. Keep the same internal structure for repeated units. Extract existing labels as titles, keep remaining source wording; do not generate paraphrased summaries by default.
3. **Connector**: add an arrow only for a source-backed directional relation; `fan` and `join` only for actual branching/meeting. Connector geometry is schematic, not automatic graph routing. State the relation in text when direction alone could be ambiguous.
4. **Local emphasis/detail**: captions, notes, callouts and optional accents support a unit without creating new entities or causal edges. Avoid competing colors/icons and decoration that implies missing semantics.
5. **Composition**: combine these operations at different scales: vertical stages containing parallel cards; a parent containing grouped fields; a comparison followed by a shared caveat; a sequence followed by a genuine branch. Do not force every relation into cards or every card into `compare`.
6. **Static/Play split**: a static scene can contain static nested layouts. Play supports a restricted lowercase component subset and expression/state language; it is not a container for arbitrary static `fan`/`lanes` trees. Separate explanatory scenes from parameter experiments when that preserves meaning.

先把内容拆成“容器排列 + 内容单元 + 有依据的连接 + 解释性叶子”；再递归组合。每个子结构回答一个局部问题。长文过密时拆场景，不靠缩字、删事实、固定高度或小字号塞进图里。

## Verified small static forms · 最小组合片段
Examples below are schematic and conditional on the named relationship actually appearing in the source. For full source-preserving card mapping, see layout-recipes.md.

### Parallel categories / 并列卡片

```garden compose
<intent>Syntax-only example: Parallel categories.</intent>
<grid cols={3} gap={3}>
<card><title>类别甲</title><text>类别甲的原文说明。</text></card>
<card><title>类别乙</title><text>类别乙的原文说明。</text></card>
<card><title>类别丙</title><text>类别丙的原文说明。</text></card>
</grid>
```

### Explicit vertical authentication chain / 明确的纵向认证顺序

```garden compose
<intent>Syntax-only example: Explicit vertical authentication chain.</intent>
<stack gap={3}>
<card><title>接收凭证</title></card>
<arrow dir="down"/>
<card><title>验证凭证</title></card>
<arrow dir="down"/>
<card><title>返回认证结果</title></card>
</stack>
```

### Layers + repeated local categories / 层级中组合并列项

```garden compose
<intent>Syntax-only example: Layers + repeated local categories.</intent>
<stack gap={3}>
<card><title>入口层</title><text>接收请求</text></card>
<card><title>处理层</title><grid cols={2}><card><title>校验</title></card><card><title>存储</title></card></grid></card>
</stack>
```

### Small explicit branch / 小型分支

```garden compose
<intent>Syntax-only example: Small explicit branch.</intent>
<stack><card><title>请求分类</title></card><fan n="2"/><grid cols={2}><card><title>读取请求</title></card><card><title>写入请求</title></card></grid></stack>
```

### Explicit convergence / 小型汇总

```garden compose
<intent>Syntax-only example: Explicit convergence.</intent>
<stack><grid cols={2}><card><title>来源甲</title></card><card><title>来源乙</title></card></grid><join>汇入同一结果</join><card><title>汇总结果</title></card></stack>
```

### Ordered stages and details / 分步与注释

```garden compose
<intent>Syntax-only example: Ordered stages and details.</intent>
<steps><step id="prepare"><title>准备</title><text>确认输入</text><note>核对来源</note></step><step id="verify"><title>检查</title><text>检查结果</text></step></steps>
```

### Compare only genuine alternatives / 实际对照

```garden compose
<intent>Syntax-only example: Compare only genuine alternatives.</intent>
<compare><item><title>方案甲</title><text>每月 10 元</text></item><item><title>方案乙</title><text>每月 20 元</text></item></compare>
```

### Message sequence / 消息时序

```garden compose
<intent>Syntax-only example: Message sequence.</intent>
<lanes><actor>客户端</actor><actor>认证服务</actor><message from="1" to="2">提交凭证</message><message from="2" to="1">返回结果</message></lanes>
```

### Unscaled event timeline / 非比例时间节点

```garden compose
<intent>Syntax-only example: Unscaled event timeline.</intent>
<stack><row><badge>周一</badge><text>收集资料</text></row><row><badge>周二</badge><text>整理资料</text></row></stack>
```

### Exact cells with adjacent emphasis / 表格与提示

```garden compose
<intent>Syntax-only example: Exact cells with adjacent emphasis.</intent>
<stack><table><thead><tr><th>方案</th><th>费用</th></tr></thead><tbody><tr><td>甲</td><td>10 元</td></tr></tbody></table><callout tone="note">费用来自原始资料。</callout></stack>
```

### Independent explanation panels / 分组面板

```garden compose
<intent>Syntax-only example: Independent explanation panels.</intent>
<tabs><tab title="概念"><text>概念说明</text></tab><tab title="边界"><text>适用边界</text></tab></tabs>
```

## Play parameter experiment · 参数实验

Use only with source-backed formula and input bounds. This example assumes the source explicitly gives price 24 USD per seat and 1–12 seats; replace those assumptions with actual source facts. / 原文必须给出公式与边界，不能从示例推导作者数据。

```garden compose
caption: 调整席位查看月费。
intent: |
  示例假设：每席 24 USD，可选 1 到 12 席。
---
{@body const [seats, setSeats] = DIL.useState(3)}
{@body const total = seats * 24}
<slider min={1} max={12} value={seats} onChange={setSeats} label="席位" />
<stat label="月费" value={total} unit="USD" />
```

## Verify the composition · 校验组合
Preserve the verbatim source/request in intent when creating a target. Scan existing fences, record id/line/base hash, produce a complete candidate, apply with the original hash, then check. Ensure every source unit survives and every relationship is justified. A parser pass does not demonstrate visual balance, responsiveness or interaction; browser evidence is separate. No default full prompt export, clipboard, model call, publish or unrelated-post changes.
