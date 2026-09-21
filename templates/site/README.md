# 我的 Garden

这个仓库只保存稿件和站点身份：`content/` 与 `site.config.yaml`。页面引擎来自 [Garden](https://github.com/hedon954/garden)。

```bash
npm install
make new TITLE="你好，世界" SLUG=hello
make dev
```

写可交互图表时，在站点根目录运行：

```bash
npx garden skill
```

这会把 `garden-interactive-chart` 装进 `.agents/skills/`。Cursor / Codex 打开这个仓库后会自动用它。升级 Garden 后再跑一次即可更新 skill。

升级引擎：把 `package.json` 里的 `garden` 依赖改到新的 tag，例如 `github:hedon954/garden#v0.3.0`，再运行 `npm install`。
