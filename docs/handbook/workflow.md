---
title: 语法检查与编辑器快捷输入
description: 用 make check 在发布前找出写错的组件与失效附件，用 npx garden snippets 给 VS Code 或 macOS 导出快捷模板。
section: workflow
order: 1
---

## 写草稿时先用空白 `garden` 记下想法

写长文章的时候，如果中途停下来翻文档查组件的字段名，很容易打断思路。

你可以先写一个**不带组件名的 `garden` 代码块**，在里面用大白话记下你想放什么：

```text
```garden
这里放个左右对比：左边写单线程事件循环遇到慢查询时的阻塞情况，
右边写拆出工作线程池之后的延迟变化。
```
```

只要这篇文章还标着 `draft: true`，本地预览就会把它显示成一个不起眼的便签框，提醒你这里还有一块内容待补全；等你把整篇文章写顺了，再回头把它改成正式的 `garden compare` 组件，或者配合仓库自带的编辑器插件处理。

## 发布前跑一次 `make check`

每次你运行 `make check`、`make update`，或者执行 `git commit` 时，Garden 都会自动帮你检查一遍所有 Markdown 文章，常见的问题都会直接指出行号和改法：

| 错误提示代号 | 什么时候会出现 | 怎么改 |
| :--- | :--- | :--- |
| `garden-name` | 组件名字拼错了（比如写成了 `garden car`） | 按提示改成正确的英文组件名（如 `card`、`chart`）。 |
| `garden-yaml` | 组件里的缩进不对，或者写了该组件不支持的字段名 | 对照提示里列出的可用字段名修改，或者给带英文冒号的句子加上双引号。 |
| `garden-idea` | 文章已经去掉了 `draft: true` 准备正式发，但里面还留着没填组件名的空白 `garden` 块 | 把它补全成具体的组件，或者直接改写成普通段落。 |
| `diff-orphan` | 单独写了一段 `diff` 代码块，前面没有放完整代码 | 在 `diff` 代码块正上方补一段改好后的完整代码，让页面能生成「对比 / 改后」切换。 |
| `compare-long` | `garden compare` 单个格子里的说明超过了 60 个字 | 并排对比格只适合放一两句短结论；太长的段落请移回普通正文里写。 |
| `garden-file` | `garden file` 里写的附件路径找不到文件，或者单个文件超过了 25 MB | 检查文件是不是放在了文章所在目录或同名文件夹里。 |
| `title-split` | 标题里写了 `丨` 用来分行，但竖线左边或右边是空的 | 把标题写成「主标题丨副标题」，或者删掉多余的 `丨`。 |

## 给编辑器装上快捷输入模板（Snippets）

如果你不想每次手敲组件的字段，可以用自带的命令行工具把 9 个组件的空白模板一键导出到 VS Code、Cursor 或者 macOS 的系统文本替换里：

```bash
# 在终端里直接查看 9 个组件的写法模板
npx garden blocks

# 在当前项目生成 VS Code / Cursor 专用的代码片段（.vscode/garden.code-snippets）
npx garden snippets --vscode

# 导出 macOS 系统「文本替换」文件，导入后敲 gstat、gcard 就能直接展开
npx garden snippets --macos > garden-text-replacements.plist
```

如果你平时用 Cursor 或 Claude Code 写文章，仓库的 `.agents/skills/` 目录下也带好了三份现成的规则说明（用来把想法块转成交互组件、生成独立图表 HTML，以及通读检查文章错漏），编辑器会自动识别读取。
