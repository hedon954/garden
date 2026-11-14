const mediaTypes = [
  {
    title: "YouTube / Bilibili",
    description: "把可播放的视频链接单独占一行，页面里就能播放，也能回到原站。",
  },
  {
    title: "其他网站",
    description: "单独一行的网址显示为链接卡片；句子里的链接在后面紧跟 {card} 才会变成卡片。",
  },
];

const mediaSource = `https://www.youtube.com/watch?v=VIDEO_ID

https://www.bilibili.com/video/BV1xx411c7mD`;

export function GardenMediaGuide() {
  return (
    <section className="garden-media" id="media" aria-labelledby="garden-media-title">
      <header>
        <h2 id="garden-media-title">视频和链接</h2>
        <p>
          自己的图片、音频和视频用 Markdown 或 <code>audio</code> / <code>video</code> 标签。
          YouTube / Bilibili 只要把链接单独一行。其他网站用链接卡片，不要写任意 iframe。
        </p>
      </header>

      <div className="garden-media-source">
        <div>
          <span>content/posts/example.md</span>
        </div>
        <pre><code>{mediaSource}</code></pre>
      </div>

      <ul className="garden-media-providers">
        {mediaTypes.map(({ title, description }) => (
          <li key={title}>
            <strong>{title}</strong>
            <p>{description}</p>
          </li>
        ))}
      </ul>

      <p className="garden-media-boundary">
        需要规范化短链或核对标题时，用 <code>npx garden embed URL</code> 打印一行可粘贴的地址，看过再贴进文章。
      </p>
    </section>
  );
}
