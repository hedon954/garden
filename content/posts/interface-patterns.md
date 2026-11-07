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

```garden compose
<figure frame="none"><relations caption="四个环节互相提供信息，而不是按固定顺序走一遍。"><entity title="选书"><text>定下这个月读什么</text></entity><entity title="共读"><text>每周读完约定的章节</text></entity><entity title="讨论"><text>见面聊各自的看法</text></entity><entity title="复盘"><text>记下下次要改的地方</text></entity><edge from={1} to={2}/><edge from={2} to={3}/><edge from={3} to={4}/><edge from={4} to={1}/><edge from={3} to={1} style="dashed" label="影响选书"/><edge from={2} to={4} style="dashed"/></relations></figure>
```

读书会里也有不成圈的关系。组织者一个人牵着成员、场地和书单：

```garden compose
<figure frame="none"><relations caption="组织者连着其余三个；成员和书单互相影响。" center="组织者"><entity title="组织者"><text>每月发一次通知</text></entity><entity title="成员"><text>八到十个邻居</text></entity><entity title="场地"><text>咖啡馆或图书馆</text></entity><entity title="书单"><text>大家轮流提名</text></entity><edge from={1} to={2} label="邀请"/><edge from={1} to={3} label="预约"/><edge from={1} to={4} label="汇总"/><edge from={2} to={4} style="dashed" direction="both" label="提名"/></relations></figure>
```

## 想来的人会先做什么

报名之前，一位新成员通常会这样做：

```garden compose
<figure frame="none"><icon-list><entry icon="search"><text>搜索这个月的书名</text></entry><entry icon="eye"><text>看了 3 篇书评</text></entry><entry icon="heart"><text>收藏了活动页面</text></entry><entry icon="chat"><text>在群里问能不能只听不说</text></entry></icon-list></figure>
```

这说明他有兴趣，但还在担心要不要发言。

## 换一种方式提问

维基百科的 [Book discussion club](https://en.wikipedia.org/wiki/Book_discussion_club) 词条提到，读书会的形式和规模差别很大。[wikipedia.org](https://en.wikipedia.org/wiki/Book_discussion_club){source}

问新成员的问题，也决定了他敢不敢来：

```garden compose
<figure frame="none"><compare><item verdict="bad"><title>不好的提问</title><text>「你读过这位作者的其他作品吗？能分享一段书评吗？」</text></item><item verdict="good"><title>更好的提问</title><text>「你平时喜欢在什么时间读书？想先旁听一次吗？」</text></item></compare></figure>
```

## 让大家选场地

与其问「你能接受多远的场地」，不如直接给出两个真实的选项：

```garden compose
<figure frame="none"><choices title="下个月在哪里见面？" caption="示意交互，场地和价格均为虚构。"><choice-option icon="idea" value="¥40 / 人" label="更看重氛围" reply="选了咖啡馆。我们会提前订好靠窗的长桌。"><text>街角咖啡馆，含一杯饮料</text></choice-option><choice-option icon="book" value="免费" label="更看重安静" reply="选了图书馆。我们会在月初提交预约。"><text>社区图书馆活动室，需提前预约</text></choice-option><choice-option none label="都不合适 / 说不清" reply="没关系，我们会在群里再列几个场地。"/></choices></figure>
```

## 可以参考的公开工具

```garden compose
<figure frame="none"><resources><resource title="Open Library：每本书一个页面" image="/images/compose-resources/resource-015b41eb0f32.svg" alt="一本合上的书" takeaway="**可借鉴：** 选书时直接贴书的页面链接，大家看到的是同一个版本。" href="https://openlibrary.org/"><text>Internet Archive 维护的开放图书目录，可以查版本、借阅电子书。</text><reference href="https://openlibrary.org/"/></resource><resource title="Project Gutenberg：公版电子书" image="/images/compose-resources/resource-fd51121b5e8c.svg" alt="一盏台灯" takeaway="**可借鉴：** 偶尔选一本公版书，没买书的人也能马上加入。" href="https://www.gutenberg.org/"><text>收录已进入公有领域的电子书，可以免费下载。</text><reference href="https://www.gutenberg.org/"/><reference href="https://en.wikipedia.org/wiki/Project_Gutenberg"/></resource><resource title="维基百科：读书会词条" image="/images/compose-resources/resource-ecee6b47f015.svg" alt="书架上的三本书" takeaway="**可借鉴：** 线上和线下可以并存，不必只选一种。" href="https://en.wikipedia.org/wiki/Book_discussion_club"><text>介绍读书会的常见形式，从线下聚会到线上讨论。</text><reference href="https://en.wikipedia.org/wiki/Book_discussion_club"/></resource></resources></figure>
```

## 先做三个小实验

```garden compose
<figure frame="none"><icon-list><entry icon="flask" title="实验一：一个月读一本是不是太多？"><text>前两次活动分别选一本中篇和一本长篇，记录每个人读完的比例。</text><text>读完比例明显下降时，下次改成只读前半本。</text></entry><entry icon="chat" title="实验二：怎样让第一次来的人开口？"><text>一半活动先轮流说一句话，另一半直接自由讨论。</text><text>比较第一次来的人发言的次数。</text></entry><entry icon="bell" title="实验三：提醒要提前几天发？"><text>分别在活动前三天和前一天发提醒，看到场人数有没有差别。</text></entry></icon-list></figure>
```

三个实验是递进的：先确认节奏，再确认气氛，最后确认通知。
