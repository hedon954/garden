const embedTypes = [
  {
    title: "YouTube / Bilibili",
    description: "贴上分享链接，页面里就能播放，也能回到原站。",
  },
  {
    title: "X / Twitter",
    description: "显示成一张带出处的卡片。",
  },
  {
    title: "微信公众号",
    description: "留下标题、摘要和原文链接。微信不允许嵌进页面时，卡片仍然能点开。",
  },
  {
    title: "其他网站",
    description: "自己写标题、摘要和封面。",
  },
];

const embedSource = `\`\`\`embed
url: https://www.youtube.com/watch?v=VIDEO_ID
title: 这段视频讲了什么
description: 给读者一个值得点开的理由。
image: https://example.com/cover.jpg
\`\`\``;

export function GardenMediaGuide() {
  return (
    <section className="garden-media" id="media" aria-labelledby="garden-media-title">
      <header>
        <h2 id="garden-media-title">视频和链接</h2>
        <p>
          自己的图片、音频和视频用 Markdown。别人的页面用
          <code> embed </code>
          围栏。能播的直接播，不能播的显示成一张卡片。
        </p>
      </header>

      <div className="garden-media-source">
        <div>
          <span>content/posts/example.md</span>
        </div>
        <pre><code>{embedSource}</code></pre>
      </div>

      <ul className="garden-media-providers">
        {embedTypes.map(({ title, description }) => (
          <li key={title}>
            <strong>{title}</strong>
            <p>{description}</p>
          </li>
        ))}
      </ul>

      <p className="garden-media-boundary">
        摘要写在文章里。原站打不开，文章还在。需要时用 <code>make embed URL=...</code> 拉一次，看过再贴进去。
      </p>
    </section>
  );
}
