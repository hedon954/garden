# 配方：换算器

**读者卡在哪：** 一组量都跟着同一个数变化，作者只能给一两个例子，读者的情况往往不在其中。

**什么时候用：** 一个输入驱动好几个输出：按人数换算用料、按并发数换算资源、按规模换算成本、按单位换算。

**什么时候不用：** 只有一个输出（用参数台）；输出之间要分别调（先拆块）。

**作者可能这样说：** "按人数算要买多少""换算表""不同规模下各要多少"。

**骨架：** 一个 `Slider` 或 `Choice` 作为输入；把每一项的单位用量写进 `Let` 数组；`Table` 里用 `Each` 逐项生成行。

````md
```ui
---
id: roast-shopping
caption: 用料按人数线性换算；带骨羊腿每人 0.4 kg。
intent: |
  按人数（2 到 12 人，默认 6 人）算周日烤羊腿要买多少：
  带骨羊腿每人 0.4 kg，土豆每人 250 g，胡萝卜每人 1.5 根，甜点苹果每人半个。
expect:
  - given: { guests: 6 }
    lamb: 2.4
---
<State guests={6} />
<Let lamb={0.4 * guests}
     items={[
       { name: "土豆", per: 250, unit: "g" },
       { name: "胡萝卜", per: 1.5, unit: "根" },
       { name: "苹果（甜点）", per: 0.5, unit: "个" },
     ]} />

<Slider bind="guests" label="人数" min={2} max={12} unit="人" />

<Table columns={[{ label: "食材" }, { label: "数量", align: "right" }]}>
  <Row cells={["带骨羊腿", fixed(lamb, 1) + " kg"]} tones="accent" />
  <Each of={items} as="it">
    <Row cells={[it.name, ceil(it.per * guests) + " " + it.unit]} />
  </Each>
</Table>
```
````

**要点：**

- 每一项的单位用量都来自原话；原话没给的项不要加。
- 按个数计的东西用 `ceil` 向上取整，按重量计的用 `fixed` 保留一位小数。
- 最关键的那一项可以单独写一行并标 `accent`，同时为它写 `expect`。
- 输入是几个离散档位（比如"小 / 中 / 大"）时，用 `Choice` 代替 `Slider`。

**常见错误：**

- 用 `.map()` 生成行，而不是 `Each`。
- 按个数计的东西算出 7.5 个。
- 表格里堆了原话没提到的项。
