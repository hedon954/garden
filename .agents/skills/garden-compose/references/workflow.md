# Compile / repair / strict check · 编译与修复

从站点根目录运行 / Run from the site root:

```sh
node .agents/skills/garden-compose/scripts/scan.mjs content/posts/post.md
node .agents/skills/garden-compose/scripts/check.mjs content/posts/post.md
# 失败时按文件/行号/错误码调用 garden-compose skill；默认不写文件、不调用AI。
```

check 退出 1 表示存在错误或未编译意图；draft:true、未来发布日期与正常发布文章没有豁免。合法但未排版的 DIL 可以通过：工具不是 formatter。Warning 不等于 error；不要为了让输出干净删掉意图或事实。`--all` 只遍历 content 下 .md；`--staged` 读 git 索引中的 content 稿件，不是工作区。

check exit 1 means errors/uncompiled intent, including in drafts. A pass is not a visual guarantee. Default output contains diagnostics and a short project-skill instruction, not article bodies or catalogs. Scan the target to read source and hash. No prompt file is created/modified and no clipboard access occurs. An optional explicit export is `npx --no-install garden ui check content/posts/post.md --out .garden/export.md --standalone`; --standalone alone does not export.

AI 保存一个完整候选围栏到临时文件后，用扫描结果写回（下面 TARGET_LINE 与 HASH 是需替换的占位符，不是固定值）:

```sh
node .agents/skills/garden-compose/scripts/apply.mjs content/posts/post.md \
  --at TARGET_LINE --base HASH --file /tmp/replacement.md
node .agents/skills/garden-compose/scripts/check.mjs content/posts/post.md
```

有稳定 id 时用 `--id ID` 替换 `--at TARGET_LINE`。仅对 scan 实际给出的非空 intentHash 可用 `--intent-hash HASH`。坏标记没有 id/intentHash 时用行号 + base，绝不用 null。`--base` 是完整原围栏的 hash，不是 intentHash。apply 支持 `--file` 或 stdin；会真的写文件，没有 `--dry-run`。单块失败需重新读取，不手工整篇覆盖。脚本不自动提交、发布、安装依赖或调用模型。

## Prose outside a fence · 围栏外的原文

Separate the source paragraphs/list items from the requested effect. At the authorized location, create one `garden compose` intent block preserving both verbatim, then scan it. Initial insertion is distinct from replacing a block: `apply` requires a scanned existing target. For existing blocks, use scan → candidate → apply with the original base hash → check. Preserve unrelated prose and render the source once. / 分离原文与效果要求，在授权位置首次创建 `garden compose` 意图块后扫描；已有块始终带原 base hash 写回并复检，不把 apply 当作插入 API，不重复展示原文。

## Local micro-edit · 微调不重画
scan → 保存稳定id（没有则目标行）与完整围栏base → 仅改候选中的必要属性/叶子 → 审查diff → 带原base apply → rescan/check。去粗先区分源Markdown加粗与title默认600；略小仅在明确要求时改文字叶子size；紧一点改对应容器gap；去外框只改最外figure。不要为了旋钮变化换标签家族或清空intent。稳定id在获授权编辑该块时建立，不全篇加id。并发修改造成base冲突必须重新读取。
当前没有属性patch或dry-run；apply始终写回完整围栏。最小候选diff不等于局部写入API；保留围栏外字节及完整原文核对。

## Opt-in layout check · 独立的内部约束检查
原check.mjs的参数/退出状态不变。AI内部约束卡可保存为临时JSON（不是围栏属性/作者新语法）：
```json
{"at":90,"base":"扫描所得完整围栏hash","layout":"icon-rail","units":3,"outerFrame":"none"}
```
有稳定id用id替代at；base必填。运行：
```sh
node .agents/skills/garden-compose/scripts/lint-layout.mjs content/posts/post.md --constraints .garden/layout.json
```
仅支持当前静态Compose；复用实际本地hd-garden的scanner和parser，不下载包、不复制解析器。错误退出1，工具/约束输入错误退出2，风险/浏览器待验不使退出失败。只对显式声明的icon-rail/equal-cards和outerFrame做有限结构断言；其他路线仍需人工结构清单。不能从归一化树还原未知属性、推断自然语言效果或验证几何；保真核对另做，不把机器支持范围夸大。
