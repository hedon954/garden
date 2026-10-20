---
title: 组件参考 · timeline
navTitle: timeline
description: 按时间或阶段顺序排开版本演进、排查经过或关键节点。
section: reference
order: 4
badge: timeline
---

[← 组件参考](/garden/reference) · [用法：时间线](/garden/components/timeline)

## 示例

```garden timeline
title: 静态发布流水线执行步骤
items:
  - date: 步骤 1
    title: 同步内容与静态资源
    text: 校验文章信息、复制图片附件并生成搜索索引与 RSS。
  - date: 步骤 2
    title: 构建静态站点产物
    text: 把全部页面预渲染到静态目录。
  - date: 步骤 3
    title: 校验静态页面并部署
    text: 检查导出文件完整无误后发布到 GitHub Pages。
```

## 字段写法

````markdown
```garden timeline
title:       # 可选，总标题
items:       # 必填，按时间先后
  - date:    # 可选，时间点
    title:   # 必填，节点标题
    text:    # 可选，说明
    source:  # 可选，来源网址
```
````

## 字段

围栏写 ` ```garden timeline `（编辑器代码片段触发词 `;gtimeline`）。YAML 语法错误或顶层含未知键名时整块报 `garden-yaml` 错误。

| 字段 | 是否必填 | 默认值 | 取值与限制 | 说明 |
| :--- | :--- | :--- | :--- | :--- |
| `title` | 可选 | 无 | 字符串 | 时间线上方的总标题 |
| `items` | 必填 | `[]` | 对象数组（建议至少 `2` 项，不做校验） | 按先后顺序排列的节点列表 |
| `items[].date` | 可选 | 无 | 字符串 | 节点上方的时间点、年份或阶段编号 |
| `items[].title` | 必填 | `""` | 字符串 | 节点标题 |
| `items[].text` | 可选 | 无 | 字符串 | 节点的具体说明 |
| `items[].source` | 可选 | 无 | 网址、`{ url, site?, icon? }` 或数组 | 跟在节点说明后的来源胶囊（未填 `site` 时默认取网址去掉 `www.` 后的域名） |

## 限制与报错

- 除通用的 `garden-yaml` 外，本组件没有专属报错代码；表里写「不做校验」的建议值不会报错。
