# 维护、排障与安全

## 每次变更前

```bash
npm run lint
npm test
```

`npm test` 会执行正常构建和渲染测试；GitHub Actions 还会验证 GitHub Pages 静态导出。内容校验报错时，按报错中的 Markdown 路径修复 front matter、重复 slug 或本地媒体路径。

## Pages 没有更新

1. 查看仓库的 Actions 中 `Deploy public blog to GitHub Pages` 是否成功。
2. 检查 **Settings → Pages** 的 Source 是否为 GitHub Actions。
3. 检查 `SITE_URL` 是否为最终地址且没有结尾 `/`。
4. 确认内容提交到了 `main`，并且不是草稿或未来发布时间。

## 一键维护动作

- GitHub Actions 的 **Deploy public blog to GitHub Pages**：在 `main` 更新内容后自动运行，也可手动重跑。
- **Send Webmentions**：公开页面已经更新后手动运行，重新扫描 RSS 并发出外链 mention。
- Dependabot：每月检查 npm 与 GitHub Actions 依赖更新，仍应等待 `Verify blog` 通过后再合并。

## 后台无法发布

检查后台服务日志和 `CONTENT_GITHUB_TOKEN`：它必须是限定到内容仓库、拥有 **Contents: Read and write** 的 fine-grained PAT。`CONTENT_REPOSITORY` 必须是 `owner/repository`，且 `CONTENT_BRANCH` 存在。OAuth 登录成功并不代表该服务具有写入仓库的权限。

## 密钥轮换

立即在对应平台撤销已泄露的 PAT、OAuth Client Secret 或分发令牌，生成新值并更新后台部署平台的 Secret。不要把旧密钥写进 issue、文档、提交记录或客户端环境变量。`.env.local` 已被 Git 忽略。

## 升级

定期运行 `npm outdated` 与 `npm audit`，通过 Pull Request 升级依赖，并让 `Verify blog` 工作流通过后再合并。GitHub Pages 与后台服务可独立回滚：公开端回滚 Git 提交，后台端回滚服务版本。
