---
title: 图标列表（list）
navTitle: 图标列表
description: 用线条图标配短句列出并列信号，或带小标题与分段说明列出分步做法。
section: components
order: 41
badge: list
---

`garden list` 有两种排法：条目里只写 `icon` 和 `text` 时，渲染成紧凑的图标列表卡片；任一条目带 `title` 时，渲染成带分隔线的步骤或做法列表，每条的 `text` 可以是一句字符串或几段字符串数组。

在 `garden` 想法块里写一句「用 `list` 列出新成员报名前的四个动作，配搜索、浏览、收藏和提问图标」，Agent 会按 `garden-ui` skill 生成下面的紧凑图标列表（手写格式附后）。

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

````markdown
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
````

条目加上 `title` 后，变成带分隔线的分项说明，`text` 可以写成多段列表：

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

````markdown
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
````

- **用**：几条并列的行为、信号或做法，每条配一个线条图标；带标题时每条可以写几段说明。
- **别用**：条目之间有严格先后顺序或需要编号时，用普通有序列表或 `timeline`。

| 字段 | 必填 | 类型 | 说明 |
| :--- | :--- | :--- | :--- |
| `title` | 否 | 字符串 | 列表顶部的总标题 |
| `items` | 是 | 数组 | 条目列表；全不带 `title` 时为紧凑图标列表，任一项带 `title` 时为带分隔线的分项列表 |
| `items[].icon` | 否 | 字符串 | 线条图标名（未知名字不画图标，可用名字见下） |
| `items[].title` | 否 | 字符串 | 条目小标题；填写后切换为分隔线列表样式 |
| `items[].text` | 建议 | 字符串或字符串数组 | 条目说明文字；数组每一项渲染为独立段落 |
| `caption` | 否 | 字符串 | 列表底部的说明小字 |

**可用的 `icon` 名字（共 23 个）**：`search`、`eye`、`heart`、`chat`、`shield`、`wallet`、`bell`、`check`、`x`、`star`、`flag`、`clock`、`idea`、`book`、`link`、`user`、`chart`、`gear`、`file`、`pin`、`flask`、`target`、`question`。
