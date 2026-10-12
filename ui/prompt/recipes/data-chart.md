# 配方：数据图

**读者卡在哪：** 测出来的数字被贴成一张截图，读者看不清具体值，也没法对照。

**什么时候用：** 作者手里有一组实测数据：压测结果、基准测试、实验记录。

**什么时候不用：** 数据可以由公式算出（用参数台）；只有两三个数（写进句子）。

**作者可能这样说：** "把这组压测数据画出来""柱状图对比""数据在 xxx.csv 里"。

**骨架：** 原话里直接给了数字时，用 `Let` 数组照抄；原话提到同名目录里的文件时，用 `Data`。`Chart data` 画图，`Table data` 列出精确值。

下面的数字只是示例；真实的块里，每个数字都必须来自原话或数据文件。

````md
```ui
---
id: redis-io-threads
caption: I/O 线程从 1 加到 4，QPS 涨了两倍多；再加到 8，只多了一成多。
intent: |
  把 Redis I/O 线程数的压测结果画成柱状图，再列一张表：
  1 线程 98000，2 线程 181000，4 线程 312000，8 线程 356000。
---
<Let bench={[
  { threads: 1, qps: 98000 },
  { threads: 2, qps: 181000 },
  { threads: 4, qps: 312000 },
  { threads: 8, qps: 356000 },
]} />

<Chart data={bench} x={threads} xLabel="I/O 线程" yLabel="QPS" yFormat="si">
  <Bar y={qps} label="QPS" />
</Chart>

<Table data={bench} rowTone={threads == 4 ? "accent" : null}
       columns={[{ label: "I/O 线程", key: "threads" }, { label: "QPS", key: "qps", format: "thousands" }]} />
```
````

数据在文件里时，把 `Let` 换成：

```text
<Data name="bench" src="./redis-bench/bench.csv" />
```

**要点：**

- 数字一个都不能改，也不能"顺手"补全缺的点。
- 离散的类别（线程数、版本号）用 `Bar`；连续变量的趋势用 `Line`。
- 想说明的拐点用 `rowTone` 在表里标出来，结论写进 `caption`。
- 要让读者在两组数据间切换时，加一个 `Choice`，`data` 用三元选择。

**常见错误：**

- 编造原话里没有的数据点。
- 原话已经给了完整数字，却还去引用一个并不存在的文件。
- 横轴是类别却用了 `Line`，暗示中间存在连续值。
