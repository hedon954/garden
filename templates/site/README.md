# 我的 Garden

这个仓库只保存稿件和站点身份：`content/` 与 `site.config.yaml`。页面引擎来自 [Garden](https://github.com/hedon954/garden)。

```bash
npm install
make new TITLE="你好，世界" SLUG=hello
make dev
```

第一次 `npx garden dev` 会补齐 Makefile、写稿脚本和图表 skill。Cursor / Codex 打开这个仓库后会读到 `.agents/skills/garden-interactive-chart`。要更新 skill，再运行 `npx garden skill`。

升级引擎：把 `package.json` 里的 `hd-garden` 改到新版本，例如 `^0.4.0`，再运行 `npm install`。
