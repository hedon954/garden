---
title: 图标列表（list）
navTitle: 图标列表
description: 用线条图标配短句列出几条并列动作，或带小标题列出分步做法。
section: components
order: 41
badge: list
---

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

- **什么时候用**：几条并列的行为、信号或做法，每条配一个线条图标；或者带小标题与分段说明的做法列表。
- **什么时候不用**：只是一组带编号的先后顺序时用普通有序列表；按时间演进的节点用[时间线](/garden/components/timeline)。

可以这样对 AI 说：

````markdown
```garden
把新成员报名前常做的四件事列成带图标的列表：搜书名、看书评、收藏页面、在群里问能不能只听不说。
```
````

## 带小标题的分段步骤列表

当任一条目包含 `title` 时，组件自动切换为带分隔线的步骤列表，`text` 可以写多段说明：

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

可以这样对 AI 说：

````markdown
```garden
把这三个小实验列成带图标和小标题的步骤：确认阅读量、让新成员开口、测试提前几天发提醒。
```
````

## 字段说明

全部字段、默认值、取值限制和报错代码见 [组件参考 · list](/garden/reference/list)。
