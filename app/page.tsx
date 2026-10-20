import Link from "next/link";
import { CoverImage } from "./components/CoverImage";
import { fullListDate, homeListDate } from "./lib/a2-meta";
import { columnStatusLabel, siteLang, ui } from "./lib/i18n";
import { columns, postHref, posts } from "./lib/content";
import { githubUrl, siteConfig } from "./site.config";
import { siteHref } from "./lib/site-href";
import { pageAlternates } from "./lib/page-alternates";

export const metadata = {
  title: { absolute: siteConfig.name },
  description: siteConfig.description,
  alternates: pageAlternates("/"),
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
  const t = ui();
  const recentAll = [...posts].sort((left, right) => Date.parse(right.date) - Date.parse(left.date));
  const feature = recentAll[0];
  const recent = recentAll.filter((post) => post.path !== feature?.path);
  const pinned = posts.filter((post) => post.pinned);
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
          <Link href={siteHref("/about")}>{t.homeAbout}</Link>
          <a href={githubUrl} rel="me">GitHub</a>
          <a href="/rss.xml">{t.homeRss}</a>
        </div>
      </section>

      {posts.length > 0 && feature ? (
        <article className="sh-feature" aria-labelledby="ft">
          {feature.cover ? (
            <div className="cover">
              <CoverImage src={feature.cover} image={feature.coverImage} alt="" sizes="(max-width: 700px) calc(100vw - 40px), 604px" priority />
            </div>
          ) : null}
          <div>
            <p className="kicker">
              <span>{t.homeLatest}</span>
              <time className="num" dateTime={day(feature.date)}>{fullListDate(feature.date, siteLang)}</time>
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
            <h2 id="h-recent">{t.homeRecent}</h2>
            <Link className="sh-more" href={siteHref("/blog")}>{t.homeAllPosts(posts.length)}</Link>
          </div>
          <ol className="sh-rows">
            {recent.slice(0, 6).map((post) => (
              <li className="sh-row" key={post.path}>
                <time className="num" dateTime={day(post.date)}>{homeListDate(post.date, undefined, siteLang)}</time>
                <h3><Link href={postHref(post)}>{post.title}</Link></h3>
                {post.description ? <p>{post.description}</p> : null}
              </li>
            ))}
          </ol>
        </section>
        {pinned.length > 0 ? (
          <section className="sh-section" aria-labelledby="h-pin">
            <div className="sh-sec-head section-heading accent-heading"><h2 id="h-pin">{t.homePinned}</h2></div>
            <ul className="sh-side-list">
              {pinned.map((post) => (
                <li key={post.path}>
                  <Link href={postHref(post)}>{post.title}</Link>
                  <span><time className="num" dateTime={day(post.date)}>{fullListDate(post.date, siteLang)}</time></span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>

      {columns[0] && series.length ? (
        <section className="sh-section" aria-labelledby="h-cols">
          <div className="sh-sec-head">
            <h2 id="h-cols">{t.homeColumns}</h2>
            <Link className="sh-more" href={siteHref("/columns")}>{t.homeAllColumns}</Link>
          </div>
          <div className="sh-cols">
            {series.map(([slug, entries]) => {
              const first = entries[0];
              return (
                <article className="sh-col" key={slug}>
                  <div className="cover" style={{ background: "var(--well)" }}>
                    {first.columnCover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={first.columnCover} alt={first.columnCoverAlt ?? ""} loading="lazy" decoding="async" />
                    ) : null}
                  </div>
                  <div className="body">
                    <h3><Link href={siteHref(`/columns/#${slug}`)}>{first.columnTitle}</Link></h3>
                    <p className="count">{t.columnCount(entries.length, columnStatusLabel(first.columnStatus))}</p>
                    <p>{first.columnDescription ?? first.description}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}
    </main>
  );
}
