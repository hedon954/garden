---
title: scripts
navTitle: scripts
description: 详解 npx garden 全部一级子命令、garden ui 智能组件工具集，以及站点校验与引擎资源脚本的协作方式。
section: scripts
order: 42
---

无论在 macOS、Linux、Windows 还是 CI 容器中，`hd-garden` 包提供的 `garden`（别名 `hd-garden`）CLI 都是所有站点操作与底层脚本的唯一权威入口。

---

## 1. 站点与内容管理命令（`garden` CLI）

| 命令 | 参数与选项 | 作用说明 |
| :--- | :--- | :--- |
| `npx hd-garden init [目录]` | `[--locale zh_CN\|en_US]` | 在目标目录初始化只含配置、文稿目录、Makefile、AGENTS.md 与 AI 技能的新站点 |
| `npx garden dev` | `[--worker]` | 同步内容并启动本地预览（默认使用 Node RSC 热更新；加 `--worker` 在本地 Cloudflare `workerd` 运行时中调试） |
| `npx garden build` | 无（读取环境变量） | 刷新外链图标/卡片、远程图片尺寸与远程文件体积，同步内容并构建站点（`STATIC_EXPORT=1` 时导出纯静态站点并执行完整性门禁） |
| `npx garden start` | `[--host] [--port]` | 启动已完成构建的服务端实例（常用于本地或容器运行独立管理后台） |
| `npx garden sync` | 无 | 仅扫描 `content/` 与 `site.config.yaml`，重新生成 `.garden/` 静态模块、搜索索引、RSS 与 Sitemap |
| `npx garden new` | 环境变量或交互输入 | 创建新文章草稿 |
| `npx garden embed <网址>` | 视频链接或短链 | 解析并打印可直接粘贴进文章的规范化 YouTube / Bilibili 链接 |
| `npx garden verify` | `[文章.md \| --diff \| --rendered]` | **核心预检门禁**：默认检查全站所有文稿（含草稿与未跟踪新文件）的结构与智能 UI；`--diff` 仅检 Git 改动文稿；`--rendered` 单独复检 `dist/client` 静态导出完整性 |
| `npx garden check <文章.md>` | 单篇或多篇路径 | 单独运行文章 Front Matter、文件名、孤立 `diff` 与资源路径的硬性结构检查（输出机器可读 JSON） |
| `npx garden links` | 无 | 手动触发外链 Favicon 与 `{card}` OpenGraph 元数据抓取，更新 `.garden/link-assets.json` |
| `npx garden images` | 无 | 探测正文中新增远程图片的像素宽高，更新 `.garden/image-sizes.json` |
| `npx garden files` | 无 | 探测 `<file>` 中远程文件的字节大小，更新 `file-sizes.json` |
| `npx garden hooks` | `[--force]` | 在 `.git/hooks/pre-commit` 安装提交前 `garden ui check --staged --quiet` 检查钩子 |
| `npx garden editors install` | `[--vscode] [--typora] [--yes]` | 将随包发行的编辑器扩展安装到本机 VS Code / Cursor 与 Typora |
| `npx garden agents` | 无 | 仅在站点缺失 `AGENTS.md` 时补齐站点指南，绝不覆盖用户已自定义的 `AGENTS.md` |
| `npx garden skill` | 无 | 将引擎内置的管理技能安装或更新到站点 `.agents/skills/` |
| `npx garden pages:validate` | `[静态产物目录]` | 校验静态导出目录不含 `.env`、源码、软链接或 Source Map，且入口完备 |
| `npx garden pages:prepare dist/client pages-repository` | 静态目录与公开仓库目录 | 双仓发布时将静态产物写入公开仓库目录、补齐 `.nojekyll` 并稳定化 `deploymentVersion` |
| `npx garden webmentions` | 无 | 扫描已发布 RSS 中的外链并向支持 Webmention 的目标站点发送通知 |

---

## 2. 智能 UI 专用子命令（`ui` 工具链）

`ui` 子命令集（底层对应 `scripts/ui-cli.mjs`）专为人类作者与 AI Agent 精准操作文章内的 `garden compose` 围栏设计：

```console
$ npx --no-install garden ui scan content/posts/my-post.md
$ npx --no-install garden ui check content/posts/my-post.md
$ npx --no-install garden ui apply content/posts/my-post.md --intent-hash cb3a3569 --file block.md
```

| 子命令 | 关键参数 | 用途 |
| :--- | :--- | :--- |
| `garden ui scan <稿件.md>` | 文件路径或 `--all` | 扫描并返回文稿内所有块的起始行号、编译状态（`ok` / `uncompiled` / `error`）、`id`、`hash` 与 `intentHash`，不修改文件 |
| `garden ui check` | `<稿件.md> \| --staged \| --all` | 校验静态 Compose 树与 Play 表达式/组件契约；失败时输出精确行号、错误码及调用 `garden-compose` 技能的短指令（可选 `--out 文件 --standalone` 导出完整离线修复提示词） |
| `garden ui apply <稿件.md>` | `--id <id>` / `--intent-hash <h>` / `--at <行>`，`--base <锁哈希>`，`--file <新块>` | **原子单块写回**：校验新块合法后，仅替换目标围栏行区间，保证围栏外的作者正文逐字节不变；若原块已被他人修改则拒绝覆盖 |
| `garden ui schema` | 无 | 从当前安装的引擎校验器、图标库与样式表中实时导出权威 JSON 契约（含全部合法标签、属性默认值、安全 HTML 白名单与计算样式参考） |
| `garden ui prompt` | `[--studio]` | 输出供模型按需查阅的编译规则与内置配方示例 |
| `garden ui catalog` | `[--out 文件] [--no-open]` | 在本地生成一份单文件离线可交互组件清单（默认 `.garden/ui-catalog.html`）并在浏览器打开 |

---

## 3. 站点仓自检脚本约定

在你的博客仓库（例如使用国内 npm 镜像开发时），还可以配合 `scripts/check-lockfile-registry.mjs` 在 CI 与提交前检查 `package-lock.json` 中的下载地址是否全部保持为官方 `https://registry.npmjs.org/`，避免私有或镜像源地址意外进入锁文件导致 GitHub Actions 安装失败。个人镜像加速建议配置在本机 `~/.npmrc` 中。
