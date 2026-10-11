# 配方：对照

**读者卡在哪：** 两种做法只能上下翻着看，工作记忆装不下"左边这样、右边那样"。

**什么时候用：** 两三种方案在同一个输入下的表现差别：Mutex 和 RwLock、MHA 和 GQA、朴素实现和带缓存的实现、ECB 和 CBC。

**什么时候不用：** 只是罗列各自的特点，没有共同的输入（写一张 Markdown 表格就够）。

**作者可能这样说：** "并排对比""左右各放一个""同样的条件下谁更快"。

**骨架：** `Columns` 里放两个 `Card`，两边读同一个状态；共同的输入（`Slider`、`Toggle`）放在上面。想强调胜出的一方时，给它 `tone="accent"`。

````md
```ui
---
id: mutex-vs-rwlock
caption: 读者越多，Mutex 越慢；RwLock 让读者并行，总耗时不变。
intent: |
  对比 Mutex 和 RwLock：读者数量 1 到 8 可调，一个写者，每次读写 10 ms，看总耗时。
expect:
  - given: { readers: 3 }
    mutexMs: 40
    rwMs: 20
---
<State readers={3} />
<Let mutexMs={(readers + 1) * 10} rwMs={20} />

<Slider bind="readers" label="同时到达的读者" min={1} max={8} unit="个" />

<Columns>
  <Card title="Mutex">读者和写者一个接一个，共 **{mutexMs} ms**。</Card>
  <Card title="RwLock" tone="accent">{readers} 个读者一起读，写者再独占，共 **{rwMs} ms**。</Card>
</Columns>
```
````

**要点：**

- 两边的结构保持一致：同样的组件、同样的顺序，只有数字和措辞不同。
- 共同输入只放一份，不要每边各放一个滑杆。
- 窄屏上 `Columns` 会自动上下叠放，两边的文字要能各自读懂。
- 两边都要算的量写进 `Let`，并为它们写 `expect`。

**常见错误：**

- 两边读的不是同一个状态，读者拧一边，另一边不动。
- 放了三个以上的 `Card`，变成罗列。
- 把"哪边更好"的结论只写在颜色里；结论要写进 `caption`。
