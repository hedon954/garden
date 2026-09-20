import {
  Globe,
  VideoCamera,
  WechatLogo,
  XLogo,
} from "@phosphor-icons/react/ssr";

const embedTypes = [
  {
    title: "YouTube / Bilibili",
    description: "识别普通分享链接，自动转换成响应式播放器，并保留原站入口。",
    Icon: VideoCamera,
  },
  {
    title: "X / Twitter",
    description: "以带平台标识的摘要卡片展示，避免依赖容易失效的第三方脚本。",
    Icon: XLogo,
  },
  {
    title: "微信公众号",
    description: "保留标题、摘要和原文链接；微信禁止稳定 iframe 时仍有完整降级体验。",
    Icon: WechatLogo,
  },
  {
    title: "其他网站",
    description: "手动提供标题、摘要与封面，生成不依赖远端抓取的网页预览卡片。",
    Icon: Globe,
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
        <p className="eyebrow">EMBEDS / 高级嵌入</p>
        <h2 id="garden-media-title">文章不只能放文字。</h2>
        <p>
          本地图片、音频和视频继续使用标准 Markdown / HTML；外部平台统一使用
          <code> embed </code>代码块。可播放的平台直接播放，受平台限制的内容自动退化为摘要卡片。
        </p>
      </header>

      <div className="garden-media-layout">
        <ul className="garden-media-providers">
          {embedTypes.map(({ title, description, Icon }, index) => (
            <li key={title}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <Icon size={22} aria-hidden="true" />
              <div>
                <strong>{title}</strong>
                <p>{description}</p>
              </div>
            </li>
          ))}
        </ul>

        <div className="garden-media-source">
          <div>
            <span>content/posts/example.md</span>
            <small>Markdown</small>
          </div>
          <pre><code>{embedSource}</code></pre>
        </div>
      </div>

      <aside className="garden-media-boundary">
        <strong>为什么不自动抓网页摘要？</strong>
        <p>
          构建阶段主动抓取任意 URL 会带来 SSRF、超时和内容漂移风险。Garden 选择把摘要写进 Markdown：发布结果可预测，原站失效时文章也仍然可读。写稿时可用 <code>make embed URL=...</code> 拉一次 Open Graph，检查后再贴进围栏。
        </p>
      </aside>
    </section>
  );
}
