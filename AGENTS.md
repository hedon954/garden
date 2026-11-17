# AGENTS.md

`hd-garden` 引擎仓库。用户给一句要改成什么样，从下表打开对应文件，改完跑同一行里的命令。内容站写作不在这里，看 `templates/site/AGENTS.md`。

Node `>= 22.13.0`。首次 `npm ci`。

## 改哪里，用什么证明

| 要改的事 | 先打开 | 跑 |
| --- | --- | --- |
| Compose 标签、布局、窄屏折行 | `ui/compose/render.mjs`、`ui/compose/compose.css`，再打开同名的 `tests/compose-*.test.mjs` | `node --experimental-strip-types --test tests/compose-<topic>.test.mjs` |
| 手册正文 | `docs/handbook/` 里那一篇 | 改完用 `node scripts/handbook-facts.mjs` 看它报的文件 |
| 21 种图示页 | `scripts/handbook-diagrams.mjs`，不要手改 `docs/handbook/components/diagrams/` | `node scripts/handbook-diagrams.mjs` 然后 `node scripts/handbook-diagrams.mjs --check` |
| 手册站导航、顶栏、预览框 | `app/components/GardenDocsNav.tsx`、`app/styles/a2.css`、`docs-app/components/DocLivePlayground.tsx` | `npm run docs:dev`，打开 `http://localhost:5173/garden/` |
| 样例博客页面 | `app/` 里对应组件，`scripts/build-content.mjs` | `npm run dev`，打开 `http://localhost:3000` |
| 编辑器插件 | `editors/vscode/` 或 `editors/typora/` | `node scripts/sync-editor-version.mjs --check` |
| 发 npm / GitHub Release | `CHANGELOG.md` 顶部 `## x.y.z`、`scripts/release-notes.mjs`、`.github/workflows/publish.yml` | 先做下面的「打 tag 之前」，通过后再打 tag |

`npm test` 会先整站构建，只在要交 `main` 时跑。日常改一块就跑上表那一条。

浏览器测试走 `tests/browser-fixture.mjs`，需要本机 Chrome。文件名带 `browser` 的测试默认不在 `npm test` 里，改到视口或点击时要单独跑。

## 代理会猜错的地方

- 窄屏样式看组件自己的宽度。`ui/compose/compose.css` 里 `@container g-compose (max-width: 560px)` 管文档预览和手机框；`@media (max-width: 800px)` 只看浏览器窗口。只改后者，预览框里的图还会挤在一起。
- `docs/handbook/components/diagrams/*.md` 是生成文件。改措辞或例子要改 `scripts/handbook-diagrams.mjs` 或 `ui/garden/diagram-recipes.mjs`，再跑生成器。
- 手册构建是 `npm run docs:dev` / `docs:build`（`scripts/docs-site.mjs`）。`npm run dev` 是样例博客，不会更新 `/garden` 手册。
- 编辑器版本必须等于根目录 `package.json` 的 `version`。改版本用 `node scripts/sync-editor-version.mjs`，不要只改一个清单。
- 发布说明写在 `CHANGELOG.md` 该版本标题下，用中文写这次改了什么。`scripts/release-notes.mjs` 读这一节；空的或没有中文就失败。比较链接由脚本加在最后。

## 打 tag 之前

`publish.yml` 不跑 `npm run lint`。`v0.15.1` 就是 lint 没过、npm 仍然发出去了。打 tag 前在将要标记的那次提交上跑完这些，任何一条失败都不要打 tag：

1. 工作区干净，提交已经在 `main` 上。
2. `node scripts/sync-editor-version.mjs --check`：根版本、VS Code、Typora 一致，且 tag 名就是 `v` 加 `package.json` 的 `version`。
3. `node scripts/release-notes.mjs`：`CHANGELOG.md` 里该版本是中文发布报告，不能空。
4. `npm run lint`
5. `npm test`

已经发出的 tag 不能删了再复用同一个版本号。npm 上的版本也不能覆盖。

## 收尾

相关命令通过再停。界面改动要写清打开过的地址；没打开就写未验证。不提交、不推送、不打 tag，除非用户这次明确说了。
