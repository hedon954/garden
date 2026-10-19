---
title: 嵌入网页片段（html）
navTitle: 嵌入网页片段
description: 在沙盒 iframe 中运行独立的 HTML、CSS 与 JavaScript 演示片段。
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

````markdown
```garden html
title: 字符长度与预计阅读耗时小工具
height: 156
code: |
  <!doctype html>
  <html lang="zh-CN">
  <head><meta charset="utf-8" /></head>
  <body>
    <input id="txt" value="把文章放在自己的 Git 仓库里，推送后自动构建。" />
    <div>当前字符数：<strong id="count">23</strong> 字</div>
    <script>
      const input = document.getElementById("txt");
      const count = document.getElementById("count");
      input.addEventListener("input", () => { count.textContent = String(input.value.length); });
    </script>
  </body>
  </html>
```
````

- **用**：需要运行自定义 DOM 脚本、Canvas 绘图或独立 HTML 页面片段时（支持 `code` 内联或 `src` 引用文章同名目录下的 `.html` 文件）。
- **别用**：只需要滑杆调参数算公式时用 [`interactive`](/garden/components/interactive)；静态结构图用 [`figure`](/garden/components/figure)。

| 字段 | 必填 | 类型 | 说明 |
| :--- | :--- | :--- | :--- |
| `src` | 与 `code` 二选一 | 相对路径字符串 | 引用与当前 Markdown 同目录（或同名子目录）下的 `.html` 文件 |
| `code` | 与 `src` 二选一 | 多行字符串 | 直接内联编写的 HTML 源码（也可用别名 `html`） |
| `title` | 建议 | 字符串 | 卡片顶部栏标题及 `iframe` 的无障碍标题 |
| `height` | 否 | 数字 | 初始高度（像素，默认 `260`；加载后也会随内容高度自动调整） |
| `caption` | 否 | 字符串 | 底部的图注说明 |
