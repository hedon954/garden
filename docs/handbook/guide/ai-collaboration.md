---
title: AI 协作
navTitle: AI 协作
description: 通过静态说明图、可调参数交互与代码演进对比三个真实样例，完整演示「自然语言 → 发布检查 → AI 重写 → 部署」协作流。
section: guide
order: 12
---

在 Garden 中使用复杂布局、关系图或可交互计算控件，**不需要作者背诵标签目录或手写前端代码**。整个 AI 协作流程固定为四步闭环：

```garden compose
<row align="center">
  <box padding="3" radius="md" background="surface-secondary" border="subtle">
    <title>1. 自然语言</title>
    <text>在 garden compose 围栏内写清材料与表达意图</text>
  </box>
  <arrow />
  <box padding="3" radius="md" background="surface-secondary" border="subtle">
    <title>2. 发布检查</title>
    <text>make check diff 或提交钩子定位未编译块</text>
  </box>
  <arrow />
  <band tone="accent">
    <title>3. AI 重写</title>
    <text>Agent 扫描哈希、编译组件并单块精准写回</text>
  </band>
  <arrow />
  <box padding="3" radius="md" background="surface-secondary" border="subtle">
    <title>4. 部署上线</title>
    <text>复检零错误后运行 make update 自动发布</text>
  </box>
</row>
```

人与 AI Agent 共用同一组权威 CLI（`garden ui scan`、`garden ui prompt`、`garden ui apply`、`garden ui check`）。AI 只替换目标围栏本身，**围栏外的你的每一个字、标点和空行都逐字节保持不变**。

下面用 **3 个递进的真实写作样例** 走完这一流程。

---

## 样例一：静态结构说明图（多列关联架构）

### 第一步：写自然语言意图

假设你在写一篇权限系统文章 `content/posts/rbac-model.md`，想画一张三列关联图（也可以在 Typora / VS Code 里输入 `/garden` 选「关联图」模板填入材料）：

````markdown
```garden compose
三列并排：左边是 User（包含 Alice、Bob），中间是 Role（包含 管理员、审计员），右边是 Permission（包含 orders:write、audit:read）。
Role 在正中间把用户和权限解耦连接起来，Role 是视觉重点。底部加一句结论：新增人员只需绑定角色，不直接改权限表。
```
````

### 第二步：发布检查拦截并给出指令

如果你在编译前运行 `make check diff` 或直接 `git commit`，检查器会精确定位行号并提示调用内置技能：

```console
$ make check diff
content/posts/rbac-model.md:14  -  compose-uncompiled  还有没编译的 compose 想法
请调用 garden-compose skill（.agents/skills/garden-compose/SKILL.md），修复以上错误块后重新校验。
```

### 第三步：AI 扫描并单块写回

把这句提示（或「帮我编译 `content/posts/rbac-model.md`」）发给 Cursor / Claude Code / Codex。Agent 会自动读取站点里的 `.agents/skills/garden-compose/SKILL.md`：

1. 运行 `npx --no-install garden ui scan content/posts/rbac-model.md` 获取该块的行号与 `intentHash`。
2. 按需查阅组件契约，把原话保留在 `<intent>` 中，生成结构标签。
3. 运行 `npx --no-install garden ui apply content/posts/rbac-model.md --intent-hash <哈希> --file replacement.md` 安全替换该块，并再次执行 `npx --no-install garden verify content/posts/rbac-model.md` 确认零错误。

### 第四步：实际编译结果与部署

写回后的围栏在页面中真实渲染如下，随后运行 `make update` 即可发布：

```garden compose #ai-demo-rbac
<intent>
三列并排：左边是 User（包含 Alice、Bob），中间是 Role（包含 管理员、审计员），右边是 Permission（包含 orders:write、audit:read）。Role 在正中间把用户和权限解耦连接起来，Role 是视觉重点。底部加一句结论：新增人员只需绑定角色，不直接改权限表。
</intent>
<row align="center">
  <stack align="center">
    <title>User</title>
    <text>Alice</text>
    <text>Bob</text>
  </stack>
  <band tone="accent" align="center">
    <title>Role</title>
    <text>管理员</text>
    <text>审计员</text>
  </band>
  <stack align="center">
    <title>Permission</title>
    <text>`orders:write`</text>
    <text>`audit:read`</text>
  </stack>
</row>
<join>通过角色解耦用户与底层权限</join>
<text tone="muted" align="center">新增人员只需绑定角色，不直接改权限表</text>
```

---

## 样例二：可调参数交互图表（Play 模式）

当静态图不足以说明「参数变化如何影响结果」时，仍然使用同一个 `garden compose` 围栏，不需要切换语法体系。

### 第一步：写自然语言意图

在推理性能优化文章 `content/posts/kv-cache-budget.md` 中写下你的交互设想：

````markdown
```garden compose
做一个 KV Cache 显存预算试算器：
读者可以切换模型规格（7B 为每 token 0.5 MB，14B 为 0.8 MB，70B 为 2.5 MB），
拖动并发请求数（1 到 16，默认 4）和上下文长度（1024 到 32768，步长 1024，默认 4096）。
展示单请求 KV 显存、总 KV 显存（GB，保留 1 位小数），并用柱状图对比 2K、4K、8K、16K、32K 长度下的总显存占用。
```
````

### 第二步与第三步：检查与 AI 编译

运行 `make check diff` 确认待编译块后，让 AI 执行 `garden-compose` 技能。AI 会生成带 `{@body}` 响应式状态与 `<choice>` / `<slider>` / `<chart>` 控件的 Play 围栏，并通过 `garden ui check` 验证表达式与图表刻度无误后写回文章。

### 第四步：实际编译结果与部署

读者在网页或手机上可以直接点击规格、拖动滑杆，所有指标和柱状图实时重算：

```garden compose #ai-demo-kv-budget
caption: 调整模型规模、并发数与上下文窗口，观察 KV Cache 总显存随序列长度线性增长。
intent: |
  做一个 KV Cache 显存预算试算器：切换模型规格（7B/14B/70B），拖动并发请求数与上下文长度，展示单请求与总显存并绘制不同窗口下的柱状图。
---
{@body const [perTokenKb, setPerTokenKb] = DIL.useState(512)}
{@body const [batch, setBatch] = DIL.useState(4)}
{@body const [ctxLen, setCtxLen] = DIL.useState(4096)}
{@body const singleGb = round((perTokenKb * ctxLen) / 104857.6) / 10}
{@body const totalGb = round((perTokenKb * ctxLen * batch) / 104857.6) / 10}
{@body const rows = [
  { win: "2K", gb: round((perTokenKb * 2048 * batch) / 104857.6) / 10 },
  { win: "4K", gb: round((perTokenKb * 4096 * batch) / 104857.6) / 10 },
  { win: "8K", gb: round((perTokenKb * 8192 * batch) / 104857.6) / 10 },
  { win: "16K", gb: round((perTokenKb * 16384 * batch) / 104857.6) / 10 },
  { win: "32K", gb: round((perTokenKb * 32768 * batch) / 104857.6) / 10 }
]}

<choice bind="perTokenKb" label="模型规格（每 Token KV 开销）" options={[{ value: 512, label: "7B (0.5 MB/tok)" }, { value: 819, label: "14B (0.8 MB/tok)" }, { value: 2560, label: "70B (2.5 MB/tok)" }]} />
<slider bind="batch" label="并发请求数 (Batch)" min={1} max={16} step={1} unit="路" />
<slider bind="ctxLen" label="当前上下文长度" min={1024} max={32768} step={1024} unit="tok" />

<columns>
  <stat label="单路请求 KV 显存" value={singleGb} unit="GB" />
  <stat label="当前总 KV 显存" value={totalGb} unit="GB" hint="不含模型权重本身" />
</columns>

<chart data={rows} x={win} yLabel="总 KV 显存 (GB)" height={240} overflow="expand">
  <bar y={gb} label="总 KV 显存 (GB)" tone="accent" />
</chart>
```

---

## 样例三：代码演进对比（完整代码 +「对比上一版」切换）

写源码重构或配置变更时，读者既想一键复制**新版完整代码**，又想看清**和上一版到底改了哪几行**。

### 第一步：在完整代码下方写一句改动意图

先贴上改好后的完整代码围栏，紧接着在正下方放一个 `garden compose` 块说明上一版是什么：

````markdown
```go
func openStore(path string) (*Store, error) {
	return openWithMode(path, ModeWAL, WithSyncInterval(200*time.Millisecond))
}
```

```garden compose
和上一版比：之前只传了 ModeJournal，没有 WithSyncInterval 参数，生成对比上一版的 diff。
```
````

### 第二步与第三步：检查与 AI 重写为紧邻 `diff` 块

`make check diff` 提示存在未编译块后，AI 会通过 `garden ui apply` 把下面那段 `garden compose` 替换为紧挨着完整代码的 `diff` 围栏（注：`diff` 围栏前面必须紧跟完整代码块，单独放 `diff` 会触发 `diff-orphan` 结构错误）。

### 第四步：实际渲染效果

引擎自动将相邻的「完整代码块 + `diff` 块」合并为右上角带 **「代码 / 对比上一版」** 标签切换的单个代码框，且无论停留在哪个标签，点击复制按钮始终复制完整的新版代码：

```go
func openStore(path string) (*Store, error) {
	return openWithMode(path, ModeWAL, WithSyncInterval(200*time.Millisecond))
}
```

```diff
 func openStore(path string) (*Store, error) {
-	return openWithMode(path, ModeJournal)
+	return openWithMode(path, ModeWAL, WithSyncInterval(200*time.Millisecond))
 }
```

---

## 写好自然语言意图的四个窍门

为了让 AI 一次生成准确、克制的说明布局，描述想法时重点写清**内容结构关系**，而不是写像素和颜色：

1. **说清分几块与方向**：例如「三列并排」「自上而下四层」「上下两行对照」。
2. **给每块起短标题**：把图上要摆出来的词直接写出来，解释文字归在标题下面，避免用二十字长句当节点标题。
3. **写明连接与先后**：谁指向谁、从哪里分叉或汇总；如果没有顺序依赖，直接写「这几项并列，没有先后顺序」。
4. **点名视觉重点**：例如「中间的 Role 是重点」「下面一行新流程是重点，上面旧流程做浅底参照」。
