---
name: garden-post-review
description: >-
  Reviews one specified Garden post in three steps: fix script-reported
  structure errors, fix widgets with the chart skill, then suggest prose
  improvements without editing. Use when the user asks to 审查 / 审稿 /
  review a Garden blog post.
---

# 审查一篇 Garden 博文

只审用户点名的稿。三步按顺序做，后一步看到的是前一步改完的稿。

硬性检查命令（在站点根目录）：

```bash
npx garden check content/posts/路径.md
```

stdout 是 JSON。`ok` 为 true 才算通过。不要自己再查一遍标题、日期或参考列表。

## 1. 脚本报错，模型只修这些

运行 `garden check`。有 `errors` 就只改这些条目，改完再跑同一条命令，直到 `ok` 为 true。

- 只动报错指出的位置。
- 脚本没报的结构问题不要顺手改。
- `references` 是推荐额外阅读，不必和正文里的外链一一对应。不要因为正文有链接就补进表，也不要因为表里的材料正文没提到就删掉。
- `reference-heading`：把 `## 参考` / `## 参考资料` 收进 `references`，删掉这个标题。`## 参考文献` 留在正文里。
- 缺 widget 文件时，只修正写错的 `src`。不要在这一步新做图表。

## 2. 图表按图表 skill 审并修

这一步只在稿里有 `widget` 时做。先读 [garden-interactive-chart](../garden-interactive-chart/SKILL.md)。

可以改同名目录里的 HTML，以及对应围栏的 `caption`。周围正文不动。`caption` 必须是一句判断。

改完再跑一次 `garden check`，直到通过。

没有 `widget` 就跳过这一步。

## 3. 通读整篇，只出建议

`garden check` 已经通过，并且图表该改的已经改完。通读全文。不要改文件。

目标只有一个：这篇是不是从第一性原理出发，自洽，并且把一个点讲到闭环。读者读完应能说出这是什么、为什么必然如此，以及这个「为什么」怎样落到一段实践上。实践是代码、故障、测量或一次推导的落地，用来验证同一条链，不是另起一篇教程。

第一性原理指：从拆不开的事实、约束或不变量推上去，而不是从「别人都这么做」或一个比喻出发。拆完还要装回去；只列出现有方案的洞、没有推出结论，不算讲完。类比和业界做法可以出现，但只能当作这条推导的对照，不能代替推导。

只在下面的情况写出建议：

- 开头站在名词、惯例或比喻上，读者看不到这件事被什么事实卡住
- 后文的机制、术语或结论，不能从前面的事实推出来，或同一个词前后不是同一个意思
- 一个点只停在「是什么」：没有为什么，或者为什么没有落到可核对的实践
- 实践和前面的原理各讲各的，对不上同一条链
- 铺开多个相邻话题，没有把其中一点收回来。讲透一个点，好过点到许多点
- 数字、比较、「通常如此」没有从推导、实践或来源里长出来

每条建议包含：所在标题、闭环断在哪里、可以怎么补。没有就写没有。不要把稿子改成「问题—方案」模板，也不要要求每段都加不适用说明。译文若已经在复述原文的推导，不要另要求作者发明一套练习。

这一步禁止修改博文、图表和 front matter。
