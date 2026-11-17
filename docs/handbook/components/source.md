---
title: 来源胶囊
navTitle: 来源胶囊
description: 详解 {source} 来源胶囊在句中标注出处的语法、站点图标与首字母回退机制、双端真实渲染与在线演练场。
section: components
order: 33
---

## 是什么

来源胶囊（Source Pill）是一种嵌入在正文句子内部的圆角微标签（参考 ChatGPT 引用来源胶丸规格）。在外部链接末尾紧跟 `{source}` 标记后，它会把链接渲染为**左侧带站点图标（或注册域名首字母徽标）、浅灰暖底、无下划线、无 `↗` 外链箭头**的紧凑胶囊。

## 有什么用

- **标注事实出处而不喧宾夺主**：写技术综述、行业数据或标准规范时，往往一两句话就要交代数据来自哪份论文、RFC 或官方文档。如果全用整行链接卡片会把段落切得支离破碎；用来源胶囊则能让引文出处像角标一样安静地贴合在句尾。
- **全自动图标兜底**：构建期抓到了目标站点的 Favicon 就直接展示站点图标；如果对方站点没有图标或处于离线环境，引擎会自动解析**可注册主域名（eTLD+1）的首字母**生成大写字母圆标（例如 `en.wikipedia.org` 取 `W`，`bbc.co.uk` 取 `B`），保证视觉始终整齐统一。

---

## 形态一：带站点图标的单处引用胶囊

### 怎么写

在外部 Markdown 链接的 `)` 后紧跟 `{source}`（中间不留空格），推荐把胶囊文字写成精炼的域名或短出处名：

```markdown
读书会（Book discussion club）的早期组织形态可参考维基百科词条 [wikipedia.org](https://en.wikipedia.org/wiki/Book_discussion_club){source}。
```

### 实际长什么样（Web 端与移动端双形态）

<div data-doc-showcase="单处来源胶囊真实渲染">

读书会（Book discussion club）的早期组织形态可参考维基百科词条 [wikipedia.org](https://en.wikipedia.org/wiki/Book_discussion_club){source}。

</div>

---

## 形态二：多来源并列与无图标域名首字母回退

### 怎么写

同一句话末尾或表格单元格内可以连续放置多个 `{source}` 胶囊；当某个冷门标准站或内网归档域名没有配置站点图标时，左侧会自动回退显示主域名首字母：

```markdown
HTTP/1.1 与通用语义拆分详见 IETF 标准 [RFC 9110](https://www.rfc-editor.org/rfc/rfc9110){source}，Markdown 基础语法边界遵循 [CommonMark](https://spec.commonmark.org/){source}，数学排版兼容参考 [KaTeX Docs](https://katex.org/docs/supported.html){source}。
```

- 写在反引号代码里的 `` `[站点](https://example.com){source}` `` 会原样显示为代码字面量，不会被替换；
- `)` 与 `{source}` 之间若有空格，保持为普通外链。

### 实际长什么样（Web 端与移动端双形态）

<div data-doc-showcase="多来源胶囊并列与首字母回退真实渲染（注意窄屏下的整颗胶囊换行保护）">

HTTP/1.1 与通用语义拆分详见 IETF 标准 [RFC 9110](https://www.rfc-editor.org/rfc/rfc9110){source}，Markdown 基础语法边界遵循 [CommonMark](https://spec.commonmark.org/){source}，数学排版兼容参考 [KaTeX Docs](https://katex.org/docs/supported.html){source}。

</div>

---

## 在线演练场：自定义出处域名与胶囊文案

在下方左侧修改句子、替换成任意外部网址（如 `https://news.ycombinator.com` 或 `https://arxiv.org`）或增删 `{source}`，点击 **「更新渲染」** 即可实时观察图标与域名首字母回退效果：

```doc-playground
{
  "title": "来源胶囊交互演练场",
  "description": "修改胶囊名称或更换任意 https:// 域名（未缓存图标的域名会自动生成首字母徽标），点击「更新渲染」查看效果。",
  "presets": [
    {
      "id": "single-source",
      "label": "单处引用胶囊",
      "code": "读书会的早期记录引自维基百科词条 [wikipedia.org](https://en.wikipedia.org/wiki/Book_discussion_club){source}。"
    },
    {
      "id": "multi-fallback",
      "label": "多来源与首字母回退",
      "code": "延迟基准数据综合自论文预印本 [arXiv](https://arxiv.org/abs/2309.06180){source}、标准草案 [IETF RFC](https://www.rfc-editor.org/rfc/rfc9110){source} 与社区讨论 [Hacker News](https://news.ycombinator.com/){source}。"
    }
  ]
}
```
