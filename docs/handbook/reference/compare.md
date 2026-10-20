---
title: 组件参考 · compare
navTitle: compare
description: 把两三种方案左右并列，或把不好的做法与更好的做法上下对照。
section: reference
order: 3
badge: compare
---

[← 组件参考](/garden/reference) · [用法：并排对比](/garden/components/compare)

## 示例

```garden compare
items:
  - title: 写一句话说明改了什么
    text: 想法块紧跟在完整代码下面，AI 把它换成 diff，页面合成「代码 / 对比上一版」。
  - title: 手写 diff
    text: 完整代码下面紧跟一段 diff。
```

```garden compare
items:
  - title: 不好的提问
    verdict: bad
    text: 「你读过这位作者的其他作品吗？能分享一段书评吗？」
  - title: 更好的提问
    verdict: good
    text: 「你平时喜欢在什么时间读书？想先旁听一次吗？」
```

## 字段写法

````markdown
```garden compare
items:        # 必填，建议 2–3 项
  - title:    # 方案名
    text:     # 说明
    verdict:  # 可选，good | bad
    <key>:    # 可选，其他键作标签
```
````

## 字段

围栏写 ` ```garden compare `（编辑器代码片段触发词 `;gcompare`）。YAML 语法错误或顶层含未知键名时整块报 `garden-yaml` 错误。

| 字段 | 是否必填 | 默认值 | 取值与限制 | 说明 |
| :--- | :--- | :--- | :--- | :--- |
| `items` | 必填 | `[]` | 数组（建议至少 `2` 项、并排模式建议 `2`～`3` 项，不做校验） | 对比项列表；每项可写对象，也可写一行 `"标题：说明"` 字符串 |
| `items[].title` | 建议填写 | `""`（单行字符串写法取冒号前半段） | 字符串 | 对比项小标题 |
| `items[].text` | 建议填写 | `[]` | 字符串或字符串数组；并排模式下单格正文与附加字段合起来不超过 `60` 字，超出报 `compare-long` 错误 | 对比项说明；单行 `"标题：说明"` 写法下只计冒号后半段字数 |
| `items[].verdict` | 可选 | 无（默认左右并排） | `"good"` \| `"bad"` | 标为推荐做法（绿勾）或不推荐做法（红叉）；任一项带 `verdict` 时整组改为上下堆叠，且不受 `60` 字 `compare-long` 限制 |
| `items[].<其他键>` | 可选 | 无 | 字符串或数字（并排模式下字符串值计入单格 `60` 字上限，超出报 `compare-long` 错误） | 并排模式下，除 `title`、`text`、`verdict` 外的其他键值对会在卡片底部渲染为属性标签 |

## 限制与报错

- `compare-long`：并排模式下，某一格的 `text` 和其他字符串字段合起来超过 60 字。这一格改回原文的列表或段落。
- 任一项带 `verdict: good | bad` 时整组上下堆叠，不检查 60 字。
