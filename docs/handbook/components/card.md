---
title: card · 知识卡片与编号要点
description: 用 garden card 介绍一篇论文、一个开源项目或某个模块，支持在卡片下方列出带编号的关键要点。
section: components
order: 2
---

## 什么时候用

当你在文章里专门介绍一篇论文、一个开源库或者某个模块，想把它的标题、出处、一句话简介和 2–4 条重点整理在同一张卡片里时，用 `garden card`。

如果只是想把一条普通网页链接变成带标题和预览图的卡片，不用写 `garden card`，直接在链接后面加 `{card}`（比如 `[标题](https://...){card}`）就行。

## 效果与写法

### 带编号要点的卡片

```garden card
title: "WiscKey: Separating Keys from Values in SSD-Conscious Storage"
url: "https://www.usenix.org/conference/fast16/technical-sessions/presentation/lu"
meta: "USENIX FAST '16 · Lu et al."
description: "把体积较大的 Value 从 LSM-Tree 排序归并过程里拆出来单独追加存储，树里只留键和地址指针。"
source: "ACM Transactions on Storage"
points:
  - title: "显著降低写放大"
    text: "后台合并时只需要搬移固定长度的键和指针，大 Value 场景下写放大可以从 10 倍以上降到 2 倍以内。"
  - title: "不影响范围查询"
    text: "利用 NVMe SSD 的高并发随机读能力，在范围扫描时并行预取 Value。"
  - title: "独立回收旧空间"
    text: "通过记录首尾指针和小批量回查有效键，在不卡住前台写入的前提下清理失效数据。"
```

对应的 Markdown 写法：

```yaml
# 代码块开头写：```garden card
title: "WiscKey: Separating Keys from Values in SSD-Conscious Storage"
url: "https://www.usenix.org/conference/fast16/technical-sessions/presentation/lu"
meta: "USENIX FAST '16 · Lu et al."
description: "把体积较大的 Value 从 LSM-Tree 排序归并过程里拆出来单独追加存储，树里只留键和地址指针。"
source: "ACM Transactions on Storage"
points:
  - title: "显著降低写放大"
    text: "后台合并时只需要搬移固定长度的键和指针，大 Value 场景下写放大可以从 10 倍以上降到 2 倍以内。"
  - title: "不影响范围查询"
    text: "利用 NVMe SSD 的高并发随机读能力，在范围扫描时并行预取 Value。"
  - title: "独立回收旧空间"
    text: "通过记录首尾指针和小批量回查有效键，在不卡住前台写入的前提下清理失效数据。"
```

### 简写单行要点

如果每条要点不需要单独的小标题，`points`（也可以写成 `items`）里可以直接写一行行文字：

```garden card
title: "io_uring 异步文件与网络接口"
meta: "Linux 5.1+"
description: "用户态和内核态共享提交队列（SQ）与完成队列（CQ）环形缓冲区，减少频繁系统调用的开销。"
points:
  - "共享环形队列：一次系统调用就能批量提交和收割几百个读写请求"
  - "预注册缓冲区：提前登记固定内存块，省掉每次读写的页表映射开销"
```

## 可用字段一览

| 字段名 | 必填 | 说明 |
| :--- | :--- | :--- |
| `title` | 是 | 卡片主标题（论文名、项目名或模块名）。 |
| `url` | 否 | 点击标题跳转的链接地址。 |
| `meta` | 否 | 右上角的小字说明（比如年份、版本号或作者）。 |
| `description` / `text` | 否 | 卡片正文简介。 |
| `source` / `site` | 否 | 接在简介后面的来源名称。 |
| `image` | 否 | 右侧配图路径（需要配无障碍说明时可加 `alt`）。 |
| `points` / `items` | 否 | 下方带编号（`01`、`02`…）的要点列表；每条可以直接写一句话，也可以写 `title` 和 `text`。 |
