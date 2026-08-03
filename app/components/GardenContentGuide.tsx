import type { ReactNode } from "react";

type SourcePanelProps = {
  path: string;
  source: string;
  language: string;
};

function SourcePanel({ path, source, language }: SourcePanelProps) {
  return (
    <div className="garden-source-panel">
      <div className="garden-source-bar">
        <span aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <code>{path}</code>
      </div>
      <pre>
        <code className={`language-${language}`}>{source}</code>
      </pre>
    </div>
  );
}

const postSource = `---
title: 我的第一篇文章
slug: first-post
date: 2026-08-03T09:00:00+08:00
description: 这篇文章记录我为什么重新开始写博客。
topic: 写作
tags: [Markdown, 博客]
pinned: false
cover: ./assets/cover.jpg
---

正文从这里开始。

## 一个小标题

可以继续插入图片、代码、公式和 Mermaid 图表。`;

const thoughtSource = `---
title: 雨后的散步
slug: walk-after-rain
date: 2026-08-03T18:30:00+08:00
tags: [生活]
media:
  - type: image
    src: ./assets/street.jpg
    alt: 雨后的街道
  - type: audio
    src: ./assets/rain.mp3
    title: 雨声
---

今天下班后多走了两公里。`;

const columnSource = `columns:
  - slug: writing-system
    title: 写作系统
    description: 记录从选题到发布的完整写作过程。
    status: 持续更新
    cover: /images/columns/writing-system.webp
    coverAlt: 桌面上的笔记本与钢笔
    posts:
      - writing/why-write
      - writing/collect-material
      - writing/revise-and-publish`;

type Guide = {
  id: string;
  number: string;
  label: string;
  title: string;
  introduction: string;
  steps: ReactNode[];
  features: string[];
  result: string;
  path: string;
  source: string;
  language: string;
};

const guides: Guide[] = [
  {
    id: "write-post",
    number: "01",
    label: "博文",
    title: "写一篇文章",
    introduction:
      "博文保存在 content/posts/ 中，可以按照主题建立任意层级的子目录。文件路径同时决定文章地址，正文仍然是普通 Markdown。",
    steps: [
      <>
        在 <code>content/posts/</code> 中创建一个 <code>.md</code> 文件。
      </>,
      <>在 Front Matter 中填写标题、日期、摘要、主题、标签和封面。</>,
      <>使用 Markdown 编写正文，图片和其他附件可以使用相对路径。</>,
    ],
    features: [
      "GFM 表格、任务列表与脚注",
      "TypeScript、Go、Rust 等代码高亮",
      "数学公式与 Mermaid 图表",
      "本地图片、音频和视频",
      "草稿、定时发布与置顶",
      "文章目录、上一篇与下一篇",
    ],
    result:
      "构建时会生成文章页面，并把标题、摘要和正文加入博文列表、主题归档、全文搜索与 RSS。",
    path: "content/posts/writing/first-post.md",
    source: postSource,
    language: "markdown",
  },
  {
    id: "write-thought",
    number: "02",
    label: "随想",
    title: "发布一条随想",
    introduction:
      "随想适合记录几句话、一个链接或一组多媒体。它同样保存在 Git 仓库中，只需要更少的字段，也可以通过可选管理后台发布。",
    steps: [
      <>
        直接创建 <code>content/thoughts/&lt;slug&gt;.md</code>，或者在管理后台填写内容。
      </>,
      <>填写标题、唯一 slug 和日期；需要暂存时加入草稿状态。</>,
      <>
        在 <code>media</code> 中按顺序添加图片、音频、视频或外部链接。
      </>,
    ],
    features: [
      "纯文字短内容",
      "多张图片与混合图集",
      "音频和视频",
      "带标题的外部链接",
      "草稿与公开状态",
      "独立永久链接",
    ],
    result:
      "发布后的内容会出现在随想时间线和首页最近随想中，每条随想都有可以单独分享的永久链接。",
    path: "content/thoughts/walk-after-rain.md",
    source: thoughtSource,
    language: "markdown",
  },
  {
    id: "make-column",
    number: "03",
    label: "专栏",
    title: "创建一个专栏",
    introduction:
      "专栏不复制文章，而是在 content/columns.yaml 中引用已经存在的博文。posts 的排列顺序就是专栏的阅读顺序。",
    steps: [
      <>
        在 <code>content/columns.yaml</code> 中添加专栏名称、介绍、状态和封面。
      </>,
      <>
        在 <code>posts</code> 中填写博文相对 <code>content/posts/</code> 的路径。
      </>,
      <>按照希望读者阅读的顺序排列路径；同一篇文章可以加入多个专栏。</>,
    ],
    features: [
      "专栏标题、说明和状态",
      "独立专栏封面",
      "文章顺序可控",
      "复用同一份 Markdown",
      "一篇文章加入多个专栏",
      "系列文章导航",
    ],
    result:
      "构建后会生成独立专栏页面。读者可以按照配置顺序浏览文章，文章页也会显示它所属的系列与前后篇目。",
    path: "content/columns.yaml",
    source: columnSource,
    language: "yaml",
  },
];

export function GardenContentGuide() {
  return (
    <section className="garden-guide" aria-labelledby="garden-guide-title">
      <header className="garden-guide-heading">
        <div>
          <p className="eyebrow">CONTENT / 内容</p>
          <h2 id="garden-guide-title">博文、随想和专栏</h2>
        </div>
        <p>
          三种内容使用不同的文件格式，但都保存在自己的 Git 仓库中。
          管理后台不是必需组件，直接编辑文件即可完成全部公开内容的维护和发布。
        </p>
      </header>

      <nav className="garden-guide-index" aria-label="内容类型">
        {guides.map((guide) => (
          <a href={`#${guide.id}`} key={guide.id}>
            <span>{guide.number}</span>
            <strong>{guide.title}</strong>
            <small>{guide.label}</small>
          </a>
        ))}
      </nav>

      <div className="garden-guide-sections">
        {guides.map((guide) => (
          <article className="garden-content-guide" id={guide.id} key={guide.id}>
            <div className="garden-content-copy">
              <p className="eyebrow">
                {guide.number} / {guide.label}
              </p>
              <h2>{guide.title}</h2>
              <p className="garden-content-introduction">{guide.introduction}</p>

              <ol className="garden-content-steps">
                {guide.steps.map((step, index) => (
                  <li key={index}>
                    <strong>{index + 1}</strong>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>

              <ul className="garden-content-features" aria-label={`${guide.title}支持的能力`}>
                {guide.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>

              <aside className="garden-content-result">
                <strong>发布后</strong>
                <p>{guide.result}</p>
              </aside>
            </div>

            <SourcePanel
              path={guide.path}
              source={guide.source}
              language={guide.language}
            />
          </article>
        ))}
      </div>
    </section>
  );
}
