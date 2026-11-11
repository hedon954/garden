# 本机分阶段发行检查

入口：`python3 scripts/release.py`。这是**检查与恢复工具，不是一键发布器**。
需 Python 3.9+、Node/npm、Git；联网检查另需已有合法认证的 `gh`。
只适用于既有共享 Git worktrees：engine `garden`、相邻 `garden-blog`；
可用 `--blog /absolute/path` 指定博客。强制 `origin=hedon954/garden-blog`、
`upstream=hedon954/garden`，不 clone、不切换分支、不修改 remote。

## 默认安全

```sh
python3 scripts/release.py                 # plan：只读，不联网、不写状态
python3 scripts/release.py status          # 当前源码提交对应的记录摘要
python3 scripts/release.py pack            # dry-run，不打包
```

即使加 `--run`，程序也**永不**执行 npm publish、创建/删除 tag、commit、push、
stash、reset、force、安装编辑器或 reload。真正发行和推送仍需当次用户明确授权；
本次工具实现不授权下一次发行，也不能再发布已上线的 0.14.8。
`status` 是记录摘要，不是远端实时成功证明；远端门禁每次重新查询。

## 阶段与边界

先人工审阅版本文件并正常提交，确保 engine 工作树干净；不自动选版本或提交源码。
所有证据绑定完整 engine HEAD 和统一版本，换 commit 自动使用独立状态目录。

| 命令（均为 `python3 scripts/release.py PHASE --run`） | 实际工作 |
| --- | --- |
| `test` | 运行已有 `npm test`，包含已有 build；保存真实退出码和日志 hash |
| `pack` | 要求同源码 tests 成功；复用 `npm pack`/prepack；核 npm/VSIX/Typora 版本、嵌入编辑器字节、本机干净源码字节 |
| `linux` | 实时查 exact SHA 的 main/push verify.yml，要求 Ubuntu verify job、npm test、新站安装构建、Pages export 全部成功 |
| `tag-plan` | 要求上述 pack 产物 hash 未变及实时 Linux 门；registry 必须明确404、本地/远端 tag 不存在、upstream/main 等于该 SHA；**只打印人工 tag/push 命令** |
| `published` | 查官方 registry/gitHead/annotated tag/GitHub 正式 Release；核 npm SHA512、Release 两编辑器资产与 npm 内嵌包逐字节一致 |
| `blog-check` | 要求博客已由人工切 registry `^VERSION`；实时 metadata/lock/integrity、非链接安装、全部安装文件匹配官方 tarball；复用 registry check、verify、STATIC_EXPORT build、pages:validate、verify --rendered |
| `deployed` | 要求 blog HEAD 已到 origin/main、对应源 CI 成功；新快照消息指向 blog SHA、Pages成功；生产首页及 Inspired 页面与 HTML 引用 CSS/JS 逐字节匹配该快照 |

典型顺序：`test → pack → 人工正常push engine main → linux → tag-plan → 人工授权tag/push → published → 人工安装正式VSIX（不reload）及blog registry依赖 → blog-check → 人工小commit/push → deployed`。
OIDC npm 发布、生成公开快照和 Pages 部署均继续由**现有 workflow**完成，工具不重建服务或另行发布。

人工 source push 必须普通 FF：`git push upstream HEAD:refs/heads/main`。
人工 blog pin：`npm install 'hd-garden@^VERSION' --registry=https://registry.npmjs.org`。
人工 blog commit 前必须确认索引为空，并只加入 `package.json package-lock.json`；
检查相对 origin/main 的变化仅这两个文件，再普通 `git push origin HEAD:refs/heads/main`。
工具不代做上述写操作；不自动等待 CI（给出实际失败或未完成状态后停止），更不会在失败时发 tag。
Cursor CLI 安装、编辑器版本确认、浏览器目录/标题/数学交互验收仍是人工步骤。

## 恢复与保护

日志/退出码/receipt 在 `.garden/release/<完整engine SHA>/<phase>/`，总记录为 `state.json`。
每个本机子命令成功后原子写 receipt；再次运行相同阶段，会核实命令、源码/博客文件
hash、日志存在及 hash 和退出码，才跳过已验证步骤。仅有 state 标记不算成功。
包和远端证明另行真实核验；删除/改动产物不能凭旧记录通过 tag 门。
若进程在命令完成但 receipt 落盘前被杀，没有可靠成功证明，本机只读/构建命令可能重跑。
无任何不可逆 mutation 自动重试。超时/认证错误绝不视作版本或 tag 不存在。

进程使用内核文件锁，退出自动释放；状态使用临时文件原子替换，可恢复中断写入。
保护包括 tracked 和未忽略 untracked 文件、删除状态、symlink 本身；不递归扫描 `.garden`。
初始保护快照之后，博客只允许人工更换两个依赖文件，其余用户编辑变化一律停止供人工核对，
**绝不恢复旧内容或吞掉新编辑**。构建意外修改/删除 tracked 生成文件也停止，不自动还原。
确认是预期用户新编辑时，应保留旧审计目录，人工审核后另建新源码提交/新审计周期，不能伪造成功记录。

回归（全部外部服务模拟，不会发布或访问生产）：

```sh
python3 -B tests/release_workflow_test.py
node --test tests/release-workflow.test.mjs
```
