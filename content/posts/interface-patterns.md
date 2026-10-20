---
title: 界面模式样张：办一个小读书会
description: 用一个虚构的社区读书会，把关系图、图标列表、好坏对比、选择卡、资源卡和图标步骤放在同一篇里。
date: 2026-10-20
draft: true
tags:
  - Garden
  - Intelligent UI
---

这是一篇组件样张。故事是虚构的：几个邻居想办一个每月一次的读书会。每一节用一种组件。

## 读书会是一个循环

选书、共读、讨论、复盘不是一次走完的流程，复盘的结论会改写下一次选书。

```garden relations
items:
  - title: 选书
    text: 定下这个月读什么
  - title: 共读
    text: 每周读完约定的章节
  - title: 讨论
    text: 见面聊各自的看法
  - title: 复盘
    text: 记下下次要改的地方
links:
  - from: 1
    to: 2
  - from: 2
    to: 3
  - from: 3
    to: 4
  - from: 4
    to: 1
  - from: 3
    to: 1
    style: dashed
    label: 影响选书
  - from: 2
    to: 4
    style: dashed
caption: 四个环节互相提供信息，而不是按固定顺序走一遍。
```

读书会里也有不成圈的关系。组织者一个人牵着成员、场地和书单：

```garden relations
items:
  - title: 组织者
    text: 每月发一次通知
  - title: 成员
    text: 八到十个邻居
  - title: 场地
    text: 咖啡馆或图书馆
  - title: 书单
    text: 大家轮流提名
links:
  - from: 1
    to: 2
    label: 邀请
  - from: 1
    to: 3
    label: 预约
  - from: 1
    to: 4
    label: 汇总
  - from: 2
    to: 4
    style: dashed
    direction: both
    label: 提名
caption: 组织者连着其余三个；成员和书单互相影响。
```

## 想来的人会先做什么

报名之前，一位新成员通常会这样做：

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

这说明他有兴趣，但还在担心要不要发言。

## 换一种方式提问

维基百科的 [Book discussion club](https://en.wikipedia.org/wiki/Book_discussion_club) 词条提到，读书会的形式和规模差别很大。[wikipedia.org](https://en.wikipedia.org/wiki/Book_discussion_club){source}

问新成员的问题，也决定了他敢不敢来：

```garden compare
items:
  - title: 不好的提问
    verdict: bad
    text: 「你读过这位作者的其他作品吗？能分享一段书评吗？」
  - title: 更好的提问
    verdict: good
    text: 「你平时喜欢在什么时间读书？想先旁听一次吗？」
```

## 让大家选场地

与其问「你能接受多远的场地」，不如直接给出两个真实的选项：

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

## 可以参考的公开工具

```garden card
cards:
  - url: https://openlibrary.org/
    title: Open Library：每本书一个页面
    description: Internet Archive 维护的开放图书目录，可以查版本、借阅电子书。
    image: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 132 132'%3E%3Crect width='132' height='132' fill='%23F0EEE6'/%3E%3Crect x='34' y='26' width='64' height='84' rx='6' fill='%23C9B79C'/%3E%3Crect x='34' y='26' width='10' height='84' fill='%238B6A45'/%3E%3Crect x='52' y='44' width='34' height='5' rx='2' fill='%23FAF9F5'/%3E%3Crect x='52' y='54' width='24' height='5' rx='2' fill='%23FAF9F5'/%3E%3C/svg%3E"
    alt: 一本合上的书
    source:
      - https://openlibrary.org/
    takeaway: "**可借鉴：** 选书时直接贴书的页面链接，大家看到的是同一个版本。"
  - url: https://www.gutenberg.org/
    title: Project Gutenberg：公版电子书
    description: 收录已进入公有领域的电子书，可以免费下载。
    image: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 132 132'%3E%3Crect width='132' height='132' fill='%23E8EEF0'/%3E%3Ccircle cx='66' cy='60' r='30' fill='%239DB7A8'/%3E%3Crect x='30' y='98' width='72' height='8' rx='4' fill='%233F6B55'/%3E%3Crect x='44' y='112' width='44' height='6' rx='3' fill='%239DB7A8'/%3E%3C/svg%3E"
    alt: 一盏台灯
    source:
      - https://www.gutenberg.org/
      - https://en.wikipedia.org/wiki/Project_Gutenberg
    takeaway: "**可借鉴：** 偶尔选一本公版书，没买书的人也能马上加入。"
  - url: https://en.wikipedia.org/wiki/Book_discussion_club
    title: 维基百科：读书会词条
    description: 介绍读书会的常见形式，从线下聚会到线上讨论。
    image: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 132 132'%3E%3Crect width='132' height='132' fill='%23F3ECE4'/%3E%3Crect x='22' y='34' width='26' height='70' rx='4' fill='%23D9A88B'/%3E%3Crect x='53' y='24' width='26' height='80' rx='4' fill='%237A4A33'/%3E%3Crect x='84' y='42' width='26' height='62' rx='4' fill='%23D9A88B'/%3E%3Crect x='16' y='104' width='100' height='6' rx='3' fill='%237A4A33'/%3E%3C/svg%3E"
    alt: 书架上的三本书
    source:
      - https://en.wikipedia.org/wiki/Book_discussion_club
    takeaway: "**可借鉴：** 线上和线下可以并存，不必只选一种。"
```

## 先做三个小实验

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

三个实验是递进的：先确认节奏，再确认气氛，最后确认通知。
