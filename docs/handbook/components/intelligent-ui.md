---
title: 智能 UI
navTitle: 智能 UI
description: 全面讲解 garden compose 智能 UI 的双模渲染基本原理、自然语言与标签使用方式、全部 21 种常用图示真实渲染导航与在线实时演练场。
section: components
order: 35
---

## 是什么

智能 UI（`garden compose`）是 Garden 中**唯一的结构化内容与交互组件入口**。在同一个 ```` ```garden compose ```` 围栏内，作者既可以用自然语言让 AI 编译出**静态结构说明图**（多列关联、分层、对比、分步披露、时间线、关系图、图文列表、选择卡），也可以组合 `{@body}` 状态声明与滑杆、分段选择器、步进器、图表、二维网格或隔离 `<sandbox>` 画布，构建**读者可亲手调节的动态交互微件**。

## 有什么用

- **打破静态图文的信息密度天花板**：对于「公式参数一变曲线怎么走」「状态机走到第几步哪几个变量变了」「多角色消息时序怎么往返」这类动态或空间结构问题，一张可点、可拖的智能 UI 胜过五百字绕口令。
- **单一入口，零语法记忆焦虑**：作者不用区分十几种不同组件名，只需记住 `garden compose` 一个入口；在 Typora 或 VS Code / Cursor 里敲 `/garden` 即可点选 21 种常用图示草稿。

---

## 一、基本原理

`garden compose` 在引擎内部自动分为**静态说明树（Diagram 模式）**与**响应式交互运行时（Play 模式）**两条编译链路，同时共享同一套主题令牌与移动端自适应规则：

1. **静态说明树（无 `{@body}` 状态时）**：
   - 围栏内的 `<row>`、`<stack>`、`<grid>`、`<band>`、`<box>`、`<compare>`、`<steps>`、`<lanes>`、`<tabs>`、`<timeline>`、`<relations>`、`<icon-list>`、`<choices>`、`<plot>` 以及 `<markdown>` / `<html>` 内容岛，在构建期直接归一化为干净的语义 HTML；
   - 最外层默认采用透明底色贴合文章暖白纸面（传入 `<figure frame="none">` 可完全隐去外框线），禁用浏览器 JavaScript 依然完整可读。
2. **Play 响应式运行时（含 `{@body}` 或交互控件时）**：
   - 使用与 ChatGPT Intelligent UI（DIL）同款的声明式语法：`{@body const [x, setX] = DIL.useState(初始值)}` 声明状态，`{@body const y = ...}` 声明派生计算，`{expr}` 完成属性与正文插值，`{#if}...{:else}...{/if}` 与 `{#each items as item, i}...{/each}` 控制分支与循环；
   - 所有表达式运行在**白名单 AST 求值器**中（支持 `round`、`ceil`、`floor`、`min`、`max`、`fixed`、`thousands`、`bytes` 等纯函数，绝不调用危险的 `eval`），构建期同时预生成默认状态下的静态回退快照。
3. **隔离离线画布（`<sandbox>`）**：
   - 当标准原语无法表达特殊二维物理动画或自定义 SVG 连线时，在同一 `garden compose` 内使用 `<sandbox html={...} css={...} js={...} />`，运行于无同源权限、禁外网请求的隔离 `<iframe>` 中。

---

## 二、使用方式（逐形态写法与双端真实渲染）

### 形态 1：静态层次、关系环与选择问答卡

你可以直接写自然语言交由 `garden-compose` 技能编译，也可以直接使用语义标签组合（如 `<relations>` 表达环形或中心辐射耦合，`<choices>` 让读者做情境自测并给出即时反馈）：

````markdown
```garden compose
<figure frame="none">
  <relations caption="点击任意节点，高亮查看它在研发闭环中的上下游连接关系。">
    <entity title="真实需求"><text>从线上痛点提取最小闭环</text></entity>
    <entity title="方案收敛"><text>明确边界与不做的事</text></entity>
    <entity title="实现预检"><text>通过静态检查与回归门禁</text></entity>
    <entity title="灰度观测"><text>收集指标反哺下一轮需求</text></entity>
    <edge from={1} to={2} label="约束范围" />
    <edge from={2} to={3} label="编码落地" />
    <edge from={3} to={4} label="上线验证" />
    <edge from={4} to={1} style="dashed" label="反馈修正" />
  </relations>
</figure>
```

```garden compose
<figure frame="none">
  <choices title="你的图表该选静态还是交互？" caption="点击任一选项查看选型建议。">
    <choice-option icon="layers" value="静态说明图" label="展示固定架构层次或职责分工" reply="推荐使用静态模式（如分层图、关联图、时序泳道）：首屏一眼看全，零操作成本。">
      <text>读者不需要改数字，重点是一眼看清模块关系</text>
    </choice-option>
    <choice-option icon="chart" value="Play 交互模式" label="结论随输入规模或权重动态变化" reply="推荐使用 Play 模式（滑杆 + 指标/图表）：默认态先给出典型结论，拖动滑杆验证边界条件。">
      <text>有两个以上可调变量，固定举例无法覆盖读者场景</text>
    </choice-option>
    <choice-option none label="只是一段普通先后步骤" reply="普通有序列表或三行 Mermaid 就够了，不必强行上组件。" />
  </choices>
</figure>
```
````

<div data-doc-showcase="静态关系环与情境选择卡真实渲染（直接点击节点或卡片体验交互）">

```garden compose
<figure frame="none">
  <relations caption="点击任意节点，高亮查看它在研发闭环中的上下游连接关系。">
    <entity title="真实需求"><text>从线上痛点提取最小闭环</text></entity>
    <entity title="方案收敛"><text>明确边界与不做的事</text></entity>
    <entity title="实现预检"><text>通过静态检查与回归门禁</text></entity>
    <entity title="灰度观测"><text>收集指标反哺下一轮需求</text></entity>
    <edge from={1} to={2} label="约束范围" />
    <edge from={2} to={3} label="编码落地" />
    <edge from={3} to={4} label="上线验证" />
    <edge from={4} to={1} style="dashed" label="反馈修正" />
  </relations>
</figure>
```

```garden compose
<figure frame="none">
  <choices title="你的图表该选静态还是交互？" caption="点击任一选项查看选型建议。">
    <choice-option icon="layers" value="静态说明图" label="展示固定架构层次或职责分工" reply="推荐使用静态模式（如分层图、关联图、时序泳道）：首屏一眼看全，零操作成本。">
      <text>读者不需要改数字，重点是一眼看清模块关系</text>
    </choice-option>
    <choice-option icon="chart" value="Play 交互模式" label="结论随输入规模或权重动态变化" reply="推荐使用 Play 模式（滑杆 + 指标/图表）：默认态先给出典型结论，拖动滑杆验证边界条件。">
      <text>有两个以上可调变量，固定举例无法覆盖读者场景</text>
    </choice-option>
    <choice-option none label="只是一段普通先后步骤" reply="普通有序列表或三行 Mermaid 就够了，不必强行上组件。" />
  </choices>
</figure>
```

</div>

---

### 形态 2：Play 响应式参数调节与分类图表

在头部 YAML（`caption`、`frame`、`intent`）与 `---` 分隔线之后，使用 `{@body}` 声明响应式变量并绑定到 `<choice>`、`<slider>`、`<chart>` 与 `<stat>`：

````markdown
```garden compose #doc-fusion-demo
caption: 拖动个性化权重或点击快捷档位，观察五个时段融合推荐概率与峰值时段变化。
frame: none
---
{@body const [w, setW] = DIL.useState(45)}
{@body const a = w / 100}
{@body const p08 = a * 0.06 + (1 - a) * 0.14}
{@body const p12 = a * 0.14 + (1 - a) * 0.24}
{@body const p18 = a * 0.18 + (1 - a) * 0.25}
{@body const p20 = a * 0.44 + (1 - a) * 0.25}
{@body const p22 = a * 0.18 + (1 - a) * 0.12}
{@body const rows = [{ h: "08:00", p: p08 }, { h: "12:00", p: p12 }, { h: "18:00", p: p18 }, { h: "20:00", p: p20 }, { h: "22:00", p: p22 }]}
{@body const peak = max(p08, p12, p18, p20, p22)}
{@body const best = p20 == peak ? "20:00" : (p18 == peak ? "18:00" : (p12 == peak ? "12:00" : "08:00"))}

<choice value={w} onChange={setW} label="权重快捷档位" options={[{ value: 0, label: "0% 全局基线" }, { value: 45, label: "45% 均衡融合" }, { value: 100, label: "100% 个人偏好" }]} />
<slider min={0} max={100} value={w} onChange={setW} label="个人历史活跃权重" unit="%" />
<chart legend="show" legendPosition="bottom" data={rows} x={h} palette="categorical" yLabel="融合活跃概率" yFormat="percent" yMin={0} yMax={0.48} overflow="expand" height={240}>
  <bar y={p} label="融合后推送命中概率" tone="accent" />
</chart>
<stat label="当前最优触达时段" value={best} />
```
````

<div data-doc-showcase="Play 响应式参数与图表真实渲染">

```garden compose #doc-fusion-demo-live
caption: 拖动个性化权重或点击快捷档位，观察五个时段融合推荐概率与峰值时段变化。
frame: none
---
{@body const [w, setW] = DIL.useState(45)}
{@body const a = w / 100}
{@body const p08 = a * 0.06 + (1 - a) * 0.14}
{@body const p12 = a * 0.14 + (1 - a) * 0.24}
{@body const p18 = a * 0.18 + (1 - a) * 0.25}
{@body const p20 = a * 0.44 + (1 - a) * 0.25}
{@body const p22 = a * 0.18 + (1 - a) * 0.12}
{@body const rows = [{ h: "08:00", p: p08 }, { h: "12:00", p: p12 }, { h: "18:00", p: p18 }, { h: "20:00", p: p20 }, { h: "22:00", p: p22 }]}
{@body const peak = max(p08, p12, p18, p20, p22)}
{@body const best = p20 == peak ? "20:00" : (p18 == peak ? "18:00" : (p12 == peak ? "12:00" : "08:00"))}

<choice value={w} onChange={setW} label="权重快捷档位" options={[{ value: 0, label: "0% 全局基线" }, { value: 45, label: "45% 均衡融合" }, { value: 100, label: "100% 个人偏好" }]} />
<slider min={0} max={100} value={w} onChange={setW} label="个人历史活跃权重" unit="%" />
<chart legend="show" legendPosition="bottom" data={rows} x={h} palette="categorical" yLabel="融合活跃概率" yFormat="percent" yMin={0} yMax={0.48} overflow="expand" height={240}>
  <bar y={p} label="融合后推送命中概率" tone="accent" />
</chart>
<stat label="当前最优触达时段" value={best} />
```

</div>

---

### 形态 3：分步状态网格与离线 `<sandbox>` 画布

用 `<steps bind="step">` 搭配 `<grid>` 可以逐帧高亮缓存/加密块状态变化；遇到完全自定义的图形演示则可使用 `<sandbox>`：

````markdown
```garden compose #doc-sandbox-wave
caption: 隔离离线 Sandbox 画布示例：点击按钮切换采样点密度，观察正弦波形逼近。
---
<sandbox
  title="正弦波离散采样画布"
  html={"<div class=\"wrap\"><div class=\"bar\"><span>离散采样阶数：</span><button id=\"b8\" class=\"on\">8 点</button><button id=\"b24\">24 点</button><button id=\"b64\">64 点</button></div><svg id=\"svg\" viewBox=\"0 0 560 92\"></svg></div>"}
  css={".wrap{font:13px/1.4 system-ui,sans-serif;color:var(--viz-ink,#1b1a18);padding:6px 4px}.bar{display:flex;align-items:center;gap:6px;margin-bottom:8px}button{border:1px solid rgba(127,127,127,.35);background:transparent;color:inherit;border-radius:6px;padding:3px 10px;cursor:pointer;font-size:12px}button.on{background:var(--viz-ink,#1b1a18);color:var(--viz-bg,#faf9f5)}svg{width:100%;height:92px;display:block}"}
  js={"const svg=document.getElementById('svg');function draw(n){let d='';let dots='';for(let i=0;i<=n;i++){const x=16+(528*i)/n;const y=46-Math.sin((i/n)*Math.PI*2)*34;d+=(i===0?'M':'L')+x.toFixed(1)+' '+y.toFixed(1);dots+='<circle cx=\"'+x.toFixed(1)+'\" cy=\"'+y.toFixed(1)+'\" r=\"2.6\" fill=\"currentColor\"/>';}svg.innerHTML='<line x1=\"16\" y1=\"46\" x2=\"544\" y2=\"46\" stroke=\"rgba(127,127,127,.3)\" stroke-dasharray=\"4 4\"/><path d=\"'+d+'\" fill=\"none\" stroke=\"#0285ff\" stroke-width=\"2\"/>'+dots;}[8,24,64].forEach(n=>{const btn=document.getElementById('b'+n);btn.onclick=()=>{document.querySelectorAll('button').forEach(b=>b.classList.remove('on'));btn.classList.add('on');draw(n);};});draw(8);"}
/>
```
````

<div data-doc-showcase="隔离离线 Sandbox 画布真实渲染">

```garden compose #doc-sandbox-wave-live
caption: 隔离离线 Sandbox 画布示例：点击按钮切换采样点密度，观察正弦波形逼近。
---
<sandbox
  title="正弦波离散采样画布"
  html={"<div class=\"wrap\"><div class=\"bar\"><span>离散采样阶数：</span><button id=\"b8\" class=\"on\">8 点</button><button id=\"b24\">24 点</button><button id=\"b64\">64 点</button></div><svg id=\"svg\" viewBox=\"0 0 560 92\"></svg></div>"}
  css={".wrap{font:13px/1.4 system-ui,sans-serif;color:var(--viz-ink,#1b1a18);padding:6px 4px}.bar{display:flex;align-items:center;gap:6px;margin-bottom:8px}button{border:1px solid rgba(127,127,127,.35);background:transparent;color:inherit;border-radius:6px;padding:3px 10px;cursor:pointer;font-size:12px}button.on{background:var(--viz-ink,#1b1a18);color:var(--viz-bg,#faf9f5)}svg{width:100%;height:92px;display:block}"}
  js={"const svg=document.getElementById('svg');function draw(n){let d='';let dots='';for(let i=0;i<=n;i++){const x=16+(528*i)/n;const y=46-Math.sin((i/n)*Math.PI*2)*34;d+=(i===0?'M':'L')+x.toFixed(1)+' '+y.toFixed(1);dots+='<circle cx=\"'+x.toFixed(1)+'\" cy=\"'+y.toFixed(1)+'\" r=\"2.6\" fill=\"currentColor\"/>';}svg.innerHTML='<line x1=\"16\" y1=\"46\" x2=\"544\" y2=\"46\" stroke=\"rgba(127,127,127,.3)\" stroke-dasharray=\"4 4\"/><path d=\"'+d+'\" fill=\"none\" stroke=\"#0285ff\" stroke-width=\"2\"/>'+dots;}[8,24,64].forEach(n=>{const btn=document.getElementById('b'+n);btn.onclick=()=>{document.querySelectorAll('button').forEach(b=>b.classList.remove('on'));btn.classList.add('on');draw(n);};});draw(8);"}
/>
```

</div>

---

## 三、常用图示（内置 21 种配方全集与真实渲染入口）

在 Typora 或 VS Code / Cursor 中输入 `/garden` 时，弹出的推荐列表共有 **21 项**（20 种高频语义图示 + 1 项「其他」自由图文混合）。**每一页均包含提示词草稿、编译后源码、Web/移动端双形态真实渲染与在线演练场**（也可查看汇总目录页 **[推荐图示全览](/garden/components/diagrams/)**）：

| 分类 | 图示名称与真实渲染详页 | 一句话适用场景 |
| :--- | :--- | :--- |
| **空间结构与层次** | **[关联图](/garden/components/diagrams/columns-join/)** | 两边概念如何通过中间枢纽层解耦关联起来 |
| **空间结构与层次** | **[发散图](/garden/components/diagrams/fan-out/)** | 请求先到达统一入口，再同时扇出分发到多处下游 |
| **空间结构与层次** | **[分层图](/garden/components/diagrams/layers/)** | 自上而下的系统架构分层，突出核心关注层 |
| **空间结构与层次** | **[并列图](/garden/components/diagrams/facets/)** | 同一件事的多个正交切面，彼此没有先后顺序 |
| **空间结构与层次** | **[上下对照图](/garden/components/diagrams/two-row/)** | 上方常规背景流程与下方重点新流程分行对照 |
| **列表、顺序与对比** | **[图文列表](/garden/components/diagrams/icon-rail/)** | 带语义图标、标题和分段说明的独立要点列表 |
| **列表、顺序与对比** | **[流程图](/garden/components/diagrams/sequence/)** | 严格按先后顺序执行的单向阶段推进 |
| **列表、顺序与对比** | **[分步图](/garden/components/diagrams/steps/)** | 可点击展开每一步底层细节的交互步骤卡片 |
| **列表、顺序与对比** | **[对比图](/garden/components/diagrams/compare/)** | 两到三种方案在同一约束下的优劣或正误对照 |
| **时间、消息与分组** | **[时间线图](/garden/components/diagrams/timeline/)** | 按日期或演进阶段纵向排列关键里程碑事件 |
| **时间、消息与分组** | **[时序图](/garden/components/diagrams/lanes/)** | 多角色泳道之间的请求与响应往返消息顺序 |
| **时间、消息与分组** | **[选项卡](/garden/components/diagrams/tabs/)** | 几组互相独立的配置或平台说明，每次聚焦看一组 |
| **数据与参数交互** | **[数据图](/garden/components/diagrams/chart/)** | 将确定数值绘制成柱状、折线或环形占比图 |
| **数据与参数交互** | **[参数调节图](/garden/components/diagrams/tunable/)** | 拖动一两个输入滑杆，实时观察指标与图表变化 |
| **数据与参数交互** | **[换算图](/garden/components/diagrams/converter/)** | 调节单一规模输入，同步换算出一整张资源配比表 |
| **代码、状态与清单** | **[代码走查](/garden/components/diagrams/code-walkthrough/)** | 逐行步进高亮代码当前执行位置与此刻变量表 |
| **代码、状态与清单** | **[逐步演示](/garden/components/diagrams/stepper/)** | 停在任意一步观察系统缓存或队列状态如何演变 |
| **代码、状态与清单** | **[路径标注图](/garden/components/diagrams/trace/)** | 沿着状态机或握手流程逐步标出各方当前所处状态 |
| **代码、状态与清单** | **[步骤清单](/garden/components/diagrams/plan/)** | 供读者边操作边打勾核对进度的可执行检查表 |
| **代码、状态与清单** | **[格子图](/garden/components/diagrams/inspect-grid/)** | 在二维数组、数据块或频控窗口中标出特殊格子及原因 |
| **自由组合** | **[其他](/garden/components/diagrams/other/)** | 现成模板无法覆盖时，自由混排 Markdown、HTML 与布局原语 |

---

## 在线演练场：亲手修改静态布局与 Play 交互代码

在上方切换静态关联布局、Play 参数试算或步进二维格子，改节点文案、色调（accent / tip / muted）或 `{@body}` 里的计算公式，再点「更新渲染」。Web 端是 740px 阅读列，移动端是 375px 手机视口：

```doc-playground
{
  "title": "智能 UI (garden compose) 实时演练场",
  "description": "自由修改静态结构标签或 Play 模式的 {@body} 状态公式，点击「更新渲染」并切换 Web 端 / 移动端测试真实交互。",
  "presets": [
    {
      "id": "play-calc",
      "label": "Play 参数交互",
      "code": "```garden compose #pg-lock-compare\ncaption: 拖动并发读者数量，对比互斥锁 (Mutex) 与读写锁 (RwLock) 的总耗时。\n---\n{@body const [readers, setReaders] = DIL.useState(4)}\n{@body const mutexMs = (readers + 1) * 10}\n{@body const rwMs = 20}\n\n<slider bind=\"readers\" label=\"同时到达的读请求\" min={1} max={10} unit=\"个\" />\n<columns>\n  <card title=\"Mutex（串行排队）\">读写逐个执行，总耗时 **{mutexMs} ms**。</card>\n  <card title=\"RwLock（读并发）\" tone=\"accent\">{readers} 个读者并行读取后再写，总耗时恒为 **{rwMs} ms**。</card>\n</columns>\n```"
    },
    {
      "id": "static-arch",
      "label": "静态架构关联图",
      "code": "```garden compose\n<row align=\"center\">\n  <stack align=\"center\">\n    <title>写入端</title>\n    <text>Markdown 稿件</text>\n    <text>同名目录资源</text>\n  </stack>\n  <band tone=\"accent\" align=\"center\">\n    <title>garden sync</title>\n    <text>语法预检与资源内联</text>\n  </band>\n  <stack align=\"center\">\n    <title>静态产物</title>\n    <text>HTML + 双层搜索索引</text>\n    <text>RSS + Sitemap</text>\n  </stack>\n</row>\n<join>构建期一次性静态编译，线上零数据库依赖</join>\n```"
    },
    {
      "id": "step-grid",
      "label": "步进状态格子",
      "code": "```garden compose #pg-ecb-cbc\ncaption: 切换加密分组模式，观察相同明文块 A 是否产生重复密文块。\n---\n{@body const [mode, setMode] = DIL.useState(\"ecb\")}\n\n<choice bind=\"mode\" label=\"分组模式\" options={[{ value: \"ecb\", label: \"ECB 电码本\" }, { value: \"cbc\", label: \"CBC 密码分组链接\" }]} />\n<grid cols={[\"块 1\", \"块 2\", \"块 3\", \"块 4\"]} legend={{ same: \"密文块重复（泄露纹理特征）\" }}>\n  <row label=\"明文输入\" cells={[\"A\", \"B\", \"A\", \"A\"]} />\n  <row label=\"密文输出\" cells={mode == \"ecb\" ? [\"X9\", \"K2\", \"X9\", \"X9\"] : [\"P4\", \"Q8\", \"R1\", \"S7\"]}\n       tones={mode == \"ecb\" ? [\"same\", \"plain\", \"same\", \"same\"] : \"plain\"} />\n</grid>\n```"
    }
  ]
}
```
