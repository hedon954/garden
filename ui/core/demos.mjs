/** Complete valid Compose bodies for the public component gallery. */
export const DEMOS = {
  State: {
    caption: "State 声明可调的量，Slider 绑上去就能拧。",
    body: `{@body const [batch, setBatch] = DIL.useState(1)}

<slider bind="batch" label="batch" min={1} max={32} />
现在 batch 是 **{batch}**。`,
  },
  Let: {
    caption: "Let 从状态算出派生值，状态一变就跟着重算。",
    body: `{@body const [seq, setSeq] = DIL.useState(4096)}
{@body const mem = 2 * 32 * 8 * 128 * seq * 2}


<slider bind="seq" label="序列长度" min={1024} max={32768} scale="log" format="thousands" />
序列 {thousands(seq)} 时，KV cache 要 **{bytes(mem)}**。`,
  },
  If: {
    caption: "If 只在条件为真时显示里面的内容。",
    body: `{@body const [batch, setBatch] = DIL.useState(4)}

<slider bind="batch" label="batch" min={1} max={32} />
{#if batch > 16}
batch 超过 16，单卡显存会很紧张。
{/if}`,
  },
  Each: {
    caption: "Each 对数组的每一项重复渲染。",
    body: `{@body const [n, setN] = DIL.useState(3)}

<slider bind="n" label="项数" min={1} max={6} />
<table columns={["序号", "平方"]}>
  {#each range(1, n + 1) as i}
    <row cells={[i, i * i]} />
  {/each}
</table>`,
  },
  Stack: {
    caption: "Stack 用来调整一组内容的间距。",
    body: `
<stack gap={1}>
<badge tone="new">新算</badge> 这一步只算新 token。

<badge tone="cached">读缓存</badge> 过去的 K/V 直接读。
</stack>`,
  },
  Columns: {
    caption: "Columns 并排放内容，窄屏自动叠放。",
    body: `
<columns>
  <card title="Mutex">同一时刻只有一个持有者。</card>
  <card title="RwLock" tone="accent">多个读者可以同时持有。</card>
</columns>`,
  },
  Card: {
    caption: "Card 是带边框的分组。",
    body: `
<card title="RwLock" tone="accent">读多写少时，读者可以并行。</card>`,
  },
  Tabs: {
    caption: "Tabs 让几个视角轮流看。",
    body: `
<tabs>
  <tab title="MHA">每个查询头都有自己的一组 K/V。</tab>
  <tab title="GQA">几个查询头共用一组 K/V，缓存小好几倍。</tab>
</tabs>`,
  },
  Steps: {
    caption: "Steps 一步一步看，带上一步、下一步和进度。",
    body: `
<steps>
  <step title="Prefill">一次算完全部 prompt 的 K/V。</step>
  <step title="Decode 1">新 token 只算自己的 K/V，追加一行。</step>
  <step title="Decode 2">再追加一行，其余读缓存。</step>
</steps>`,
  },
  Slider: {
    caption: "Slider 拖动改一个数，对数刻度端点是 2 的幂时只停在 2 的幂上。",
    body: `{@body const [seq, setSeq] = DIL.useState(4096)}

<slider bind="seq" label="序列长度" min={1024} max={32768} scale="log" format="thousands" />
当前：{thousands(seq)}。`,
  },
  Choice: {
    caption: "Choice 从几个选项里选一个。",
    body: `{@body const [heads, setHeads] = DIL.useState(8)}

<choice bind="heads" label="KV 头数" options={[1, 2, 4, 8, 32]} />
KV cache 是 MHA 的 **1/{32 / heads}**。`,
  },
  Toggle: {
    caption: "Toggle 打开或关掉一个条件。",
    body: `{@body const [fault, setFault] = DIL.useState(false)}

<toggle bind="fault" label="注入故障" />
{fault ? "第 2 块坏了，之后的块全部解不出来。" : "所有块都能正常解密。"}`,
  },
  Button: {
    caption: "Button 点一下改状态或回到默认值。",
    body: `{@body const [count, setCount] = DIL.useState(0)}

<button set={{ count: count + 1 }}>加一</button> <button reset>重置</button>

已经点了 **{count}** 次。`,
  },
  Checklist: {
    caption: "Checklist 是可以一项项勾掉的清单。",
    body: `
<checklist title="上线前" items={[
  { title: "跑完回归测试" },
  { title: "备份数据库", note: "确认能恢复" },
  { time: "22:00", title: "切流量" },
]} />`,
  },
  Stat: {
    caption: "Stat 显示一个醒目的数字。",
    body: `{@body const [batch, setBatch] = DIL.useState(8)}
{@body const mem = 2 * 32 * 8 * 128 * 4096 * batch * 2}


<slider bind="batch" label="batch" min={1} max={32} />
<stat label="KV 显存" value={mem} format="bytes" hint={"batch = " + batch} />`,
  },
  Meter: {
    caption: "Meter 显示占比，超出上限时整条变红。",
    body: `{@body const [batch, setBatch] = DIL.useState(8)}
{@body const mem = 2 * 32 * 8 * 128 * 32768 * batch * 2}


<slider bind="batch" label="batch" min={1} max={32} />
<meter label="80 GB 显卡" max={80 * 1073741824} format="bytes" parts={[
  { label: "权重", value: 16 * 1073741824, tone: "muted" },
  { label: "KV cache", value: mem, tone: "accent" },
]} />`,
  },
  Badge: {
    caption: "Badge 是可以写在句子中间的小标签。",
    body: `
这一格是 <badge tone="new">新算</badge>，那一格是 <badge tone="cached">读缓存</badge>。`,
  },
  Table: {
    caption: "Table 列出精确数值，行可以来自 Row 或 data。",
    body: `{@body const bench = [{ t: 1, q: 98000 }, { t: 4, q: 312000 }, { t: 8, q: 356000 }]}

<table data={bench} rowTone={t == 4 ? "accent" : null} columns={[{ label: "线程", key: "t" }, { label: "QPS", key: "q", format: "thousands" }]} />`,
  },
  Grid: {
    caption: "Grid 是检视格，点一格看这一格的说明。",
    body: `
<grid cols={["块1", "块2", "块3"]} legend={{ same: "密文相同" }}>
  <row label="明文" cells={["A", "B", "A"]} />
  <row label="ECB" cells={["X", "Y", "X"]} tones={["same", "plain", "same"]} notes={["和块3相同", "", "和块1相同"]} />
</grid>`,
  },
  Chart: {
    caption: "Chart 画函数曲线或数据图，sweep 模式标出当前值。",
    body: `{@body const [batch, setBatch] = DIL.useState(4)}
{@body const [seq, setSeq] = DIL.useState(4096)}
{@body const mem = 2 * 32 * 8 * 128 * seq * batch * 2}


<slider bind="batch" label="batch" min={1} max={32} />
<slider bind="seq" label="序列长度" min={1024} max={32768} scale="log" format="thousands" />
<chart sweep="seq" yLabel="KV 显存">
  <line y={mem} label="当前 batch" format="bytes" />
  <line y={mem / batch} label="batch = 1" format="bytes" tone="muted" />
</chart>`,
  },
  Data: {
    caption: "Data 引用同名目录里已有的 CSV / JSON；这里用 Let 代替演示。",
    body: `{@body const bench = [{ threads: 1, qps: 98000 }, { threads: 2, qps: 181000 }, { threads: 4, qps: 312000 }]}

<chart data={bench} x={threads} xLabel="I/O 线程" yFormat="si">
  <bar y={qps} label="QPS" />
</chart>`,
  },
  Image: {
    caption: "Image 在插图上放热点，点序号看说明。",
    body: `
<image src="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 200'><rect width='400' height='200' fill='%23eeeeeb'/><circle cx='110' cy='130' r='50' fill='none' stroke='%2365707d' stroke-width='6'/><circle cx='290' cy='130' r='50' fill='none' stroke='%2365707d' stroke-width='6'/><path d='M110 130 L180 70 L290 130 M180 70 L240 70' stroke='%23202124' stroke-width='6' fill='none'/></svg>" alt="一辆示意的自行车" ratio="2:1">
  <hotspot x={0.45} y={0.35} title="车架">两个三角形把座椅、车把和脚踏连在一起。</hotspot>
  <hotspot x={0.27} y={0.65} title="车轮">辐条把轮毂和轮圈连起来。</hotspot>
</image>`,
  },
  Code: {
    caption: "Code 高亮当前执行到的行，可以随步骤变化。",
    body: `{@body const [step, setStep] = DIL.useState(0)}

<steps bind="step">
  <step title="取中点">先算 mid。</step>
  <step title="比较">a[mid] 和目标比大小。</step>
</steps>
<code lang="go" highlight={["2", "3"][step]} code={\`for lo <= hi {
	mid := (lo + hi) / 2
	if a[mid] < x {
		lo = mid + 1
	}
}\`} />`,
  },
  Stepper: {
    caption: "Stepper 用加减号改一个数量，旁边的句子跟着变。",
    body: `{@body const [guests, setGuests] = DIL.useState(5)}
{@body const lamb = guests * 0.4}


<stepper bind="guests" label="人数" min={1} max={12} unit="人" />
<caption>{guests} 人时，带骨羊腿大约 {lamb} kg。</caption>`,
  },
  Caption: {
    caption: "Caption 是比正文小一号的灰色说明。",
    body: `
<caption>统计期为 2024 年 8 月至 2025 年 8 月。</caption>`,
  },
  Divider: {
    caption: "Divider 把上下两段隔开。",
    body: `
上面是结论。
<divider />
下面是口径。`,
  },
  Cite: {
    caption: "Cite 是来源胶囊，写了网址就带站点图标。",
    body: `
数字来自年报 <cite label="Alibaba Group" href="https://www.alibabagroup.com" />`,
  },
  Pie: {
    caption: "Pie 用圆环看各项占比。",
    body: `
<pie title="收入结构">
  <slice label="商品销售" value={78} />
  <slice label="平台服务" value={13} />
  <slice label="物流及其他" value={9} />
</pie>`,
  },
  Diagram: {
    caption: "Diagram 用 Mermaid 画图，高亮当前所在的节点。",
    body: `{@body const [step, setStep] = DIL.useState(0)}

<steps bind="step">
  <step title="CLOSED">还没有连接。</step>
  <step title="SYN-SENT">发出 SYN，等对方回应。</step>
  <step title="ESTABLISHED">握手完成。</step>
</steps>
<diagram highlight={[["closed"], ["synsent"], ["established"]][step]} mermaid={\`graph LR
  closed[CLOSED] --> synsent[SYN-SENT] --> established[ESTABLISHED]\`} />`,
  },
};

export function demoFence(name) {
 const demo=DEMOS[name];if(!demo)return null;
 return "```garden compose #demo-"+name.toLowerCase()+"\ncaption: "+JSON.stringify(demo.caption)+"\n---\n"+demo.body+"\n```";
}
