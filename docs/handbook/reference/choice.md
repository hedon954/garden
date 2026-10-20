---
title: 组件参考 · choice
navTitle: choice
description: 给出两三个具体选项卡片，读者点选后看到对应的回应。
section: reference
order: 12
badge: choice
---

[← 组件参考](/garden/reference) · [用法：选择卡](/garden/components/choice)

## 示例

```garden choice
title: 下个月在哪里见面？
items:
  - icon: idea
    value: ¥40 / 人
    text: 街角咖啡馆，含一杯饮料
    label: 更看重氛围
    reply: 选了咖啡馆。我们会提前订好靠窗的长桌。
  - icon: book
    value: 免费
    text: 社区图书馆活动室，需提前预约
    label: 更看重安静
    reply: 选了图书馆。我们会在月初提交预约。
none:
  label: 都不合适 / 说不清
  reply: 没关系，我们会在群里再列几个场地。
caption: 示意交互，场地和价格均为虚构。
```

## 字段写法

````markdown
```garden choice
title:      # 可选，问题
items:      # 必填，建议 2–3 项
  - icon:   # 可选，23 个图标名之一
    value:  # 建议填，醒目数字
    text:   # 建议填，一句说明
    label:  # 可选，偏好标签
    reply:  # 可选，选中后的回应
none:       # 可选，兜底按钮
  label:    # 按钮文字
  reply:    # 可选，回应
caption:    # 可选，图注
```
````

## 字段

围栏写 ` ```garden choice `（编辑器代码片段触发词 `;gchoice`）。整组作为无障碍单选组（`role="radiogroup"`）渲染，支持键盘方向键切换；桌面端并排排列，窄屏下自动改为单列纵向堆叠。YAML 语法错误或顶层含未知键名时整块报 `garden-yaml` 错误。

| 字段 | 是否必填 | 默认值 | 取值与限制 | 说明 |
| :--- | :--- | :--- | :--- | :--- |
| `title` | 可选 | `""` | 字符串 | 选项卡片上方的问题或标题 |
| `items` | 必填 | `[]` | 对象数组（建议 `2`～`3` 项，不做校验） | 选项卡片列表 |
| `items[].icon` | 可选 | 无（不绘制图标） | 23 个内置图标名之一 | 卡片顶部的线条图标（与 `garden list` 共用同一套 23 个图标名） |
| `items[].value` | 建议填写 | 无 | 字符串或数字 | 卡片上醒目显示的价格、数字或短结论 |
| `items[].text` | 建议填写 | 无 | 字符串 | 选项的一句话说明 |
| `items[].label` | 可选 | 无 | 字符串 | 卡片底部带圆点的偏好标签（如「更看重氛围」） |
| `items[].reply` | 可选 | `""` | 字符串 | 点选该卡片后在整组下方展开的回应文字 |
| `none` | 可选 | 无 | `{ label: string, reply?: string }` | 卡片下方整行宽度的兜底文字按钮（如「都不合适 / 说不清」）及选中后的回应 |
| `caption` | 可选 | 无 | 字符串 | 组件底部的图注 |

## 限制与报错

- 除通用的 `garden-yaml` 外，本组件没有专属报错代码；表里写「不做校验」的建议值不会报错。
