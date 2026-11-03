---
title: 组件参考 · figure
navTitle: figure
description: 已废弃。旧的 garden figure 字段仍列在这里。新的说明图写 compose。
section: reference
order: 13
badge: figure
---

[← 组件参考](/garden/reference) · [用法：分区结构图](/garden/components/figure)

## 已废弃

新的说明图写 [compose](/garden/reference/compose)。这一页只记录旧字段。不要再写新的 `garden figure`。

## 字段写法

````markdown
```garden figure
svg: |      # 三选一，内联 SVG
image:      # 三选一，图片路径
mermaid: |  # 三选一，Mermaid 源码
alt:        # 可选，图片替代文本
parts:      # 可选，切换按钮
  - id:     # 对应 data-p
    label:  # 必填，按钮文字（或 name）
    text:   # 必填，说明
caption:    # 可选，图注
```
````

## 字段

围栏写 ` ```garden figure `（编辑器代码片段触发词 `;gfigure`）。YAML 语法错误或顶层含未知键名时整块报 `garden-yaml` 错误。

| 字段 | 是否必填 | 默认值 | 取值与限制 | 说明 |
| :--- | :--- | :--- | :--- | :--- |
| `svg` | 与 `image`、`mermaid` 三选一 | `---` 分隔线下的 `<svg>` 正文或 `""` | 多行 `<svg>` 字符串 | 内联 SVG 源码；在需要随按钮高亮的图形元素上标注 `data-p="<id>"`（颜色建议使用 `var(--card)`、`var(--ink)`、`var(--muted)` 等主题变量以适配深色模式） |
| `image` | 与 `svg`、`mermaid` 三选一 | 无 | 图片路径字符串 | 静态结构图路径 |
| `alt` | 可选 | 同 `caption`（再回退为 `""`） | 字符串 | `image` 的替代文本 |
| `mermaid` | 与 `svg`、`image` 三选一 | 无 | 多行字符串 | Mermaid 图源码 |
| `parts` | 可选 | `[]`（初始选中项默认 `parts[0].id` 或 `"all"`） | 对象数组 | 图上方的切换按钮与图下方的对应说明 |
| `parts[].id` | 建议填写 | 同 `parts[].name` 或 `parts[].label` | 字符串 | 对应 SVG 元素上的 `data-p` 标识（写 `"all"` 或 `"全部"` 时高亮全部区域） |
| `parts[].label` | 必填（或写 `name`） | `"部分 N"`（按序号生成） | 字符串 | 切换按钮上显示的文字 |
| `parts[].text` | 必填 | `""` | 字符串 | 选中该按钮时在图下方显示的说明文字 |
| `caption` | 可选 | 无 | 字符串 | 图框底部的图注 |

## 限制与报错

- 除通用的 `garden-yaml` 外，本组件没有专属报错代码；表里写「不做校验」的建议值不会报错。
