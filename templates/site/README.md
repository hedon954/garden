# 我的 Garden

这个仓库只保存稿件和站点身份：`content/` 与 `site.config.yaml`。页面引擎来自 [Garden](https://github.com/hedon954/garden)。

```bash
npm install
make new TITLE="你好，世界" SLUG=hello
make dev
```

第一次 `npx garden dev` 会补齐 Makefile 和 skill，并创建 `.env.local`。Cursor / Codex 打开这个仓库后会读到 `.agents/skills/`。要更新 skill，再运行 `npx garden skill`。

评论默认关闭。发布前打开 [Giscus](https://giscus.app/zh-CN)，把仓库、仓库 ID、分类、分类 ID 写入 `.env.local`，并在 GitHub Actions Variables 设置同名的 `GISCUS_REPO`、`GISCUS_REPO_ID`、`GISCUS_CATEGORY`、`GISCUS_CATEGORY_ID`。留空会让发布失败。确定不开放评论时，把 `GISCUS_DISABLED` 设为 `1`。

升级引擎：把 `package.json` 里的 `hd-garden` 改到新版本，例如 `^0.4.0`，再运行 `npm install`。
