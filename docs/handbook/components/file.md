---
title: file · 文件下载与页内预览
description: 用 garden file 在文章里放单个文件或一组附件供读者下载，PDF、表格和文档还能直接在页面右侧拉开抽屉预览。
section: components
order: 10
---

## 什么时候用

当文章附带了压测原始数据（`.csv` / `.json`）、核对清单（`.md`）、配置文件（`.yaml`）或者论文讲义（`.pdf`）时，用 `garden file` 可以生成干净的文件下载卡片。

打包时会自动算出每个文件的大小标在卡片上；而且如果附件是 `.md`、`.pdf`、`.csv`、`.tsv`、`.json`、`.txt` 或图片，卡片上还会多出一个**「预览」**按钮，读者点一下就能直接在页面右侧拉开抽屉看内容，不用跳出当前阅读页。

## 效果与写法

### 单个文件卡片（可直接点右侧「预览」试试）

```garden file
src: ./file/checklist.md
title: 存储引擎上线前压测核对清单
note: 包含故障注入、WAL 恢复与尾延迟水位三项检查表
```

对应的 Markdown 写法：

```yaml
# 代码块开头写：```garden file
src: ./file/checklist.md
title: 存储引擎上线前压测核对清单
note: 包含故障注入、WAL 恢复与尾延迟水位三项检查表
```

### 一组文件列表（`files`）

如果要同时放好几个附件，用 `files` 列表即可（下面两条都可以直接点「预览」查看）：

```garden file
title: 压测原始记录与配置归档
files:
  - src: ./file/bench-summary.csv
    title: 不同压缩算法吞吐与尾延迟汇总表
    note: CSV 原始采样数据（支持抽屉内表格预览）
  - src: ./file/checklist.md
    title: 线上发布前核对清单
    note: Markdown 格式检查项
```

对应的 Markdown 写法：

```yaml
# 代码块开头写：```garden file
title: 压测原始记录与配置归档
files:
  - src: ./file/bench-summary.csv
    title: 不同压缩算法吞吐与尾延迟汇总表
    note: CSV 原始采样数据（支持抽屉内表格预览）
  - src: ./file/checklist.md
    title: 线上发布前核对清单
    note: Markdown 格式检查项
```

## 附件放在哪里

最顺手的做法是建一个**跟当前 Markdown 文章同名的文件夹**，把附件放进去：

- 比如你的文章叫 `content/posts/lsm-bench.md`；
- 就在旁边建一个文件夹 `content/posts/lsm-bench/`，把 `result.csv` 放进去；
- 然后在文章里写 `src: ./lsm-bench/result.csv` 即可。

## 可用字段一览

| 字段名 | 必填 | 说明 |
| :--- | :--- | :--- |
| `src` | 单文件必填 | 单个文件的相对路径（相对当前 Markdown 文件所在目录）或外部 `https://` 链接。 |
| `title` | 否 | 显示在卡片上的中文名称（不填时默认显示文件名）。 |
| `note` | 否 | 文件下方的一句话说明。 |
| `files` | 多文件必填 | 放多个文件时用的列表，里面每一项都可以写 `src`、`title` 和 `note`。 |
