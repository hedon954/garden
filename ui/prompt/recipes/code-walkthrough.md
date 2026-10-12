# 配方：代码走查

**读者卡在哪：** 代码是一张照片。读者看不出"这一步执行到哪一行、变量此刻是多少"。

**什么时候用：** 一段不长的代码（不超过 60 行），值得一行行讲：二分查找、锁的实现、状态机的处理函数。

**什么时候不用：** 只需要展示代码（写普通代码块）；代码太长（只截关键的一段）。

**作者可能这样说：** "一行行讲这段代码""每一步执行到哪""标出当前行，旁边列出变量"。

**骨架（阶段 6 之前）：** 正文里先放普通代码块；这一块用 `Steps bind="step"` 讲每一步，配一张 `Table` 列出变量此刻的值，这一步变了的标成 `new`。阶段 6 起，用 `Code` 把代码放进块里，`highlight` 随步骤变化。

阶段 6 之前：

````md
```ui
---
id: binary-search-vars
caption: 每比较一次，搜索区间就缩小一半；8 个元素最多比较 4 次。
intent: |
  在 [1 3 5 7 9 11 13 15] 里找 9，一步步列出 lo、hi、mid 和比较结果。
---
<State step={0} />
<Let los={[0, 4, 4]} his={[7, 7, 4]} mids={[3, 5, 4]} prev={max(step - 1, 0)} />

<Steps bind="step">
  <Step title="第 1 次">mid = 3，a[3] = 7 小于 9，目标在右半边。</Step>
  <Step title="第 2 次">lo 移到 4；mid = 5，a[5] = 11 大于 9，目标在左半边。</Step>
  <Step title="第 3 次">hi 移到 4；mid = 4，a[4] = 9，找到。</Step>
</Steps>

<Table columns={["lo", "hi", "mid"]}>
  <Row cells={[los[step], his[step], mids[step]]}
       tones={step == 0 ? "plain" : [los[step] != los[prev] ? "new" : "plain", his[step] != his[prev] ? "new" : "plain", "new"]} />
</Table>
```
````

阶段 6 起，在同一块里加上：

```text
<Code lang="go" highlight={["4-5", "6-7", "8-10"][step]} code={`func search(a []int, x int) int {
	lo, hi := 0, len(a)-1
	for lo <= hi {
		mid := (lo + hi) / 2
		if a[mid] < x {
			lo = mid + 1
		} else if a[mid] > x {
			hi = mid - 1
		} else {
			return mid
		}
	}
	return -1
}`} />
```

**要点：**

- 每一步的变量值写成数组，用 `step` 取下标；值必须和代码真实执行的结果一致，自己先在心里跑一遍。
- 每一步的话说清"为什么走这一行"，不要只念代码。
- 代码超过 60 行时只截关键的函数。

**常见错误：**

- 变量值和代码执行结果对不上（`hi` 的更新写错一步）。
- 第 0 步就把变量标成 `new`。
- 阶段 6 之前写了 `Code`。
