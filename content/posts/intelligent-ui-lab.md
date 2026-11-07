---
title: Intelligent UI 实验室
description: 用一段自然语言写下想法，让 AI 编译成可以拖、点、翻的交互块。
date: 2026-10-10
tags:
  - Garden
  - Intelligent UI
---

这篇文章演示 Garden 的 Intelligent UI：作者在稿里写一段 `intent`，AI 把它编译成 `ui` 块，站点画成可交互的组件。下面每一块都写在它要讲的那一段旁边。

## KV cache 到底占多少显存

每个 token 在每一层都要存一份 K 和一份 V。以 32 层、8 个 KV 头、每头 128 维、fp16 的模型为例：

```garden compose
id: kv-memory
caption: 显存与 batch、序列长度都成正比；batch 8、序列 32K 就要 32 GiB。
intent: |
  让读者拧 batch 和序列长度，看 KV cache 占多少显存。
  batch 1 到 32，默认 1；序列 1K 到 32K，默认 4K，用对数轴。
  显存 = 2 × 32 层 × 8 个 KV 头 × 128 维 × 序列长度 × batch × 2 字节。
  batch 1、序列 4096 时是 512 MiB。
  想让读者看出：显存和 batch、序列长度都成正比，长上下文很快吃满显卡。
expect:
  - given:
      batch: 1
      seq: 4096
    mem: 536870912
---
{@body const [batch, setBatch] = DIL.useState(1)}
{@body const [seq, setSeq] = DIL.useState(4096)}
{@body const mem = 2 * 32 * 8 * 128 * seq * batch * 2}



<columns>
  <slider bind="batch" label="batch" min={1} max={32} />
  <slider bind="seq" label="序列长度" min={1024} max={32768} scale="log" format="thousands" />
</columns>

batch 为 {batch}、序列 {thousands(seq)} 时，KV cache 要 **{bytes(mem)}**。

<chart sweep="seq" yLabel="KV 显存">
  <line y={mem} label="KV 显存" format="bytes" />
</chart>
```

所以长上下文推理的瓶颈往往不是算力，而是显存。

## Prefill 和 Decode 有什么不同

Prefill 阶段一次处理整段 prompt；之后每生成一个 token，都只为这个新 token 算 K/V。

```garden compose
id: prefill-decode
caption: Prefill 一次写满 3 行 K/V；之后每步只新算 1 行，其余读缓存。
intent: |
  让读者一步步看 KV cache 怎么增长：prompt 3 个 token，再 decode 两步。
  每步标出哪一行是新算的，哪些是读缓存。
---
{@body const [step, setStep] = DIL.useState(0)}
{@body const rows = step + 3}



<steps bind="step">
  <step title="Prefill">一次算完 3 个 prompt token 的 K/V，全部写进缓存。</step>
  <step title="Decode 1">新 token 只算自己的 K/V，追加第 4 行；前 3 行直接读缓存。</step>
  <step title="Decode 2">再追加一行。缓存里已有 {rows} 行，本步新算 1 行。</step>
</steps>

<grid cols={["K", "V"]} legend={{ new: "本步新算", cached: "读缓存" }}>
  {#each range(0, rows) as i}
    <row label={"t" + (i + 1)} cells={["k" + (i + 1), "v" + (i + 1)]}
         tones={step == 0 || i == rows - 1 ? "new" : "cached"} />
  {/each}
</grid>
```

这就是 decode 阶段每步计算量和序列长度无关的原因。

## 读多写少时选哪把锁

假设每次读和写都要 10 ms，几个读者和一个写者同时到达。

```garden compose
id: mutex-vs-rwlock
caption: 读者越多，Mutex 越慢；RwLock 让读者并行，总耗时不变。
intent: |
  对比 Mutex 和 RwLock：读者数量 1 到 8 可调，一个写者，每次读写 10 ms，看总耗时。3 个读者时 Mutex 要 40 ms。
expect:
  - given:
      readers: 3
    mutexMs: 40
    rwMs: 20
---
{@body const [readers, setReaders] = DIL.useState(3)}
{@body const mutexMs = (readers + 1) * 10}
{@body const rwMs = 20}



<slider bind="readers" label="同时到达的读者" min={1} max={8} unit="个" />

<columns>
  <card title="Mutex">读者和写者一个接一个，共 **{mutexMs} ms**。</card>
  <card title="RwLock" tone="accent">{readers} 个读者一起读，写者再独占，共 **{rwMs} ms**。</card>
</columns>
```

代价是 RwLock 自身更重，写多的场景反而更慢。

## 为什么 ECB 会泄露图案

```garden compose
id: ecb-vs-cbc
caption: ECB 下相同的明文块得到相同的密文块；CBC 把上一块的密文混进来，重复就消失了。
intent: |
  明文四块 A B A A，让读者在 ECB 和 CBC 之间切换，看密文里重复的块。
---
{@body const [mode, setMode] = DIL.useState("ecb")}


<choice bind="mode" label="模式" options={[{ value: "ecb", label: "ECB" }, { value: "cbc", label: "CBC" }]} />

<grid cols={["块1", "块2", "块3", "块4"]} legend={{ same: "密文与别的块相同" }}>
  <row label="明文" cells={["A", "B", "A", "A"]} />
  <row label="密文" cells={mode == "ecb" ? ["X", "Y", "X", "X"] : ["P", "Q", "R", "S"]}
       tones={mode == "ecb" ? ["same", "plain", "same", "same"] : "plain"}
       notes={mode == "ecb" ? ["和块3、块4相同", "", "和块1相同", "和块1相同"] : ["", "", "", ""]} />
</grid>
```

相同的明文块在 ECB 下总是得到相同的密文块，图案就这样漏了出来。

## 人数一变，采购量跟着变

```garden compose
id: sunday-shop
caption: 人数用加减号调，羊腿重量和圆环占比一起变。
---
{@body const [guests, setGuests] = DIL.useState(5)}
{@body const lamb = guests * 0.4}



<stepper bind="guests" label="人数" min={1} max={12} unit="人" />
<caption>{guests} 人，带骨羊腿大约 {fixed(lamb, 1)} kg。</caption>
来源 <cite label="USDA" href="https://www.usda.gov" />
<divider />
<pie title="这一桌的构成">
  <slice label="羊腿" value={lamb} />
  <slice label="土豆" value={guests * 0.25} />
  <slice label="蔬菜" value={guests * 0.15} />
</pie>
<checklist title="周日时间表" items={[
  { time: "12:30", title: "处理羊腿", note: "蒜、迷迭香、柠檬" },
  { time: "15:00", title: "入烤箱", note: "用温度计，不单看时间" },
  { time: "17:00", title: "上桌" }
]} />
```
