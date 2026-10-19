# Garden 块模板

从这里复制。触发词和 VS Code 片段、macOS 文本替换是同一份目录生成的。

## 想法 · 想法

还不确定用哪个组件时，写一句想让读者看出什么。

不该用：发布前必须编译掉。草稿里可以留着。

```garden
让读者……；想让读者看出……
```

## card · 资源卡

一篇论文、一个仓库或一本书，读者需要标题、链接和一句说明。

不该用：正文里已经有这句话时，不要再包一张卡。

```garden card
url: https://arxiv.org/abs/2309.06180
title: PagedAttention
description: vLLM 的分页 KV 管理。
```

## stat · 指标

一个短指标：标签、数字、可选的一句说明和来源。

不该用：数字需要读者自己代入参数时，写成想法，不要做静态指标。

```garden stat
items:
  - label: Llama-2-13B · 4K 上下文
    value: 3.2
    unit: GiB
    source: https://arxiv.org/abs/2309.06180
```

## compare · 对比

两三件东西并排，每格约 60 字以内。原文是「X：Y」列表时，每格写成一行带引号的「X：Y」。

不该用：任何一格超过约 60 字时，用原文的列表，不要并排。

```garden compare
items:
  - title: 自旋锁
    text: 临界区极短时忙等，不进入休眠。
  - title: 互斥锁
    text: 争用久就休眠，避免空转占满 CPU。
```

## timeline · 时间线

版本演进或一段历史，每条有日期和一句说明。

不该用：没有时间顺序时，用普通列表。

```garden timeline
items:
  - date: 2015
    title: 并发标记
    text: 暂停时间降下来。
  - date: 2017
    title: 栈重扫移出 STW
    text: 停顿通常低于 100 微秒。
  - date: 2022
    title: 软内存上限
    text: 运行时可以设 GOMEMLIMIT。
```

## chart · 图表

一组已经算好的数字，读者不需要拧参数。

不该用：数字会随读者的选择变化时，写成想法，编译成 interactive。

```garden chart
type: bar
title: 示例延迟
x: 方案
series:
  - name: 延迟
    data: [120, 85]
unit: ms
```

## figure · 结构图

一张结构图，读者点一个部分就看到对应的一句说明。

不该用：作者已经用 mermaid 画了整张流程时，保留 mermaid，不要拆开重画。

```garden figure
image: ./figure.svg
parts:
  - name: 全部
    text: 整张图。
  - name: 标记
    text: 这一步只做标记。
```

## html · 自定义 HTML

目录里的组件画不出来的示意图或小工具，写在同名目录的 HTML 里。

不该用：能用 card、chart、figure 或正文说清时，不要写 HTML。

```garden html
src: ./demo.html
title: 示意图
```

## interactive · 交互

读者需要拧参数或翻状态才能看懂，由想法编译而来。

不该用：一次乘法、把散文切成步骤，都不要做成交互。

```garden interactive #kv-memory
caption: 显存与 batch、序列长度都成正比。
intent: |
  让读者拧 batch，看 KV 显存。
---
<State batch={1} />
```

## file · 文件

给读者一份可以下载的文件：规格包、PDF、示例代码。Markdown、HTML、PDF 还能在页面里预览。

不该用：只是引用一个网页时用 card；要在正文里直接展示的图表或页面用 html。

```garden file
src: ./post-name/spec.zip
note: 一句话说明里面有什么
```
