---
title: 组件参考 · file
navTitle: file
description: 给读者提供一份或一组可下载的文件，支持在当前页展开预览。
section: reference
order: 9
badge: file
---

[← 组件参考](/garden/reference) · [用法：文件下载与预览](/garden/components/file)

## 示例

```garden file
src: ./file/checklist.md
title: 发布前检查清单
note: Markdown 附件示例，可点击「预览」在当前页展开阅读，或直接下载原文件
```

## 字段写法

````markdown
```garden file
src:        # 单文件必填，路径
title:      # 可选，标题
note:       # 可选，一句说明
files:      # 多文件必填，不与 src 同写
  - src:    # 必填，路径
    title:  # 可选，默认文件名
    note:   # 可选，说明
```
````

## 字段

围栏写 ` ```garden file `（编辑器代码片段触发词 `;gfile`）。单个附件在顶层写 `src`，多个附件用 `files` 数组；YAML 语法错误或顶层含未知键名时整块报 `garden-yaml` 错误。

| 字段 | 是否必填 | 默认值 | 取值与限制 | 说明 |
| :--- | :--- | :--- | :--- | :--- |
| `src` | 单文件必填 | 无 | 相对路径、`/public` 路径或 `https://` 网址；缺失或与 `files` 同时写报 `garden-file` 错误，本地路径越出 `content/` 目录报 `file-outside` 错误，本地文件不存在报 `missing-asset` 错误，单文件超过 `5 MB` 报 `file-large` 警告 | 附件路径 |
| `title` | 可选 | 单文件默认取文件名；多文件默认 `""` | 字符串 | 单文件模式下为附件显示标题；多文件模式下作为整组标题 |
| `note` | 可选 | `""` | 字符串（与 `files` 同时写在顶层时报 `garden-file` 错误） | 单文件模式下显示在文件名下方的简短说明 |
| `files` | 多文件必填 | 无 | `{ src, title?, note? }[]`（至少 `1` 项；为空、非数组、与顶层 `src`/`note` 同时写、条目缺少 `src`、含未知键名或手写 `resolved` 字段时均报 `garden-file` 错误） | 多文件列表，每项必填 `src`，可选 `title`（默认取文件名）与 `note`（默认 `""`） |

## 限制与报错

- `garden-file`：没写 `src` 也没写 `files`；`files` 为空或不是列表；`files` 和顶层 `src` / `note` 同时写；条目缺 `src` 或含未知键名；手写了 `resolved`。
- `file-outside`：本地路径越出 `content/` 目录。
- `missing-asset`：本地文件不存在。
- `file-large`（警告）：单个文件超过 5 MB。
