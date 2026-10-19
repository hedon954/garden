---
title: stat · 数字指标
description: 用 garden stat 把散落在段落里的几组关键数字、耗时或百分比并排摆出来。
section: components
order: 3
---

## 什么时候用

写压测结果或优化总结时，如果把好几个数字全塞在一句话里（比如「吞吐从 14 万升到 31 万，P99 降到 1.8 毫秒，内存省了三成」），读者扫一眼很难抓到重点。

用 `garden stat` 可以把 2–6 个关键数字并排摆成一行卡片，数字和单位会放大对齐显示。

## 效果与写法

### 多项数字并排（`items`）

```garden stat
items:
  - label: 峰值吞吐
    value: "318,400"
    unit: req/s
    caption: 比单锁实现快 2.24 倍
  - label: P99 延迟
    value: "1.82"
    unit: ms
    caption: 消除了跨核锁争抢
  - label: 单连接内存
    value: "3.4"
    unit: KB
    caption: 共享读缓冲区池
  - label: 压测机器
    value: "64"
    unit: 核
    caption: "EPYC 7763 · 128 并发连接"
    source: "wrk2 持续压测 15 分钟"
```

对应的 Markdown 写法：

```yaml
# 代码块开头写：```garden stat
items:
  - label: 峰值吞吐
    value: "318,400"
    unit: req/s
    caption: 比单锁实现快 2.24 倍
  - label: P99 延迟
    value: "1.82"
    unit: ms
    caption: 消除了跨核锁争抢
  - label: 单连接内存
    value: "3.4"
    unit: KB
    caption: 共享读缓冲区池
  - label: 压测机器
    value: "64"
    unit: 核
    caption: "EPYC 7763 · 128 并发连接"
    source: "wrk2 持续压测 15 分钟"
```

### 只放一个核心数字

如果只想单独突出一个数字，不用写 `items`，直接写字段即可：

```garden stat
label: 冷启动恢复耗时
value: "412"
unit: ms
caption: 加载 16 GB 索引快照并重放末尾日志
source: "NVMe SSD 实测均值"
```

## 可用字段一览

| 字段名 | 必填 | 说明 |
| :--- | :--- | :--- |
| `items` | 否 | 放多个数字时用的列表；只放一个数字时可以省略。 |
| `label` | 是 | 数字上方的名称（比如「P99 延迟」）。 |
| `value` | 是 | 中间的大号数字（建议用引号包起来，比如 `"1.82"`）。 |
| `unit` | 否 | 跟在数字后面的单位（比如 `ms`、`MB/s`、`%`）。 |
| `caption` / `text` | 否 | 数字下方的一句话补充说明。 |
| `source` | 否 | 最下方的小字数据来源或测试条件。 |
