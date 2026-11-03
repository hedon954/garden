---
title: 说明图（compose）
navTitle: 说明图
description: 用卡片、箭头和注释讲清一条流程。点一步，下面展开对应说明。
section: components
order: 36
badge: compose
---

```garden compose
title: 站点发布流水线
caption: 点一步，看这一步做什么
intent: |
  用三张卡加向下箭头讲清 sync → build → validate；读者点每一步，下面展开对应说明。
steps:
  - id: sync
    title: sync
    badge: "1"
    text: 同步内容与配置
  - id: build
    title: build
    badge: "2"
    text: 生成静态 HTML
  - id: validate
    title: validate
    badge: "3"
    text: 检查后再上线
notes:
  - for: sync
    text: 先对齐远程与本地材料。
  - for: build
    text: 构建期把 compose 画进页面。
  - for: validate
    text: 钩子拦住还没编译的想法。
```

- **什么时候用**：两三步到八步的流程，读者点哪一步就看哪一步的说明。
- **什么时候不用**：要拖参数时用 [interactive](/garden/components/interactive)。一张真图或 Mermaid 已经够用时，不要再包一层。

编辑器里输入 `/garden`，选「compose（想法）」。插入的是 `garden compose` 围栏加一句白话，不是一大段 YAML。对 AI 说「编译这篇」之后，围栏类型不变，原话留在 `intent`，正文写成 YAML 树。

````markdown
```garden compose
用三张卡加向下箭头讲清 sync → build → validate；读者点每一步，下面展开对应说明。
```
````

窄屏收成一列。颜色走主题变量，浅色和深色都能读。不打开 JavaScript 时，卡片和说明仍在页面里。

全部字段见 [组件参考 · compose](/garden/reference/compose)。下面每段都是一张能单独看的小图。窄屏会把横排收成一列。

## 浅底、胶囊、无框

```garden compose
intent: |
  三种框：浅底通栏、白底胶囊、无框标题。
tree:
  - stack:
      align: center
      children:
        - card:
            frame: band
            tone: accent
            align: center
            title: 浅底通栏
            text: 只包住要强调的那一层
        - arrow: down
        - card:
            frame: pill
            align: center
            title: 白底胶囊
        - arrow: down
        - card:
            frame: text
            align: center
            title: 无框标题
            text: 标题下面可以跟一句灰字
```

## 一行和向右箭头

```garden compose
intent: |
  三个白卡用向右箭头连成一行。
tree:
  - row:
      align: center
      children:
        - card:
            align: center
            title: 收集
            text: 先把材料放齐
        - arrow: right
        - card:
            align: center
            title: 判断
            text: 留下有用的
        - arrow: right
        - card:
            align: center
            title: 交付
            text: 交给下一个人
```

## 徽标和指标

```garden compose
intent: |
  一张卡上同时放序号徽标和一个指标。
tree:
  - card:
      tone: accent
      align: center
      title: 对齐
      badge: "1"
      kpi:
        value: 12
        unit: ms
        label: 耗时
      text: 徽标和数字都写在卡片上
```

## 分隔线

```garden compose
intent: |
  上下两行标题，中间一条分隔线，下面一行脚注。
tree:
  - title:
      text: 上面这一步
      align: center
  - divider:
  - title:
      text: 下面这一步
      align: center
  - type: text
    text: 脚注靠左，用 muted。
    tone: muted
    align: start
```

## 并排的箭头

```garden compose
intent: |
  一个标题下面散开三根箭头，接到三个名字。
tree:
  - stack:
      align: center
      children:
        - title:
            text: 从一个点散开
            align: center
        - fan: 3
        - row:
            align: center
            children:
              - title:
                  text: 甲
                  align: center
              - title:
                  text: 乙
                  align: center
              - title:
                  text: 丙
                  align: center
```

## V 形连接

```garden compose
intent: |
  两列标题收到同一句说明上。
tree:
  - row:
      align: center
      children:
        - title:
            text: 左支
            align: center
        - title:
            text: 右支
            align: center
  - join: 两支收到这里
```

## 两种强调色

```garden compose
intent: |
  accent 和 tip 是两种浅底。muted 胶囊是中性灰。
tree:
  - row:
      align: center
      children:
        - card:
            frame: band
            tone: accent
            align: center
            title: accent
            text: 第一种强调
        - card:
            frame: band
            tone: tip
            align: center
            title: tip
            text: 第二种强调
        - card:
            frame: pill
            tone: muted
            align: center
            title: muted
```

## 泳道

```garden compose
intent: |
  两个角色之间一来一回。字写在箭头上方。
tree:
  - lanes:
      actors:
        - 调用方
        - 服务
      messages:
        - from: 1
          to: 2
          text: 发出请求
          tone: forward
        - from: 2
          to: 1
          text: 返回结果
          tone: back
```

## 对照和提示

```garden compose
intent: |
  图里可以放一块对照，再加一条提示。
tree:
  - compare:
      items:
        - title: 先写下来
          text: 范围小，改起来便宜
        - title: 先做完整
          text: 一次看到全貌
  - callout:
      tone: tip
      text: 对照只说明差别，不代替正文。
```
