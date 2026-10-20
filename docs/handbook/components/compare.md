---
title: 并排对比（compare）
navTitle: 并排对比
description: 把两三种方案左右并列，或把不好的做法与更好的做法上下对照。
section: components
order: 33
badge: compare
---

```garden compare
items:
  - title: 写一句话说明改了什么
    text: 想法块紧跟在完整代码下面，AI 把它换成 diff，页面合成「代码 / 对比上一版」。
  - title: 手写 diff
    text: 完整代码下面紧跟一段 diff。
```

可以这样对 AI 说：

````markdown
```garden
把「用一句话说明改了什么」和「手写 diff」这两种做法并排对比一下。
```
````

如果要对比「不好的做法」和「更好的做法」，AI 会生成带红叉与绿勾的上下对照卡片：

```garden compare
items:
  - title: 不好的提问
    verdict: bad
    text: 「你读过这位作者的其他作品吗？能分享一段书评吗？」
  - title: 更好的提问
    verdict: good
    text: 「你平时喜欢在什么时间读书？想先旁听一次吗？」
```

可以这样对 AI 说：

````markdown
```garden
对比一下问新成员时「不好的提问」和「更好的提问」。
```
````

- **什么时候用**：两三件东西并排看差异，或者把一正一反两种做法放在一起对照。
- **什么时候不用**：每段说明都很长，或者要横向对齐多个参数维度时，直接用列表或表格。
