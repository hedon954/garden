# 配方：参数台

**读者卡在哪：** 公式是活的，页面上的数字是死的。作者算好了一组结果，读者想换个参数只能自己掏计算器。

**什么时候用：** 结果由一两个输入决定，而且读者会好奇"换成别的值会怎样"。KV cache 显存、浮点精度、学习率曲线、复利、哈希表装载因子。

**什么时候不用：** 只有一个固定的例子要讲；或者输入超过 3 个，读者拧不过来（先拆块）。

**作者可能这样说：** "让读者拧 batch 和序列长度""拖一下看看""从 1 到 32 可调""看曲线怎么变"。

**骨架：** `State` 放输入，`Let` 写公式，`Slider` 绑输入，一句带插值的话说出当前结果，需要看趋势时加 `Chart sweep`。

````md
```ui
---
id: kv-memory
caption: 显存与 batch、序列长度都成正比；batch 8、序列 32K 就要 32 GiB。
intent: |
  让读者拧 batch 和序列长度，看 KV cache 占多少显存。
  batch 1 到 32，默认 1；序列 1K 到 32K，默认 4K，用对数轴。
  显存 = 2 × 32 层 × 8 个 KV 头 × 128 维 × 序列长度 × batch × 2 字节。
  batch 1、序列 4096 时是 512 MiB。
expect:
  - given: { batch: 1, seq: 4096 }
    mem: 536870912
---
<State batch={1} seq={4096} />
<Let mem={2 * 32 * 8 * 128 * seq * batch * 2} />

<Columns>
  <Slider bind="batch" label="batch" min={1} max={32} />
  <Slider bind="seq" label="序列长度" min={1024} max={32768} scale="log" format="thousands" />
</Columns>

batch 为 {batch}、序列 {thousands(seq)} 时，KV cache 要 **{bytes(mem)}**。

<Chart sweep="seq" yLabel="KV 显存">
  <Line y={mem} label="KV 显存" format="bytes" />
</Chart>
```
````

**要点：**

- 一句会变的话通常比一个孤零零的 `Stat` 更好读；要强调单个数字时才用 `Stat`。
- 横轴跨好几个数量级时用 `scale="log"`；端点都是 2 的幂时，滑杆自动只停在 2 的幂上。
- 横轴不是任何滑杆时（比如训练步数），先 `<State t={0} />`，再写 `<Chart sweep="t" from={0} to={10000}>`。
- 想和容量上限比，加一个 `Meter`。
- 原话里有已知点，一定写 `expect`。

**常见错误：**

- 公式里的常数和原话对不上（层数、头数抄错）。
- 对数滑杆的 `min` 写成 0。
- 两根滑杆都画在 `Chart` 的横轴上：`sweep` 只能是一个状态，另一个保持当前值。
