---
title: 组件参考 · stat
navTitle: stat
description: 把 2～4 个关键数字、单位与一句说明并排摆出来。
section: reference
order: 2
badge: stat
---

[← 组件参考](/garden/reference) · [用法：数字指标](/garden/components/stat)

## 示例

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

## 字段写法

````markdown
```garden stat
items:        # 多项时写，建议 2–4 项
  - label:    # 必填，指标名
    value:    # 必填，数字
    unit:     # 可选，单位
    caption:  # 可选，一句说明
    text:     # 可选，补充说明
    source:   # 可选，来源网址
```
````

## 字段

围栏写 ` ```garden stat `（编辑器代码片段触发词 `;gstat`）。多个指标放在 `items` 数组里，单个指标也可以直接把字段写在顶层；YAML 语法错误或顶层含未知键名时整块报 `garden-yaml` 错误。

| 字段 | 是否必填 | 默认值 | 取值与限制 | 说明 |
| :--- | :--- | :--- | :--- | :--- |
| `items` | 多项时必填 | `[顶层对象]` | 对象数组（建议 `2`～`4` 项，不做校验） | 并排展示的指标项列表；省略 `items` 时直接将顶层字段作为单项指标渲染 |
| `label` | 必填 | `""` | 字符串 | 数字上方的指标名称 |
| `value` | 必填 | `""` | 字符串或数字 | 大号等宽字体显示的核心数值 |
| `unit` | 可选 | 无 | 字符串 | 紧跟在 `value` 右侧的单位 |
| `caption` | 可选 | 无 | 字符串 | 数字下方的简短说明 |
| `text` | 可选 | 无 | 字符串 | 补充说明文字 |
| `source` | 可选 | 无 | 网址、`{ url, site?, icon? }` 或数组 | 来源胶囊标签（未填 `site` 时默认取网址去掉 `www.` 后的域名） |

## 限制与报错

- 除通用的 `garden-yaml` 外，本组件没有专属报错代码；表里写「不做校验」的建议值不会报错。
