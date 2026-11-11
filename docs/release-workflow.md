# 本机固定发行入口

`python3 scripts/release.py` 默认只读计划；`status` 查看当前源码检查记录。
完整执行器在 `scripts/release_executor.py`，只能通过显式 `execute` 模式运行。
需 Python 3.9+、Node/npm、Git、已有合法认证的 `gh`、Cursor CLI。
不申请权限、不读取/复制凭据；OS审批、SSH/2FA或登录失败时停止，由操作者处理。
只使用既有名为 `garden` 与相邻 `garden-blog` 的共享Git worktrees；固定校验
`origin=hedon954/garden-blog`、`upstream=hedon954/garden`。不clone、不自动切分支。

## 安全默认与当次授权

```sh
python3 scripts/release.py
python3 scripts/release.py status
python3 scripts/release.py execute --version 0.14.9   # 仅示例dry-run，不查远端、不创建状态或改文件
```

只有当用户本次明确批准该目标版本发行后，操作者才可设置VERSION并执行：

```sh
python3 scripts/release.py execute --version "$VERSION" --run \
  --confirm "release hd-garden $VERSION"
```

`execute --run` 缺少完全匹配确认词会拒绝执行。确认词是操作者的当次授权声明，
不是凭据，也不能替代用户批准。**实现/测试工具不授权真实发行**；不能重发0.14.8。
没有`--run`，即使给出confirm也仍是dry-run。默认`status`的旧记录不当作实时证明。

## 完整执行顺序

1. 校验路径/remotes、版本和索引；源代码必须已由人正常提交、工作树干净。
   保护博客全部现有稿件（包括dirty、未忽略untracked、symlink和删除状态）。
   从当前元数据生成并保存六个版本文件的计划hash；统一版本，复用
   `sync-editor-version.mjs`，仅提交六个版本文件。不会自动提交功能代码或文章。
2. 复用现有`npm test`；`npm pack`/prepack构建编辑器；校验源码和包字节、统一
   npm/VSIX/Typora版本及内嵌包。真实子命令退出码/日志hash绑定源码完整SHA。
3. 正常FF push该SHA到`upstream/main`。读取exact SHA的既有Linux verify workflow，
   等待成功，并检查Ubuntu job、npm test、新站安装构建和Pages export全部真通过。
4. 再查registry确实404、main仍为该SHA及未占用tag；普通annotated tag和普通push。
   不直接`npm publish`：等待现有OIDC publish workflow成功。
5. 查正式npm/gitHead/annotated tag/GitHub Release、npm SHA512、源码字节及
   Release VSIX/Typora与npm内嵌资产字节。下载有hash证据的正式VSIX并安装Cursor；
   验证版本、manifest（仅忽略Cursor自加metadata）和安装文件，**不reload**。
6. 博客从本地file切官方registry `^VERSION`，校验lock/integrity、非链接安装和全部
   安装字节；复用registry check、verify、STATIC_EXPORT build、pages:validate、
   verify --rendered。只提交package.json/lock两个文件，再正常FF push `origin/main`。
7. 等源博客CI、新生成快照和Pages成功，核对Deploy消息的源SHA；生产首页和Inspired
   页及HTML直接引用的CSS/JS逐字节对齐新快照。浏览器视觉/交互验收仍需另做。

CI创建最多等待一次；已知run使用单次gh run watch（60秒间隔），结束后核实真实结论。默认单阶段最多1200秒；`--wait-seconds`可设置等待上限。
每阶段立即输出名称，出现CI时输出真实run URL；失败或超时立即停止，不发下一个tag。
工具不删除tag、不force/reset/amend、不绕hook、不stash/恢复用户文章、不部署额外服务。
公开生成快照的既有workflow不改；源码仓库没有force push。

## 真实恢复与不重复mutation

执行状态：`.garden/release-executor/VERSION/SESSION/state.json`；默认SESSION为default。
版本计划、追加式命令日志及每阶段证据在同目录。内核锁覆盖所有版本/会话，不能并发发布。
旧检查/测试receipt在`.garden/release/<完整源码SHA>/`，可在源码不变且log/hash/退出码
均有效时跳过成功子命令；丢失或变动的本机包/编辑器产物会重新打包验证。

重新运行**相同命令**即续跑：先查Git refs/实际commit/tag、registry、安装文件和消费状态，
不会只信“完成”标记；已成功的push/tag/install不会再做，远端核验仍会真实执行。
即使传输报错，只要恢复时远端已达到目标，也会核实后继续而不重复push。
不确定且目标尚未实现的mutation不会自动重试；日志核对并再次确认后可明确指定：

```sh
python3 scripts/release.py execute --version "$VERSION" --run \
  --confirm "release hd-garden $VERSION" --retry-stage source-push
```

retry-stage只允许已定义mutation阶段；仍先查真实状态，不能覆盖冲突、跳过测试或获得权限。
如果CI失败后修改了源码，须先正常提交；使用新的`--session retry1`启动新审计周期，
保留旧记录，不自动加版本号。但目标版本必须仍未发布、tag未占用；失败tag清理要另获授权。
若源码/用户稿件、计划文件或索引出现非预期变动，立即停止保留现场，不自动修正。
构建修改tracked生成文件也会停下，需人工审核其性质；不会猜测后恢复旧稿。

## 验收与边界

```sh
python3 -B -m unittest discover -s tests -p 'release_*_test.py'
node --test tests/release-workflow.test.mjs
```

测试使用真实临时Git提交/tag和模拟npm/GitHub/Cursor/网络；不触碰用户remote或生产。
覆盖完整阶段执行与完成后续跑不重复mutation、push成功响应丢失、未实现的不确定push不重试、
部分版本写入恢复、CI失败不tag、已发布版本拒绝、包不一致、稿件/索引保护和跨会话锁。

没有自动化的部分：当次人类授权、权限/OS审批/2FA、预先审阅并提交功能代码，以及最终浏览器
视觉/交互验收。原生构建崩溃、被修改稿件、冲突/占用tag不会“修好再继续”，而是明确停止。
这些停点不是无证据的成功；状态和日志指出实际阶段，不能宣称已发布或已上线。
