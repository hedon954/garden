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

An author may supply ordinary paragraphs/list items and one sentence describing the desired Compose effect. Do not ask them to rewrite this into DIL, name a skill or run commands. At the authorized location, create one idea fence with the verbatim source and requested effect inside `<intent>`, then scan it. This initial insertion is distinct from replacing an existing block: `apply` requires a scanned existing target. Existing blocks always use scan → candidate → apply with the original base hash → check. Preserve unrelated prose; do not duplicate source text into the visible result. / 作者原文加效果即可；仅首次创建目标围栏需要受限插入，后续修改必须走现有 scan/apply/check 与并发保护，不把 apply 当作不存在目标的插入 API。
