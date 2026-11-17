---
title: skills/AGENTS.md
navTitle: skills/AGENTS.md
description: 详解站点根目录 AGENTS.md、.agents/skills/ 下的编译与审稿技能，以及 pre-commit 钩子如何构成可靠的 AI 协作闭环。
section: scripts
order: 43
---

Garden 不把 AI 协作建立在「让用户每次复制一大段提示词发给聊天框」上，而是把协作规范直接固化为站点仓库里的三个轻量要素：**一份百行以内的根级 `AGENTS.md` 地图**、**两个按需加载的专用 Skill**，以及**一道自动兜底的 `pre-commit` 钩子**。

无论你使用 Cursor、Claude Code 还是 Codex 打开博客仓库，Agent 都能立刻读懂项目边界并调用权威工具完成任务。

---

## 1. 根级概念地图：`AGENTS.md`

`npx hd-garden init`（或 `npx garden agents`）会在站点根目录创建一份精炼的 `AGENTS.md`。它只向 AI 交代最重要的站点铁律，绝不堆砌容易过期的标签全表：

- **内容与生成物边界**：明确 `content/posts/`、`content/columns.yaml`、`site.config.yaml` 与同名附件目录是源材料；`.garden/` 与 `dist/` 是生成缓存与构建产物，禁止手工编辑生成物或为了单篇写作需求去复制引擎代码。
- **按任务路由到专用技能**：写组件或修报错先进 `garden-compose` 技能；整篇结构检查或文字润色建议先进 `garden-post-review` 技能。
- **严守作者原意与发布安全**：保留作者事实、数据、标题文字与参考链接关系，不擅自加章节编号、不编造测量数据，且**严禁自动执行会提交推送的 `make update`**。

> [!TIP] 自定义规则不会被覆盖
> 如果你在站点的 `AGENTS.md` 里补充了自己的写作偏好或术语约定，后续执行 `garden sync` 或 `npx garden agents` 都会完整保留你的文件，只在文件缺失时才会创建默认模板。

---

## 2. 两大内置项目技能（`.agents/skills/`）

运行 `npx hd-garden init` 或 `make skill`（即 `npx garden skill`）时，引擎会把与当前 `hd-garden` 版本严格匹配的技能安装到站点的 `.agents/skills/` 目录（若你本地手工改过受管技能文件，更新时会自动备份你的本地修改）：

```garden compose
<figure frame="none">
  <icon-list>
    <entry icon="layers" title="garden-compose（.agents/skills/garden-compose/SKILL.md）">
      <text>负责将作者的一句自然语言想法或草图需求编译为可验证的 `garden compose` 块，或修复已有块的报错与排版瑕疵。</text>
      <text>内置按需查阅的 `references/`（布局配方、视觉选型、渲染模型与连接线测量）以及 `scripts/` 封装脚本：强制走「scan 定位 → 按需查 schema/prompt → 编译与布局检查 → apply 原子写回 → verify 复检」流程。</text>
    </entry>
    <entry icon="badge-check" title="garden-post-review（.agents/skills/garden-post-review/SKILL.md）">
      <text>负责单篇指定文章的交付前审校：先运行结构检查与 Compose 校验，修复脚本报出的确定性格式错误（如 Front Matter 缺失、孤立 diff 等）。</text>
      <text>对散文措辞、段落衔接与表达改进只给出审稿建议清单，未经作者明确同意绝不擅自重写你的文章句子。</text>
    </entry>
  </icon-list>
</figure>
```

---

## 3. 提交前守护钩子（`.git/hooks/pre-commit`）

第一次在博客仓库运行 `make dev` 或 `npx garden sync`（也可手动运行 `npx garden hooks`）时，引擎会在本地 `.git/hooks/pre-commit` 写入一段极简守门脚本：

```sh
#!/bin/sh
# garden: ui check
if [ ! -d node_modules/hd-garden ]; then
  echo "garden 还没安装（先运行 npm install），这次跳过 ui 检查。" >&2
  exit 0
fi
exec npx --no-install garden ui check --staged --quiet
```

- 当暂存区的所有 `garden compose` 块均已编译且零语法错误时，钩子**完全静默返回 `0`**，不刷屏任何废话；
- 一旦你忘记编译某段自然语言草稿或手改引入了属性错误，钩子会立即拦下本次 `git commit`，打印出精确的 `文件:起止行号 错误码`，并附上一句可直接粘贴给 AI Agent 的修复指令，形成「人写意图 → 钩子兜底 → AI 单块修复」的无缝闭环。
