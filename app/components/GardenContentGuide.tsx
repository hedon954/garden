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
date: 2026-08-03 09:00:00
description: 这篇文章记录我为什么重新开始写博客。
tags: [Markdown, 博客]
pinned: false
cover: writing/first-post.jpg
---

正文从这里开始。

## 一个小标题

可以继续插入图片、代码、公式和 Mermaid 图表。`;

const thoughtSource = `---
title: 雨后的散步
date: 2026-08-03 18:30:00
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
    status: ongoing
    cover: /images/columns/writing-system.webp
    coverAlt: 桌面上的笔记本与钢笔
    posts:
      - writing/why-write
      - writing/collect-material
      - writing/revise-and-publish`;

type Guide = {
  id: string;
  label: string;
  title: string;
  introduction: string;
  steps: ReactNode[];
  result: string;
  path: string;
  source: string;
  language: string;
};

const guides: Guide[] = [
  {
    id: "write-post",
    label: "博文",
    title: "写一篇文章",
    introduction: "文件放在 content/posts/。路径就是网址，正文是普通 Markdown。可以按主题分子目录。",
    steps: [
      <>在 <code>content/posts/</code> 里新建一个 <code>.md</code> 文件。</>,
      <>开头写下标题、日期、摘要、主题和标签。封面可有可无。</>,
      <>接着写正文。图片用相对路径，和文件放在一起。</>,
    ],
    result: "推送后，这篇文章会出现在列表、主题、搜索和 RSS 里。",
    path: "content/posts/writing/first-post.md",
    source: postSource,
    language: "markdown",
  },
  {
    id: "write-thought",
    label: "随想",
    title: "写一条随想",
    introduction: "几句话、一张图或一个链接。字段更少。也可以在后台写，写完同样进仓库。",
    steps: [
      <>新建 <code>content/thoughts/文件名.md</code>，或在后台填写。</>,
      <>文件名就是地址。标题和日期写在开头。先存着就标成草稿。</>,
      <>图片、音频、视频和链接按顺序放进 <code>media</code>。</>,
    ],
    result: "它会出现在随想页，并且有自己的链接。",
    path: "content/thoughts/walk-after-rain.md",
    source: thoughtSource,
    language: "markdown",
  },
  {
    id: "make-column",
    label: "专栏",
    title: "把文章收成专栏",
    introduction: "专栏不复制文章。它只是 content/columns.yaml 里的一份阅读顺序。",
    steps: [
      <>在 <code>content/columns.yaml</code> 里写名称、介绍和封面。</>,
      <>在 <code>posts</code> 里填文章相对 <code>content/posts/</code> 的路径。</>,
      <>按你希望读者阅读的顺序排列。同一篇可以进多个专栏。</>,
    ],
    result: "读者按这个顺序读。文章页也会显示它属于哪一组，以及上一篇、下一篇。",
    path: "content/columns.yaml",
    source: columnSource,
    language: "yaml",
  },
];

export function GardenContentGuide() {
  return (
    <div className="garden-guide">
      <div className="garden-guide-sections">
        {guides.map((guide) => (
          <article className="garden-content-guide" id={guide.id} key={guide.id}>
            <div className="garden-content-copy">
              <p className="garden-content-label">{guide.label}</p>
              <h2>{guide.title}</h2>
              <p className="garden-content-introduction">{guide.introduction}</p>

              <ol className="garden-content-steps">
                {guide.steps.map((step, index) => (
                  <li key={index}>{step}</li>
                ))}
              </ol>

              <p className="garden-content-result">{guide.result}</p>
            </div>

            <SourcePanel
              path={guide.path}
              source={guide.source}
              language={guide.language}
            />
          </article>
        ))}
      </div>
    </div>
  );
}
