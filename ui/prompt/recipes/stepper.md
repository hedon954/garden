# 配方：步进器

**读者卡在哪：** 过程被拍成了一张图。读者没法停在第 3 步，也没法问"再走一步，哪里变了"。

**什么时候用：** 状态随时间变化的机制：Prefill / Decode、反向传播、Raft 选举、GC 三色标记、锁的获取与释放、算法的每一轮。

**什么时候不用：** 只有两三个静态阶段，一张 Mermaid 或一个列表就能说清；步骤之间没有"状态在变"这件事。

**作者可能这样说：** "让读者一步步看""停在某一拍""每步标出新算的是哪一行""第几轮发生了什么"。

**骨架：** `State step={0}`，`Steps bind="step"` 里每步一句话；旁边放一个随 `step` 变化的 `Grid` 或 `Table`，把这一步变了的地方标成 `new`。

````md
```ui
---
id: prefill-decode
caption: Prefill 一次写满 3 行 K/V；之后每步只新算 1 行，其余读缓存。
intent: |
  让读者一步步看 KV cache 怎么增长：prompt 3 个 token，再 decode 两步。
  每步标出哪一行是新算的，哪些是读缓存。
---
<State step={0} />
<Let rows={step + 3} />

<Steps bind="step">
  <Step title="Prefill">一次算完 3 个 prompt token 的 K/V，全部写进缓存。</Step>
  <Step title="Decode 1">新 token 只算自己的 K/V，追加第 4 行；前 3 行直接读缓存。</Step>
  <Step title="Decode 2">再追加一行。缓存里已有 {rows} 行，本步新算 1 行。</Step>
</Steps>

<Grid cols={["K", "V"]} legend={{ new: "本步新算", cached: "读缓存" }}>
  <Each of={range(0, rows)} as="i">
    <Row label={"t" + (i + 1)} cells={["k" + (i + 1), "v" + (i + 1)]}
         tones={step == 0 || i == rows - 1 ? "new" : "cached"} />
  </Each>
</Grid>
```
````

**要点：**

- 每步的话只说这一步变了什么，一两句。
- 想让别的组件跟着步骤变，`Steps` 必须写 `bind`；只是翻页看文字时可以不写。
- 每一步的数据用 `step` 推出来（`Let`、三元、数组下标），不要为每一步复制一份 `Grid`。
- 末步做"前后对比"时，可以在最后一个 `Step` 里放 `Columns`。
- 一般不开 `autoplay`；读者自己翻更容易停下来想。

**常见错误：**

- 超过 12 步还硬塞在一块里（先拆成两块）。
- `Step` 里的话和旁边格子的状态对不上（第 2 步说"追加第 4 行"，格子却已有 5 行）。
- 用 `Button set` 自己做上一步、下一步：`Steps` 已经带了。
