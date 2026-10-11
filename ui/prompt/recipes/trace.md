# 配方：轨迹

**读者卡在哪：** 状态图上看不出"现在走到哪"。TCP 状态、Raft 角色、GPM 调度，图是全的，可读者不知道这一刻哪个节点亮着。

**什么时候用：** 有一张明确的状态图或流程图，并且过程是沿着它一步步走的。

**什么时候不用：** 只需要展示拓扑（写 Mermaid）；或者节点超过 9 个、边超过 12 条（先拆）。

**作者可能这样说：** "沿着状态机走一遍""现在在哪个状态""三次握手每一步双方处于什么状态"。

**骨架（阶段 6 之前）：** `Steps bind="step"` + 一张 `Table`，列出每个参与方此刻的状态，这一步变了的标成 `new`。阶段 6 起改用 `Diagram`，用 `highlight` 标出当前节点。

````md
```ui
---
id: tcp-handshake
caption: 三次握手里，客户端先进入 ESTABLISHED，服务端要等最后一个 ACK。
intent: |
  一步步走 TCP 三次握手，每步列出客户端和服务端的状态，标出这一步变了的那一方。
---
<State step={0} />
<Let clientStates={["CLOSED", "SYN-SENT", "ESTABLISHED", "ESTABLISHED"]}
     serverStates={["LISTEN", "SYN-RCVD", "SYN-RCVD", "ESTABLISHED"]}
     prev={max(step - 1, 0)} />

<Steps bind="step">
  <Step title="开始">服务端在 LISTEN 等连接。</Step>
  <Step title="SYN">客户端发 SYN；服务端收到后回 SYN+ACK，进入 SYN-RCVD。</Step>
  <Step title="SYN+ACK">客户端收到 SYN+ACK，回 ACK，自己先进入 ESTABLISHED。</Step>
  <Step title="ACK">服务端收到 ACK，也进入 ESTABLISHED。</Step>
</Steps>

<Table columns={["一方", "状态"]}>
  <Row cells={["客户端", clientStates[step]]}
       tones={step > 0 && clientStates[step] != clientStates[prev] ? "new" : "plain"} />
  <Row cells={["服务端", serverStates[step]]}
       tones={step > 0 && serverStates[step] != serverStates[prev] ? "new" : "plain"} />
</Table>
```
````

阶段 6 起的写法：

```text
<Diagram highlight={[["closed"], ["synsent"], ["established"], ["established"]][step]} mermaid={`
stateDiagram-v2
  closed --> synsent: 发 SYN
  synsent --> established: 收到 SYN+ACK
`} />
```

**要点：**

- 每一步的状态写成数组，用 `step` 取下标；"这一步变了"用和上一步比较得出。
- 节点名和作者原话保持一致，不要自己翻译或缩写。
- 图本身已经在正文里用 Mermaid 画过时，这一块只负责"走"，不要重画一遍完整拓扑。

**常见错误：**

- 数组长度和步数对不上。
- 在第 0 步就把某一方标成 `new`。
- 阶段 6 之前写了 `Diagram`。
