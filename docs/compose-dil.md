# Compose DIL（Garden 表达层）

面向博客静态说明图的受限界面语言。模型/作者写出 **Markdown 叶子 + 目录标签 + 设计 token 属性**；构建期一拍编译成 HTML。不做流式重编译、Worker 沙箱或 AppBlock。

## 一棵树里有什么

```text
## 标题叶子          → title
段落与 **粗体**      → text（粗体进子节点式 HTML）
<box padding={3} background="surface-secondary" radius="lg">
  <icon name="shield"/>
  <title>策略点</title>
  <caption>确定性控制</caption>
  <row gap={2}>…</row>
</box>
```

Markdown 与组件同树：盒子旁可以是标题/段落；盒子里可以是 icon、title、text、嵌套 row/stack/grid。

## 语法子集

| 构造 | 静态 diagram | Play（可选） |
| --- | --- | --- |
| Markdown 标题/段落/`**bold**`/`code` | 是 | 是 |
| 目录标签（见 compose-catalog） | 是 | 是 + 交互件 |
| `padding`/`gap`/`radius`/`background`/`size`/`align`/`justify`/`wrap`/`border`/`tone` | 是 | 是 |
| `<icon name="…">` | 是 | 是 |
| `{@body}` / `{expr}` / `{#if}` / `{#each}` | **不解析**（diagram） | 受限白名单 |
| 流式未闭合修复 | 否（直接报错） | 否 |

`<intent>…</intent>` 只存作者意图，不进读者可见 HTML。

## 编译路径

```
garden compose fence
  ├─ 无标签 → uncompiled（想法，构建/校验失败）
  ├─ diagram 标签树 → markup.mjs → render.mjs → 静态 HTML
  └─ play（含 {@body}/slider 等）→ dil.mjs → 内部 Ui IR → 交互叶子
```

作者语言是小写标签。PascalCase 仅是 play 内部编译目标，不是作者输入。

## 和 ChatGPT Intelligent UI 的对齐点

- 同：Markdown + 目录标签同树、token 化间距/表面、一等 icon、自由嵌套。
- 不同：颜色走 Claude 纸色 token；一拍静态渲染；无 Worker/流式/AppBlock。

## Chart 域 / 色板 / 外壳（play）

- **系列色**走 `--gui-series-*`，绑定 `--gui-info` 等图表色，**不**再用 Claude 纸面 `--blue`（近黑）。
- `palette="series"`（默认）：按系列 `tone` 上色。`palette="categorical"`：按类别序号用 `--gui-cat-0…7`。
- `yStep`：显式纵轴步长（如 `0.08` → 0/8%/16%/…）。`overflow="expand"`（默认）在数据超出 `yMin`/`yMax` 时扩大域；`clip` 保持域并在图内钳制绘制（不静默穿出 SVG）。
- 块头 `frame: none`：去掉 `.garden-ui` 外框描边（滑杆对照 GPT 时可选用）；默认 `card`。
- 标题左 / 徽章右：通用 `<stack direction="row" justify="between" align="center">`，不是图表专用头。
