---
title: chart · 条形图表
description: 用 garden chart 把一组对比数字画成直观的比例条形图，下方自带可展开的完整数字表格。
section: components
order: 6
---

## 什么时候用

当文章里有一组基准测试数据或耗时对比，光摆一张表格不够直观、看不出谁比谁长多少倍时，用 `garden chart` 可以直接画出按比例对齐的水平条形图，而且图表下方会自动附带一个点击可展开的「查看数据表」。

## 效果与写法

### 单组数据对比（`data`）

最简单的写法是直接在 `data` 里填每一项的名字（`x`）和数值（`y`）：

```garden chart
title: 1 GB 日志文件的各算法压缩吞吐量
unit: " GB/s"
caption: LZ4 在单核吞吐上领先明显，适合写前日志（WAL）实时压缩。
data:
  - x: "LZ4 (fast)"
    y: 4.62
  - x: "Zstd (level 1)"
    y: 1.94
  - x: "Snappy"
    y: 1.58
  - x: "Gzip (level 6)"
    y: 0.31
```

对应的 Markdown 写法：

```yaml
# 代码块开头写：```garden chart
title: 1 GB 日志文件的各算法压缩吞吐量
unit: " GB/s"
caption: LZ4 在单核吞吐上领先明显，适合写前日志（WAL）实时压缩。
data:
  - x: "LZ4 (fast)"
    y: 4.62
  - x: "Zstd (level 1)"
    y: 1.94
  - x: "Snappy"
    y: 1.58
  - x: "Gzip (level 6)"
    y: 0.31
```

### 多系列分组对比（`x` + `series`）

如果要对比不同负载下的多组数字（比如「平均延迟」和「P99 延迟」），可以用 `x` 列出横轴名字，再用 `series` 列出每一组数值：

```garden chart
title: 三种批量刷新策略下的写入延迟对比
unit: " ms"
x:
  - "逐条刷盘"
  - "组提交 (4 MB)"
  - "双缓冲异步刷盘"
series:
  - name: "P50 延迟"
    data: [3.2, 0.9, 0.4]
  - name: "P99 延迟"
    data: [18.5, 4.1, 1.8]
caption: 组提交能把 P99 刷盘等待从 18.5ms 压到 4.1ms。
```

## 可用字段一览

| 字段名 | 必填 | 说明 |
| :--- | :--- | :--- |
| `title` | 否 | 图表上方的标题。 |
| `unit` | 否 | 数值后面跟着的单位（如 `" ms"`、`"%"`、`" GB/s"`）。 |
| `data` | 否 | 单组数据列表，每项写 `{ x: "名称", y: 数值 }`。 |
| `x` | 否 | 多组数据对比时的分类名称列表。 |
| `series` | 否 | 多组数据列表，每项写 `{ name: "系列名", data: [数值1, 数值2, ...] }`。 |
| `caption` | 否 | 图表下方的一句话结论。 |
| `xLabel` / `yLabel` | 否 | 展开下方「查看数据表」时的第一列表头名称。 |
