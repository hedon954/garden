---
title: 组件参考 · list
navTitle: list
description: 用线条图标配短句列出几条并列动作，或带小标题列出分步做法。
section: reference
order: 11
badge: list
---

[← 组件参考](/garden/reference) · [用法：图标列表](/garden/components/list)

## 示例

```garden list
items:
  - icon: search
    text: 搜索这个月的书名
  - icon: eye
    text: 看了 3 篇书评
  - icon: heart
    text: 收藏了活动页面
  - icon: chat
    text: 在群里问能不能只听不说
```

```garden list
items:
  - icon: flask
    title: 实验一：一个月读一本是不是太多？
    text:
      - 前两次活动分别选一本中篇和一本长篇，记录每个人读完的比例。
      - 读完比例明显下降时，下次改成只读前半本。
  - icon: chat
    title: 实验二：怎样让第一次来的人开口？
    text:
      - 一半活动先轮流说一句话，另一半直接自由讨论。
      - 比较第一次来的人发言的次数。
  - icon: bell
    title: 实验三：提醒要提前几天发？
    text:
      - 分别在活动前三天和前一天发提醒，看到场人数有没有差别。
```

## 字段写法

````markdown
```garden list
title:      # 可选，总标题
items:      # 必填，列表项
  - icon:   # 可选，23 个图标名之一
    title:  # 可选，写了就变步骤列表
    text:   # 建议填，说明
caption:    # 可选，图注
```
````

## 字段

围栏写 ` ```garden list `（编辑器代码片段触发词 `;glist`）。YAML 语法错误或顶层含未知键名时整块报 `garden-yaml` 错误。

| 字段 | 是否必填 | 默认值 | 取值与限制 | 说明 |
| :--- | :--- | :--- | :--- | :--- |
| `title` | 可选 | 无 | 字符串 | 列表上方的总标题 |
| `items` | 必填 | `[]` | 对象或字符串数组 | 列表项；所有条目都不带 `title` 时渲染为紧凑图标卡片，任一条目带 `title` 时渲染为带分隔线的步骤列表 |
| `items[].icon` | 可选 | 无（不绘制图标） | 23 个内置图标名之一：`search`、`eye`、`heart`、`chat`、`shield`、`wallet`、`bell`、`check`、`x`、`star`、`flag`、`clock`、`idea`、`book`、`link`、`user`、`chart`、`gear`、`file`、`pin`、`flask`、`target`、`question` | 线条图标名（未识别的名称不显示图标） |
| `items[].title` | 可选 | 无（默认紧凑行模式） | 字符串 | 条目小标题；填写后整组切换为带分隔线的步骤布局 |
| `items[].text` | 建议填写 | `[]` | 字符串或字符串数组 | 条目说明文字；写成数组时每个元素渲染为独立段落 |
| `caption` | 可选 | 无 | 字符串 | 列表底部的图注 |

## 限制与报错

- 除通用的 `garden-yaml` 外，本组件没有专属报错代码；表里写「不做校验」的建议值不会报错。
