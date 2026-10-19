---
title: interactive · 可调公式与参数台
description: 用 garden interactive 在文章里放滑杆、开关和动态曲线，让读者自己拖动参数看计算结果怎么变。
section: components
order: 9
---

## 什么时候用

写技术文章经常会算一笔账：比如「在大模型推理里，KV Cache 到底占多少显存？」或者「连接数和超时时间改了之后，内存水位会涨到多少？」

如果只在文章里算死一组数字，读者想换自己手头的机器配置还得掏计算器。用 `garden interactive` 可以声明几个变量（`<State>`）和计算公式（`<Let>`），再放一两根滑杆（`<Slider>`），读者拖动滑杆就能实时看到句子里的数字和下方曲线跟着变化。

> [!TIP]
> 只有当公式稍微复杂一点、或者读者真的会好奇「换成别的参数会怎样」时才用它。如果只是一次简单的乘法，直接写在普通正文里就够了。

## 效果与写法

试着拖动下面的「并发 batch」和「序列长度」滑杆，下面的计算结果和趋势线会实时跟着变：

```garden interactive
id: kv-cache-memory
caption: KV 显存随 batch 和序列长度线性增长；batch 为 8、序列 32K 时需要 32 GiB 显存。
intent: |
  让读者拖动 batch 和序列长度，看 KV cache 占多少显存。
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
  <Slider bind="batch" label="并发 batch" min={1} max={32} />
  <Slider bind="seq" label="序列长度" min={1024} max={32768} scale="log" format="thousands" />
</Columns>

当并发 batch 为 **{batch}**、序列长度为 **{thousands(seq)}** 时，光 KV Cache 就要占用 **{bytes(mem)}** 显存。

<Chart sweep="seq" yLabel="KV 显存占用">
  <Line y={mem} label="KV 显存" format="bytes" />
</Chart>
```

对应的 Markdown 写法：

```yaml
# 代码块开头写：```garden interactive
id: kv-cache-memory
caption: KV 显存随 batch 和序列长度线性增长；batch 为 8、序列 32K 时需要 32 GiB 显存。
intent: |
  让读者拖动 batch 和序列长度，看 KV cache 占多少显存。
expect:
  - given: { batch: 1, seq: 4096 }
    mem: 536870912
---
<State batch={1} seq={4096} />
<Let mem={2 * 32 * 8 * 128 * seq * batch * 2} />

<Columns>
  <Slider bind="batch" label="并发 batch" min={1} max={32} />
  <Slider bind="seq" label="序列长度" min={1024} max={32768} scale="log" format="thousands" />
</Columns>

当并发 batch 为 **{batch}**、序列长度为 **{thousands(seq)}** 时，光 KV Cache 就要占用 **{bytes(mem)}** 显存。

<Chart sweep="seq" yLabel="KV 显存占用">
  <Line y={mem} label="KV 显存" format="bytes" />
</Chart>
```

## 常用部分说明

### 1. 上半部分（YAML 信息头）

| 字段名 | 必填 | 说明 |
| :--- | :--- | :--- |
| `id` | 是 | 给这个交互块起个英文加连字符的名字（同一篇文章里不重复）。 |
| `caption` | 是 | 一句话写出核心结论（就算读者不拖滑杆，或者在 RSS 阅读器里看，也能直接读到这个结论）。 |
| `intent` | 否 | 记下这块交互想表达什么。 |
| `expect` | 否 | 写一组已知的输入和结果用来自动验算公式有没有写错（比如上面例子里 `batch: 1, seq: 4096` 时结果必须是 `536870912` 字节）。 |

### 2. 下半部分（`---` 下面的常用标签）

- `<State 变量名={默认值} />`：定义一个可以让读者改的变量（数字、字符串或布尔值）。
- `<Let 变量名={计算公式} />`：定义一个根据前面的变量自动算出来的值。
- `<Slider bind="变量名" label="显示名称" min={最小值} max={最大值} />`：画一根拖动滑杆。跨好几个数量级时可以加 `scale="log"`。
- `{bytes(变量)}`、`{thousands(变量)}`、`{percent(变量)}`、`{fixed(变量, 2)}`：在正文句子里把算出来的数字格式化成好读的字节数、千分位或百分比。
- `<Chart sweep="横轴变量名">` + `<Line y={公式变量} label="名称" />`：自动把公式随某个变量变化的趋势画成曲线图。
