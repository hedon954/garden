const header = (id, caption) => `---
id: ${id}
caption: ${caption}
intent: |
  像素对照
---
`;

/** Real fences for the six interactions that were missing from the first crop. */
export const PARITY_FIXTURES = [
  {
    id: "parity-slider",
    width: 768,
    body: `${header("parity-slider", "序列越长，KV 显存越大。")}
<State seq={4096} />
<Slider bind="seq" label="序列长度" min={1024} max={32768} scale="log" format="thousands" unit="token" />
`,
  },
  {
    id: "parity-chart",
    width: 768,
    body: `${header("parity-chart", "显存随序列长度线性增长。")}
<State seq={4096} />
<Let mem={2 * 32 * 8 * 128 * seq * 2} />
<Chart sweep="seq" from={1024} to={32768} scale="log" height={220} xLabel="序列长度" yLabel="KV 显存">
  <Line y={mem} label="KV 显存" format="bytes" />
</Chart>
`,
  },
  {
    id: "parity-steps",
    width: 768,
    body: `${header("parity-steps", "Prefill 一次写满 K/V；Decode 每步只追加一行。")}
<Steps>
  <Step title="Prefill">一次写下全部 K/V。</Step>
  <Step title="Decode">这一拍只追加一行。</Step>
  <Step title="完成">21 次投影变成 7 次。</Step>
</Steps>
`,
  },
  {
    id: "parity-grid",
    width: 768,
    body: `${header("parity-grid", "ECB 下相同的明文块得到相同的密文块。")}
<Grid cols={["块1", "块2", "块3"]} legend={{ same: "相同的明文得到相同的密文" }}>
  <Row label="明文" cells={["A", "B", "A"]} tones={["same", "plain", "same"]} />
  <Row label="ECB 密文" cells={["X", "Y", "X"]} tones={["same", "plain", "same"]} notes={["和块3一样", "", "和块1一样"]} />
</Grid>
`,
  },
  {
    id: "parity-code",
    width: 768,
    body: `${header("parity-code", "这一步执行的是累加。")}
<Code lang="go" highlight="2" code={\`a := 1
b := a + 1
fmt.Println(b)\`} />
`,
  },
  {
    id: "parity-diagram",
    width: 768,
    body: `${header("parity-diagram", "收到 SYN+ACK 才离开 SYN-SENT。")}
<Diagram highlight={["synsent"]} mermaid={\`flowchart LR
  closed[CLOSED] --> synsent[SYN-SENT]
  synsent --> established[ESTABLISHED]\`} />
`,
  },
  {
    id: "parity-sandbox",
    width: 768,
    body: `${header("parity-sandbox", "目录以外的交互放在无网络的画布里。")}
<Sandbox title="计数" html={"<p id=\\"n\\">0</p><button id=\\"b\\" type=\\"button\\">加一</button>"} css="button{color:var(--viz-accent)}" js="document.getElementById('b').onclick=()=>{const n=document.getElementById('n');n.textContent=String(Number(n.textContent)+1)}" />
`,
  },
];
