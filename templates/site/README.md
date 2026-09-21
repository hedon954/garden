# 我的 Garden

这个仓库只保存稿件和站点身份：`content/` 与 `site.config.yaml`。页面引擎来自 [Garden](https://github.com/hedon954/garden)。

```bash
npm install
make new TITLE="你好，世界" SLUG=hello
make dev
```

升级引擎：把 `package.json` 里的 `garden` 依赖改到新的 tag，例如 `github:hedon954/garden#v0.3.0`，再运行 `npm install`。
