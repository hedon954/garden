import Link from "next/link";
import { columns, postHref, posts } from "./lib/content";
import { ThoughtCard } from "./components/ThoughtCard";
import { getPublishedThoughts } from "./lib/public-thoughts";
import { githubUrl, siteConfig } from "./site.config";

export const metadata = {
  title: { absolute: siteConfig.name },
  description: siteConfig.description,
};

function day(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export default function Home() {
  const recent = [...posts].sort((left, right) => Date.parse(right.date) - Date.parse(left.date));
  const feature = recent[0];
  const pinned = posts.filter((post) => post.pinned);
  const thoughts = getPublishedThoughts();
  const series = Array.from(
    columns.reduce((result, entry) => {
      const existing = result.get(entry.column ?? "");
      if (existing) existing.push(entry);
      else result.set(entry.column ?? "", [entry]);
      return result;
    }, new Map<string, typeof columns>()),
  );

  return (
    <main className="sh-main" id="content">
      <section className="sh-intro">
        <h1>{siteConfig.pages.home.title}</h1>
        <p>{siteConfig.pages.home.subtitle || siteConfig.description}</p>
        <div className="links">
          <Link href="/about">关于我</Link>
          <a href={githubUrl} rel="me">GitHub</a>
          <a href="/rss.xml">RSS 订阅</a>
        </div>
      </section>

      {posts.length > 0 && feature ? (
        <article className="sh-feature" aria-labelledby="ft">
          <div className="cover" style={{ background: "var(--cover)" }}>
            {feature.cover ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={feature.cover} alt="" />
            ) : null}
          </div>
          <div>
            <p className="kicker">
              <span>最新文章</span>
              <time className="num" dateTime={day(feature.date)}>{day(feature.date)}</time>
              {feature.topic ? <span>{feature.topic}</span> : null}
            </p>
            <h2 id="ft"><Link href={postHref(feature)}>{feature.title}</Link></h2>
            {feature.description ? <p>{feature.description}</p> : null}
            {feature.tags?.length ? (
              <p className="tags">{feature.tags.map((tag) => <span key={tag}>#{tag}</span>)}</p>
            ) : null}
          </div>
        </article>
      ) : null}

      <div className="sh-home-grid">
        <section className="sh-section" aria-labelledby="h-recent">
          <div className="sh-sec-head">
            <h2 id="h-recent">最近更新</h2>
            <Link className="sh-more" href="/blog">全部 {posts.length} 篇</Link>
          </div>
          <ol className="sh-rows">
            {recent.slice(0, 7).map((post) => (
              <li className="sh-row" key={post.path}>
                <time className="num" dateTime={day(post.date)}>{day(post.date)}</time>
                <h3><Link href={postHref(post)}>{post.title}</Link></h3>
                {post.description ? <p>{post.description}</p> : null}
                {post.topic ? <Link className="cat" href={`/blog?topic=${encodeURIComponent(post.topic)}`}>{post.topic}</Link> : null}
              </li>
            ))}
          </ol>
        </section>
        {pinned.length > 0 ? (
          <section className="sh-section" aria-labelledby="h-pin">
            <div className="sh-sec-head section-heading accent-heading"><h2 id="h-pin">置顶博文</h2></div>
            <ul className="sh-side-list">
              {pinned.map((post) => (
                <li key={post.path}>
                  <Link href={postHref(post)}>{post.title}</Link>
                  <span><time className="num" dateTime={day(post.date)}>{day(post.date)}</time>{post.topic ? `　${post.topic}` : ""}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>

      {columns[0] && series.length ? (
        <section className="sh-section" aria-labelledby="h-cols">
          <div className="sh-sec-head">
            <h2 id="h-cols">主题专栏</h2>
            <Link className="sh-more" href="/columns">全部专栏</Link>
          </div>
          <div className="sh-cols">
            {series.map(([slug, entries]) => {
              const first = entries[0];
              return (
                <article className="sh-col" key={slug}>
                  <div className="cover" style={{ background: "var(--well)" }}>
                    {first.columnCover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={first.columnCover} alt={first.columnCoverAlt ?? ""} />
                    ) : null}
                  </div>
                  <div className="body">
                    <h3><Link href={`/columns#${slug}`}>{first.columnTitle}</Link></h3>
                    <p className="count">{entries.length} 篇，{first.columnStatus ?? "持续更新"}</p>
                    <p>{first.columnDescription ?? first.description}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}

      {thoughts.length > 0 ? (
        <section className="sh-section" aria-labelledby="h-thoughts">
          <div className="sh-sec-head">
            <h2 id="h-thoughts">最近随想</h2>
            <Link className="sh-more" href="/thoughts">全部随想</Link>
          </div>
          <div className="home-thought-list">
            {thoughts.slice(0, 5).map((thought) => (
              <ThoughtCard key={thought.slug} thought={thought} />
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
