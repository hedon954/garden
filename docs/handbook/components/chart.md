---
title: 条形图表（chart）
navTitle: 条形图表
description: 把一组算好的数字画成比例条形图，下方自带可展开的数据表。
section: components
order: 35
badge: chart
---

```garden chart
title: 三种版面区域的宽度上限
xLabel: 版面区域
yLabel: 最大宽度
unit: px
data:
  - x: 普通正文列
    y: 740
  - x: 宽幅配图区
    y: 1040
  - x: 多列宽表格
    y: 1340
caption: 点击「查看数据表」可展开完整数值表格。
```

- **什么时候用**：一组已经算好的同单位数字，想让读者一眼看出长短比例。
- **什么时候不用**：数字会随读者调整参数而变化时用[可调公式与参数](/garden/components/interactive)；图表下方已经自带可展开的数据表，同一小节里不需要再重复放一张相同数字的表格。

可以这样对 AI 说：

````markdown
```garden
画一张条形图比较普通正文列（740px）、宽幅配图区（1040px）和多列宽表格（1340px）的宽度上限。
```
````

## 字段说明

全部字段、默认值、取值限制和报错代码见 [组件参考 · chart](/garden/reference/chart)。
