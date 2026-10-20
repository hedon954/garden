---
title: 组件参考 · chart
navTitle: chart
description: 把一组算好的数字画成比例条形图，下方自带可展开的数据表。
section: reference
order: 5
badge: chart
---

[← 组件参考](/garden/reference) · [用法：条形图表](/garden/components/chart)

## 示例

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

## 字段写法

````markdown
```garden chart
type:       # 可选，只有 bar
title:      # 建议填，标题
data:       # 与 series 二选一
  - x:      # 名称
    y:      # 数值
    label:  # 可选，数值标签
x:          # 配合 series 的标签
series:     # 与 data 二选一
  - name:   # 可选，序列名
    data:   # 数值数组
unit:       # 可选，单位
xLabel:     # 可选，表头第一列
yLabel:     # 可选，表头第二列
caption:    # 可选，图注
```
````

## 字段

围栏写 ` ```garden chart `（编辑器代码片段触发词 `;gchart`）。可以用 `data: [{ x, y, label? }]` 写行数据，也可以用 `x` + `series` 写列数据；YAML 语法错误或顶层含未知键名时整块报 `garden-yaml` 错误。

| 字段 | 是否必填 | 默认值 | 取值与限制 | 说明 |
| :--- | :--- | :--- | :--- | :--- |
| `title` | 建议填写 | 无障碍标签默认 `"图表"`（不渲染可视标题） | 字符串 | 图表上方标题 |
| `data` | 与 `series` 二选一 | `[]` | `{ x, y, label? }[]`（建议至少 `2` 项、以 `2`～`8` 项为宜，不做校验） | 条目数组：`x` 为左侧名称，`y` 为数值，`label` 默认拼接 `y` 与 `unit` |
| `series` | 与 `data` 二选一 | 无 | `{ name?, data: number[] }[]`（建议至少 `2` 个数值点，不做校验） | 配合 `x`（标签数组）使用的数值序列，取 `series[0].data` 渲染条形 |
| `x` | 可选 | `["1", "2", ...]`（按序号递增） | 字符串或字符串数组 | 配合 `series` 时为各项标签数组；单独写字符串且未填 `xLabel` 时作为数据表首列表头 |
| `type` | 可选 | `"bar"` | `"bar"` | 图表类型（水平条形图） |
| `unit` | 可选 | `""` | 字符串 | 未显式填写 `data[].label` 时在数值右侧追加的单位 |
| `xLabel` | 可选 | 字符串 `x` 或 `"项目"` | 字符串 | 可展开数据表第一列的表头 |
| `yLabel` | 可选 | `"数值"` | 字符串 | 可展开数据表第二列的表头 |
| `caption` | 可选 | 无 | 字符串 | 图表底部的图注 |

## 限制与报错

- 除通用的 `garden-yaml` 外，本组件没有专属报错代码；表里写「不做校验」的建议值不会报错。
