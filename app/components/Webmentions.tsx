import { LinkSimple, Quotes } from "@phosphor-icons/react/ssr";

export function Webmentions() {
  return (
    <section className="webmentions" aria-labelledby="webmentions-heading">
      <div className="webmention-title">
        <LinkSimple size={21} />
        <div>
          <h2 id="webmentions-heading">来自开放网络的回应</h2>
          <p>Webmentions 会把其他网站上的引用与回复带回这篇文章。</p>
        </div>
      </div>
      <div className="webmention-preview">
        <Quotes size={20} weight="fill" />
        <p>
          接入域名后，这里将自动显示喜欢、转发、引用和站外回复；文章页已为该信息流预留稳定位置。
        </p>
      </div>
    </section>
  );
}
