---
title: 数字指标（stat）
navTitle: 数字指标
description: 把 2～4 个关键数字、单位与一句说明并排摆出来。
section: components
order: 32
badge: stat
---

```garden stat
items:
  - label: 正文列宽
    value: "740"
    unit: px
    caption: 默认阅读列宽度
  - label: 宽图上限
    value: "1040"
    unit: px
    caption: 左右各最多向外延伸 150px
  - label: 宽表上限
    value: "1340"
    unit: px
    caption: 左右各最多向外延伸 300px
```

- **什么时候用**：把分散在段落里的两到四个关键数字、阈值或规格并排展示。
- **什么时候不用**：只有一个数字时留在正文句子里；数字会随读者选择变化时让 AI 做成[可调公式与参数](/garden/components/interactive)；有多行多列维度时直接用表格。

可以这样对 AI 说：

````markdown
```garden
把正文列宽 740px、宽图上限 1040px 和宽表上限 1340px 三个数字并排摆出来。
```
````

## 字段说明

围栏写 ` ```garden stat `（编辑器代码片段触发词 `;gstat`）。多个指标放在 `items` 数组里；单个指标也可以直接把字段写在顶层。

| 字段 | 是否必填 | 默认值 | 取值与限制 | 说明 |
| :--- | :--- | :--- | :--- | :--- |
| `items` | 多项时必填 | `[顶层对象]` | 对象数组（建议 `2`～`4` 项；顶层写未知键名或 YAML 格式错误时报 `garden-yaml` 错误） | 并排展示的指标项列表；省略 `items` 时直接将顶层字段作为单项指标渲染 |
| `label` | 必填 | `""` | 字符串 | 数字上方的指标名称 |
| `value` | 必填 | `""` | 字符串或数字 | 大号等宽字体显示的核心数值 |
| `unit` | 可选 | 无 | 字符串 | 紧跟在 `value` 右侧的单位 |
| `caption` | 可选 | 无 | 字符串 | 数字下方的简短说明 |
| `text` | 可选 | 无 | 字符串 | 补充说明文字 |
| `source` | 可选 | 无 | 网址、`{ url, site?, icon? }` 或数组 | 来源胶囊标签（未填 `site` 时默认取网址去掉 `www.` 后的域名） |
