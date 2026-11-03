---
title: 组件参考 · compose
navTitle: compose
description: 用 YAML 树画一张说明图。卡片、箭头和注释在构建期变成静态 HTML。
section: reference
order: 6
badge: compose
---

[← 组件参考](/garden/reference) · [用法：说明图](/garden/components/compose)

## 示例

```garden compose
title: 站点发布流水线
caption: 三步串起来，点哪步看哪步
intent: |
  用三张卡加向下箭头讲清 sync → build → validate；读者点每一步，下面展开对应说明。
steps:
  - id: sync
    title: sync
    text: 同步内容与配置
  - id: build
    title: build
    text: 生成静态 HTML
  - id: validate
    title: validate
    text: 检查后再上线
notes:
  - for: sync
    text: 先对齐远程与本地材料
  - for: build
    text: 构建期把 compose 渲进正文
  - for: validate
    text: 钩子拦住未编译的想法块
```

要并排、加徽标和指标时，把节点写进 `tree`。窄屏仍是一列。

```garden compose
title: 同步然后构建
caption: 点一张卡，看对应说明
intent: |
  两张卡用向右箭头连起来，每张卡上有徽标和指标。
tree:
  - row:
      - card:
          id: sync
          tone: accent
          title: sync
          badge: "1"
          kpi:
            value: 12
            unit: ms
            label: 对齐
          text: 同步内容与配置
      - arrow: right
      - card:
          id: build
          title: build
          text: 生成静态 HTML
  - notes:
      - for: sync
        text: 先对齐远程与本地材料
      - for: build
        text: 构建期把 compose 渲进正文
```

## 字段

围栏写 ` ```garden compose `。正文还是白话时报 `compose-uncompiled`。YAML 树不合法时报 `compose-invalid`。

| 字段 | 是否必填 | 默认值 | 取值与限制 | 说明 |
| :--- | :--- | :--- | :--- | :--- |
| `title` | 可选 | 无 | 字符串 | 图内标题，不进入目录 |
| `caption` | 可选 | 无 | 字符串 | 标题下的一句说明 |
| `intent` | 可选 | 无 | 字符串 | 作者原话，不画出来 |
| `steps` | 与 `tree` 二选一 | 无 | 1–8 项 | 纵向或横向的步骤卡 |
| `notes` | 跟 `steps` 一起写 | 无 | 1–8 项 | `for` 指向某个 `id` |
| `tree` | 与 `steps` 二选一 | 无 | 零件列表 | 嵌套树。`children` 是别名 |
| `steps[].id` | 有注释时必填 | 无 | 字母开头 | 给注释点选用 |
| `steps[].title` | 必填 | 无 | 字符串 | 卡片标题 |
| `steps[].text` | 可选 | 无 | 字符串 | 卡片里的一句说明 |
| `steps[].badge` | 可选 | 无 | 字符串或 `{ text, tone }` | 徽标 |
| `steps[].kpi` | 可选 | 无 | `{ value, label?, unit? }` | 一个指标 |
| `steps[].tone` | 可选 | `plain` | `plain`、`accent`、`muted` | 卡片底色 |
| `notes[].for` | 必填 | 无 | 已有的 `id` | 点哪张卡展开这条 |
| `notes[].text` | 必填 | 无 | 字符串 | 展开后的说明 |

`tree` 里的零件只有这些：`stack`、`row`、`card`、`title`、`text`、`steps`、`compare`、`callout`、`divider`、`badge`、`kpi`、`arrow`、`fan`、`join`、`lanes`、`notes`。

拼法跟说明图的骨架一致，不按某一张图单独改样式。

| 要画的东西 | 写法 |
| --- | --- |
| 浅底通栏 | `card` + `frame: band` |
| 小胶囊 | `card` + `frame: pill`。`tone: accent` 是浅底胶囊 |
| 无框标题 | `card` + `frame: text` |
| 带边框的卡 | `card` |
| 圆圈序号 | `badge: "①"` |
| 盾牌 | `mark: shield` |
| 向下的箭头 | `arrow: down` |
| 并排的几根向下箭头 | `fan: 3`，下一行 `row` 的格数相同 |
| V 形连接，字写在缺口里 | `join: 一句说明` |
| 泳道 | `lanes`，`actors` 与 `messages`。`from` / `to` 从 1 起，`tone` 是 `forward` 或 `back` |
| 脚注 | `text` + `tone: muted` |
| 两列两行 | 两个 `row`，每个两格 |

`frame: band` 和 `frame: text` 标题下的那一句是灰色说明。居中 `stack` 里的脚注要靠左，写 `align: start`。

- `arrow` 的方向是 `down` 或 `right`。窄屏上向右的箭头会改成向下。
- `callout` 的 `tone` 是 `note`、`tip`、`warn`。
- `compare` 写 2–4 项，每项有 `title` 和可选的 `text`。
- 不要写 HTML、脚本、色值或宽度。颜色只来自主题变量。
- 嵌套最多 8 层，整张图最多 80 个零件。被点选的卡片不要再套一张被点选的卡片。

## 限制与报错

- 点开一步时，说明出现在这一步下面。同一张图里同时只展开一条。不打开 JavaScript 也能点开。
- 正文不是 YAML 树（还是一句想法）时报 `compose-uncompiled`。草稿里可以留着，发布前必须编译。
- 树的形状、未知零件、对不上的 `for` 或重复的 `id` 报 `compose-invalid`。
