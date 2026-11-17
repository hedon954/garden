---
title: Makefile
navTitle: Makefile
description: 详解站点根目录 Makefile 的全部命令目标、环境变量传参方式，以及增量预检与发布提交之间的边界。
section: scripts
order: 41
---

每个通过 `npx hd-garden init` 创建的站点根目录都自带一份轻量的 `Makefile`（缺失时运行 `garden sync` 也会自动补齐）。它把依赖检查、内容预检、静态构建与 Git 发布封装成最顺手的几条日常命令。

---

## 1. 常用命令速查表

| 命令 | 实际执行的底层动作 | 典型使用时机 |
| :--- | :--- | :--- |
| `make help` | 打印所有支持的常用命令与示例 | 忘记某个参数写法时（直接敲 `make` 默认也是它） |
| `make new` | 确保依赖已装后运行 `npx garden new`（可带 `TITLE`、`SLUG`、`DIR`） | 创建一篇带规范 Front Matter 的新博文草稿 |
| `make embed URL="..."` | 运行 `npx garden embed`，输出规范化可粘贴的视频或网页地址 | 解开 `b23.tv` 短链或清洗带跟踪参数的视频链接时 |
| `make skill` | 运行 `npx garden skill` 将引擎自带的最新 AI 技能同步到 `.agents/skills/` | 升级 `hd-garden` 版本后同步更新站点技能时 |
| `make dev` | 自动检查 `node_modules`，启动本地热更新预览服务（默认包含 `draft: true` 草稿） | 日常边写 Markdown 边在浏览器实时看排版效果 |
| `make check diff` | 运行 `npx --no-install garden verify --diff`，**只预检当前 Git 改动或新建的文稿** | 写稿途中或 AI 刚改完组件，想在 1 秒内快速验证语法 |
| `make check` | 全量严格预检全部文稿（含草稿），通过后再执行 `garden sync && garden build` | 发布前做一次全站级结构与构建验证（支持 `FILE=路径` 仅限制预检范围） |
| `make build` | 执行 `npx garden build` 生成生产站点产物 | 本地需要单独产出构建目录时 |
| `make update` | 若有改动则先跑完整 `make check`，全绿后执行 `git add -A`、`git commit` 与 `git push origin HEAD` | 确认定稿，一键提交并触发 GitHub Actions 自动上线 |

---

## 2. 命令参数与典型组合示例

### 新建指定子目录与文件名的文章

`Makefile` 会安全转发 `TITLE`、`SLUG`、`DIR` 三个变量（即使标题里包含空格或竖线分隔符也不会被拆散）：

```bash
make new DIR=systems SLUG=raft-leader-lease TITLE="深入 Raft丨Leader 租约与线性一致读"
```

该命令会在 `content/posts/systems/raft-leader-lease.md` 生成新草稿。若不传参数直接执行 `make new`，则会进入交互式终端提示。

### 区分 `make check diff` 与 `make check`

- **日常高频校验用 `make check diff`**：它利用 Git 工作区与 `HEAD` 的差异，只挑出本次修改或新增的 `.md` 文件执行结构检查与 `garden compose` 检查，不跑耗时的全站打包（即使并行传入 `make -j check diff` 也只会触发一次预检）。
- **上线前全量构建用 `make check`**：不仅检查仓库内每一篇正式文稿和草稿，还会实际跑完 `garden sync` 与 `garden build`，确保图片路径、专栏引用与前端编译全部打通。

### 带自定义提交信息一键发布

不传 `MESSAGE` 时默认提交说明为 `更新博客`；推荐在发布时附带清晰的提交说明：

```bash
make update MESSAGE="新增 Raft 线性一致读长文"
```

> [!WARNING] 不要把 `make update` 当成本地检查命令
> `make update` 在 `make check` 通过后会立即执行 `git add -A`、提交并推送到远端 `origin`，从而触发线上部署。如果只是想在本地检查有没有写错语法，请始终使用 `make check diff` 或 `make check`（这也是 `AGENTS.md` 明确禁止 AI Agent 自动运行 `make update` 的原因）。
