# 在一个 Compose 场景内组合文章内容

作者只使用 `garden compose`。作者可以只写原话；AI 在场景内部选择内容与布局，不让作者选择不同围栏。发布前必须把原话编译为可解析的场景。

## 执行顺序

1. 识别原文中的并列、先后、包含、共享起点与交互关系，不先收集零散图标、标题和线条。
2. 把关系写成层级：同一条目的标题和全部段落属于同一个文本容器；图标属于固定左列；分隔线在相邻行之间，不放进文字列。
3. 选择布局与比例，先保证换行和窄屏可读，再做间距、颜色和强调。不删事实、不补数字、不把正文缩小来挤进框。
4. 用真实 CLI 检查、真实文章主题渲染，再检查几何与交互。解析通过不等于视觉正确；手写场景通过不证明 AI 能稳定生成。

## 内容和样式

- 普通文章段落、标准列表和图片足够时不必额外包场景。保留作者的文字、链接、资源和 Mermaid。
- `<markdown>…</markdown>` 与 `<html>…</html>` 是静态文章内容岛：支持 Markdown 块、强调、代码、链接、删除线和安全 HTML（如 `<u>`、details、表格）。它们不执行状态插值。
- HTML 使用实际允许的标签/属性和局部 CSS；脚本、事件、脚本 URL 和不支持的样式会报错。不要把内容岛当成任意浏览器应用。
- 需要执行 JavaScript 的独立画布用 `<sandbox html={"…"} css={"…"} js={"…"}/>`，脚本在隔离 iframe 中运行，不能加载远程资源，不与正文共享 DOM。
- 默认正文的字体与字号继承实际文章配置；不是固定像素值。`text/title` 的 `size="sm|lg|xl"` 是有意的相对强调，不用于缩字塞框。图表标签、指标值、标题、说明和控件各有语义层级。
- 默认保留场景外框；静态场景的唯一最外层可写 `<figure frame="none">…</figure>`，Play 块头可写 `frame: none`。不影响内部明确的卡片。

## 原生语义组件

在同一 Compose 内用 resource/resources、metric、timeline/event、relations/entity/edge、choices/choice-option、icon-list/entry、file/files、plot/datum、compare/item 表达对应内容。来源用 `reference href` 子项；文件保留真实构建解析与预览，禁止手写内部 resolved。目录由代码生成，未列出的属性不能猜。

## 参数与状态

可调场景用块头 `caption`、`intent`、可选 `id/expect/frame`，然后 `---`，下面写 DIL：

````md
```garden compose
caption: 参数变化会更新正文计算结果。
intent: 保留作者的原话。
---
{@body const [n, setN] = DIL.useState(2)}
{@body const doubled = n * 2}
<slider label="数量" min={1} max={8} value={n} onChange={setN}/>
结果：{doubled}
```
````

条件和重复使用 `{#if …}…{/if}`、`{#each rows as row, index}…{/each}`。静态语义子树可与控件并列，其自身状态不应因外层参数变化而被重置。不要把连续的正文硬拆成步骤或添加没有阅读价值的交互。
