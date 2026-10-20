---
title: 嵌入网页片段（html）
navTitle: 嵌入网页片段
description: 在沙盒中运行一段独立的网页小工具、画布动画或演示。
section: components
order: 37
badge: html
---

```garden html
title: 字符长度与预计阅读耗时小工具
height: 156
code: |
  <!doctype html>
  <html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <style>
      body { margin: 0; padding: 16px 18px; font: 14px/1.6 system-ui, sans-serif; color: #1b1a18; background: #faf9f5; }
      input { width: 100%; box-sizing: border-box; padding: 8px 10px; border: 1px solid #d5d1c8; border-radius: 6px; font: inherit; background: #fff; color: #1b1a18; }
      .meta { margin-top: 10px; color: #6e6b64; font-variant-numeric: tabular-nums; }
      strong { color: #1b1a18; }
    </style>
  </head>
  <body>
    <input id="txt" value="把文章放在自己的 Git 仓库里，推送后自动构建。" aria-label="输入示例文本" />
    <div class="meta">当前字符数：<strong id="count">23</strong> 字</div>
    <script>
      const input = document.getElementById("txt");
      const count = document.getElementById("count");
      input.addEventListener("input", () => { count.textContent = String(input.value.length); });
    </script>
  </body>
  </html>
```

- **什么时候用**：内置组件画不出来的画布动画、物理模拟或独立小工具。
- **什么时候不用**：只需要拖动滑杆算公式时用[可调公式与参数](/garden/components/interactive)；静态图表或结构图优先用对应组件。

可以这样对 AI 说：

````markdown
```garden
做一个网页小工具，让读者输入一句话就能实时看到字符数。
```
````

## 字段说明

围栏写 ` ```garden html `（编辑器代码片段触发词 `;ghtml`）。

| 字段 | 是否必填 | 默认值 | 取值与限制 | 说明 |
| :--- | :--- | :--- | :--- | :--- |
| `src` | 与 `code` 二选一 | 无 | 相对路径（如 `./demo.html`；顶层写未知键名或 YAML 格式错误时报 `garden-yaml` 错误） | 引用当前文章同名子目录下的独立 `.html` 文件 |
| `code` | 与 `src` 二选一 | `---` 分隔线下的 HTML 正文或 `""` | 多行 HTML 字符串 | 直接内联的 HTML 源码（含 `<script>` 时运行在沙盒 `iframe` 中，也可以把 HTML 放在 `---` 分隔线下方） |
| `title` | 建议填写 | `"HTML"` | 字符串 | 框顶标题栏与无障碍 `iframe` 标题 |
| `height` | 可选 | 按内容高度自适应 | 数字（像素） | 初始高度（加载后会根据内容高度自动调整） |
