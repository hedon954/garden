# 我的 Garden

这个仓库只保存稿件和站点身份：`content/` 与 `site.config.yaml`。页面引擎来自 [Garden](https://github.com/hedon954/garden)。

```bash
npm install
make new TITLE="你好，世界" SLUG=hello
make dev
```

`make dev`、`npm run dev` 和 `npx garden dev` 默认预览草稿及未来定时文章。可用 `CONTENT_INCLUDE_DRAFTS=0 make dev` 关闭；正式构建默认排除这些内容。

第一次 `npx garden dev` 会补齐 Makefile 和 skill，并创建 `.env.local`。Cursor / Codex 打开这个仓库后会读到 `.agents/skills/`。要更新 skill，再运行 `npx garden skill`。

`npx hd-garden init` 会把 VS Code / Cursor 与 Typora 的 Intelligent UI 插件放到 `.garden/editors/`，并在交互终端里询问要不要安装。之后可以运行 `npx garden editors install`（加 `--yes` 则直接安装，`--vscode` / `--typora` 只装一个）。Typora 需要先装 typora-community-plugin，再在「设置 → 已安装插件」里勾选。插件用来插入想法（一段给 `garden-compose` skill 编译的 `garden` 围栏，不是写好的 YAML）、预览组件、打开清单，并把「编译这篇」交给 skill。Typora 里输入 `/` 选 `/garden`，再从带小预览图的列表里选。

评论默认关闭。发布前打开 [Giscus](https://giscus.app/zh-CN)，把仓库、仓库 ID、分类、分类 ID 写入 `.env.local`，并在 GitHub Actions Variables 设置同名的 `GISCUS_REPO`、`GISCUS_REPO_ID`、`GISCUS_CATEGORY`、`GISCUS_CATEGORY_ID`。留空会让发布失败。确定不开放评论时，把 `GISCUS_DISABLED` 设为 `1`。

升级引擎：把 `package.json` 里的 `hd-garden` 改到新版本，例如 `^0.4.0`，再运行 `npm install`。

再次运行 `make dev` 会先温和停止经验证属于同一项目的旧 Vinext，再启动新服务；不会按端口号杀死无关进程。修改、新建或删除 Markdown 会自动更新预览。标题按原文显示；范围 `4~6` 不作删除线，显式删除线用 `~~删除线~~`。
