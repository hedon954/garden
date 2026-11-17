---
title: AI 协作
navTitle: AI 协作
description: 从最简指标卡到可调参数图表、代码演进对比，以及任意 HTML 与 Markdown 自由组合的 8 个真实样例，完整演示「自然语言 → 发布检查 → AI 重写 → 部署」协作流。
section: guide
order: 12
---

在 Garden 中表达结构图、数据对比或交互控件，**不需要作者背诵标签目录或手写前端代码**。整个 AI 协作流程固定为四步闭环：

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

下面用 **8 个由简到繁的真实写作样例** 走完这一能力链路，最后展示「内置图示都不合适时，如何把 `<html>` 与 `<markdown>` 块自由混排进同一组件」。

---

## 1. 关键指标卡（最简静态排版）

写性能调优或复盘文章时，几个核心数字与其各自一句短说明，最适合摆成并排指标卡。

**提示词**

````markdown
```garden compose
把这组压测数字摆成一行三个指标卡：
- P99 延迟：18 ms（较优化前下降 42%，这一张做重点高亮）
- 单核吞吐：6.4 万 req/s（稳态压测峰值）
- 内存占用：142 MB（RSS 常驻内存）
```
````

**渲染图**

```garden compose #ai-demo-metrics
<intent>
把这组压测数字摆成一行三个指标卡：P99 延迟 18 ms（较优化前下降 42%，这一张做重点高亮），单核吞吐 6.4 万 req/s（稳态压测峰值），内存占用 142 MB（RSS 常驻内存）。
</intent>
<row gap={2} align="stretch">
  <box padding={3} gap={1} radius="md" border="subtle" tone="accent">
    <kpi value="18" unit="ms" label="P99 延迟" />
    <text size="sm">较优化前下降 42%</text>
  </box>
  <box padding={3} gap={1} radius="md" border="subtle">
    <kpi value="6.4 万" unit="req/s" label="单核吞吐" />
    <text size="sm">稳态压测峰值</text>
  </box>
  <box padding={3} gap={1} radius="md" border="subtle">
    <kpi value="142" unit="MB" label="内存占用" />
    <text size="sm">RSS 常驻内存</text>
  </box>
</row>
```

---

## 2. 两套方案对照卡

在同一前提下比较两种做法的取舍，一行自然语言即可生成左右等高的对照卡片（移动端自动上下堆叠）。

**提示词**

````markdown
```garden compose
对比两种消息推送方案：
- 定时轮询：每 5 秒请求一次，实现简单但空转流量高
- 长连接推送：状态变化时主动下发，省流量但要维护心跳
```
````

**渲染图**

```garden compose #ai-demo-compare
<intent>
对比两种消息推送方案：定时轮询（每 5 秒请求一次，实现简单但空转流量高）与长连接推送（状态变化时主动下发，省流量但要维护心跳）。
</intent>
<compare>
  <item>
    <text>⏱️ 定时轮询：每 5 秒请求一次，实现简单但空转流量高。</text>
  </item>
  <item>
    <text>⚡ 长连接推送：状态变化时主动下发，省流量但要维护心跳。</text>
  </item>
</compare>
```

---

## 3. 带语义图标的要点清单

当几条并列说明各自都有小标题和一两句正文时，用带图标窄栏的列表比干巴巴的 bullet 更易扫读。

**提示词**

````markdown
```garden compose
三条服务上线前必查要点，左边配图标，右边标题加说明：
1. 配置核对：确认生产环境变量与密钥指纹已切换到正式环境。
2. 连接池上限：数据库连接数乘以实例副本数不得超过主库上限。
3. 回滚开关：保留一分钟内切回旧版本镜像的灰度开关。
```
````

**渲染图**

```garden compose #ai-demo-icon-list
<intent>
三条服务上线前必查要点，左边配图标，右边标题加说明：配置核对、连接池上限、回滚开关。
</intent>
<icon-list title="上线前核对清单">
  <entry icon="check-circle" title="配置核对">
    <text>确认生产环境变量与密钥指纹已切换到正式环境。</text>
  </entry>
  <entry icon="server" title="连接池上限">
    <text>数据库连接数乘以实例副本数不得超过主库上限。</text>
  </entry>
  <entry icon="shield" title="回滚开关">
    <text>保留一分钟内切回旧版本镜像的灰度开关。</text>
  </entry>
</icon-list>
```

---

## 4. 多列架构关联图（附完整 CLI 协作步骤）

前面三个小例子展示了 `garden compose` 的轻量写法；下面用一张三列关联图，完整走一遍 **「写意图 → 检查拦截 → AI 写回 → 复检上线」** 的工程闭环。

**提示词**

假设你在写一篇权限系统文章 `content/posts/rbac-model.md`，想画一张三列关联图（也可以在 Typora / VS Code 里输入 `/garden` 选「关联图」模板填入材料）：

````markdown
```garden compose
三列并排：左边是 User（包含 Alice、Bob），中间是 Role（包含 管理员、审计员），右边是 Permission（包含 orders:write、audit:read）。
Role 在正中间把用户和权限解耦连接起来，Role 是视觉重点。底部加一句结论：新增人员只需绑定角色，不直接改权限表。
```
````

**自动检查**

如果你在编译前运行 `make check diff` 或直接 `git commit`，检查器会精确定位行号并提示调用内置技能：

```console
$ make check diff
content/posts/rbac-model.md:14  -  compose-uncompiled  还有没编译的 compose 想法
请调用 garden-compose skill（.agents/skills/garden-compose/SKILL.md），修复以上错误块后重新校验。
```

把这句提示（或「帮我编译 `content/posts/rbac-model.md`」）发给 Cursor / Claude Code / Codex。Agent 会自动读取站点里的 `.agents/skills/garden-compose/SKILL.md`：

1. 运行 `npx --no-install garden ui scan content/posts/rbac-model.md` 获取该块的行号与 `intentHash`。
2. 按需查阅组件契约，把原话保留在 `<intent>` 中，生成结构标签。
3. 运行 `npx --no-install garden ui apply content/posts/rbac-model.md --intent-hash <哈希> --file replacement.md` 安全替换该块，并再次执行 `npx --no-install garden verify content/posts/rbac-model.md` 确认零错误。

**渲染图**

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

## 5. 多角色交互时序图

讲网络协议、登录鉴权或缓存回源时，把请求与回包按泳道排开，谁在什么时候给谁发消息一目了然。

**提示词**

````markdown
```garden compose
画一张 CDN 缓存未命中的时序图，有三个参与方：浏览器、CDN 边缘、源站 API。
1. 浏览器 → CDN 边缘：请求文章页面 GET /posts
2. CDN 边缘 → 源站 API：缓存未命中，发起回源
3. 源站 API → CDN 边缘：返回 HTML 与 ETag 缓存头
4. CDN 边缘 → 浏览器：写入边缘缓存并响应 200
```
````

**渲染图**

```garden compose #ai-demo-lanes
<intent>
画一张 CDN 缓存未命中的时序图，三个参与方为浏览器、CDN 边缘、源站 API，依次请求页面、回源查询、返回 HTML 与 ETag、写入缓存并响应 200。
</intent>
<lanes>
  <actor>浏览器</actor>
  <actor>CDN 边缘</actor>
  <actor>源站 API</actor>
  <message from="1" to="2">请求页面 GET /posts</message>
  <message from="2" to="3">缓存未命中，发起回源</message>
  <message from="3" to="2" tone="back">返回 HTML 与 ETag</message>
  <message from="2" to="1" tone="back">写入缓存并响应 200</message>
</lanes>
```

---

## 6. 可调参数交互图表（Play 模式）

当静态图不足以说明「参数变化如何影响结果」时，仍然使用同一个 `garden compose` 围栏，不需要切换语法体系。

**提示词**

在推理性能优化文章 `content/posts/kv-cache-budget.md` 中写下交互设想：

````markdown
```garden compose
做一个 KV Cache 显存预算试算器：
读者可以切换模型规格（7B 为每 token 0.5 MB，14B 为 0.8 MB，70B 为 2.5 MB），
拖动并发请求数（1 到 16，默认 4）和上下文长度（1024 到 32768，步长 1024，默认 4096）。
展示单请求 KV 显存、总 KV 显存（GB，保留 1 位小数），并用柱状图对比 2K、4K、8K、16K、32K 长度下的总显存占用。
```
````

**渲染图**

运行 `make check diff` 确认待编译块后，AI 通过 `garden-compose` 生成带 `{@body}` 响应式状态与 `<choice>` / `<slider>` / `<chart>` 控件的 Play 围栏，并通过 `garden ui check` 验证表达式与图表刻度无误后写回文章。读者可直接切换规格并拖动滑杆：

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

## 7. 代码演进对比（完整代码 +「对比上一版」切换）

写源码重构或配置变更时，读者既想一键复制**新版完整代码**，又想看清**和上一版到底改了哪几行**。

**提示词**

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

`make check diff` 提示存在未编译块后，AI 会通过 `garden ui apply` 把下面那段 `garden compose` 替换为紧挨着完整代码的 `diff` 围栏（注：`diff` 围栏前面必须紧跟完整代码块，单独放 `diff` 会触发 `diff-orphan` 结构错误）。

**渲染图**

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

## 8. 内置图示都不适合时，自由组合 HTML 与 Markdown

当内置的 20 种预设图示都无法准确表达你的想法时，**不需要跳出 `garden compose`**。同一个围栏内可以直接组合任意 HTML 块与 Markdown 块（如表格、列表、折叠块与自定义状态条），并沿用站点的深浅色与排版规范。

**提示词**

````markdown
```garden compose
内置图示都不太适合，请用任意 HTML 和 Markdown 组合一个「发布门禁看板」：
1. 顶部用 HTML 画一条两栏横幅：左边显示「发布窗口：周五 14:00 灰度」，右边显示「状态：门禁就绪」胶囊。
2. 下方左右并排：左边用 Markdown 表格列出三项核对门槛与当前值；右边用 HTML 放一个默认展开的折叠预案，写明回滚触发条件与联系人。
```
````

**渲染图**

```garden compose #ai-demo-html-markdown
<intent>
内置图示都不太适合，请用任意 HTML 和 Markdown 组合一个发布门禁看板：顶部用 HTML 画左右两栏状态横幅，下方左栏放 Markdown 核对表，右栏放 HTML 可折叠回滚预案。
</intent>
<stack gap={2}>
  <box padding={3} radius="md" border="subtle" background="surface-secondary">
    <html>
      <div style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px">
        <span style="font-weight:600;color:var(--ink)">发布窗口：周五 14:00 灰度 10%</span>
        <span style="padding:2px 10px;border-radius:999px;border:1px solid var(--rule);background:var(--paper);font-size:12px;color:var(--ink)">门禁就绪 · 3/3 通过</span>
      </div>
    </html>
  </box>
  <row gap={2} align="stretch">
    <box padding={3} radius="md" border="subtle">
      <markdown>
### 门禁核对项

| 指标 | 要求 | 当前 |
| --- | --- | --- |
| 错误率 | `< 0.1%` | <u>0.02%</u> |
| P99 延迟 | `< 50 ms` | 18 ms |
| 回滚镜像 | 已预热 | 就绪 |
      </markdown>
    </box>
    <box padding={3} radius="md" border="subtle">
      <html>
        <details open>
          <summary style="font-weight:600;color:var(--ink)">应急回滚预案（点击可收起）</summary>
          <p style="margin:10px 0 6px;color:var(--soft)">任一核心接口 5xx 连续 2 分钟超过 0.5%，立即切回上一稳定版本：</p>
          <ul style="margin:0;padding-left:18px;color:var(--soft)">
            <li>值班负责人：@oncall-infra</li>
            <li>目标版本：上一个绿色构建 SHA</li>
          </ul>
        </details>
      </html>
    </box>
  </row>
</stack>
```

---

## 写好自然语言意图的四个窍门

为了让 AI 一次生成准确、克制的说明布局，描述想法时重点写清**内容结构关系**，而不是写像素和颜色：

1. **说清分几块与方向**：例如「一行三个指标卡」「三列并排」「自上而下四层」「左右两栏混排」。
2. **给每块起短标题**：把图上要摆出来的词直接写出来，解释文字归在标题下面，避免用二十字长句当节点标题。
3. **写明连接与先后**：谁指向谁、从哪里分叉或汇总；如果没有顺序依赖，直接写「这几项并列，没有先后顺序」。
4. **点名视觉重点或兜底组合**：例如「P99 延迟那张高亮」「内置图示都不合适时，左栏用 Markdown 表格、右栏用 HTML 折叠块」。
