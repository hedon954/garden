import Link from "next/link";
import { columns, formatDate, postHref, posts } from "./lib/content";
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

type Post = (typeof posts)[number];
type Series = Array<[string, typeof columns]>;
type Direction = "a" | "b" | "c";

function directionOf(value: string | string[] | undefined): Direction {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === "b" || raw === "c" ? raw : "a";
}

function PinMark() {
  return (
    <svg className="pin" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 4.5h6l-.7 5.4 3.2 2.4v1.6h-4.2V19L12 20.2 10.7 19v-5.1H6.5v-1.6l3.2-2.4L9 4.5Z" />
    </svg>
  );
}

function Meta({ post }: { post: Post }) {
  return (
    <span className="meta">
      <time className="num" dateTime={day(post.date)}>{formatDate(post.date)}</time>
      {post.topic ? ` · ${post.topic}` : ""}
    </span>
  );
}

function Intro() {
  return (
    <section className="sh-intro">
      <h1>{siteConfig.pages.home.title}</h1>
      <p>{siteConfig.pages.home.subtitle || siteConfig.description}</p>
      <div className="links">
        <Link href="/about">关于我</Link>
        <a href={githubUrl} rel="me">GitHub</a>
        <a href="/rss.xml">RSS 订阅</a>
      </div>
    </section>
  );
}

function Feature({ post, labelledBy = "ft" }: { post: Post; labelledBy?: string }) {
  return (
    <article className="sh-feature" aria-labelledby={labelledBy}>
      {post.cover ? (
        <div className="cover">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={post.cover} alt="" />
        </div>
      ) : null}
      <div className="copy">
        <p className="kicker">
          <span>最新文章</span>
          <time className="num" dateTime={day(post.date)}>{formatDate(post.date)}</time>
          {post.topic ? <span>{post.topic}</span> : null}
        </p>
        <h2 id={labelledBy}><Link href={postHref(post)}>{post.title}</Link></h2>
        {post.description ? <p>{post.description}</p> : null}
        {post.tags?.length ? (
          <p className="tags">{post.tags.map((tag) => <span key={tag}>#{tag}</span>)}</p>
        ) : null}
      </div>
    </article>
  );
}

function Recent({ items }: { items: Post[] }) {
  return (
    <section className="sh-section" aria-labelledby="h-recent">
      <div className="sh-sec-head">
        <h2 id="h-recent">最近更新</h2>
        <Link className="sh-more" href="/blog">全部 {posts.length} 篇</Link>
      </div>
      <ol className="sh-rows">
        {items.map((post) => (
          <li className="sh-row" key={post.path}>
            <time className="num" dateTime={day(post.date)}>{formatDate(post.date)}</time>
            <h3><Link href={postHref(post)}>{post.title}</Link></h3>
            {post.description ? <p>{post.description}</p> : null}
            {post.topic ? <Link className="cat" href={`/blog?topic=${encodeURIComponent(post.topic)}`}>{post.topic}</Link> : null}
          </li>
        ))}
      </ol>
    </section>
  );
}

function Columns({ series, variant }: { series: Series; variant: Direction }) {
  if (!series.length) return null;
  if (variant === "c") {
    return (
      <section className="sh-section sh-col-line" aria-labelledby="h-cols">
        <h2 id="h-cols">专栏</h2>
        <p>
          {series.map(([slug, entries]) => (
            <Link key={slug} href={`/columns#${slug}`}>{entries[0].columnTitle}</Link>
          ))}
        </p>
      </section>
    );
  }
  if (variant === "a") {
    return (
      <section className="sh-section" aria-labelledby="h-cols">
        <div className="sh-sec-head">
          <h2 id="h-cols">专栏</h2>
          <Link className="sh-more" href="/columns">全部专栏</Link>
        </div>
        <ol className="sh-col-index">
          {series.map(([slug, entries]) => (
            <li key={slug}>
              <Link href={`/columns#${slug}`}>{entries[0].columnTitle}</Link>
              <span>{entries.length} 篇</span>
            </li>
          ))}
        </ol>
      </section>
    );
  }
  return (
    <section className="sh-section" aria-labelledby="h-cols">
      <div className="sh-sec-head">
        <h2 id="h-cols">专栏</h2>
        <Link className="sh-more" href="/columns">全部专栏</Link>
      </div>
      <div className="sh-cols sh-cols-quiet">
        {series.map(([slug, entries]) => {
          const first = entries[0];
          return (
            <article className="sh-col" key={slug}>
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
  );
}

function HomeA({ feature, pinned, recent, series }: { feature: Post; pinned: Post[]; recent: Post[]; series: Series }) {
  return (
    <main className="sh-main home-a" id="content" data-home="a">
      <Intro />
      <Feature post={feature} />
      {pinned.length > 0 ? (
        <section className="sh-section sh-pin sh-pin-a" aria-labelledby="h-pin">
          <div className="sh-sec-head section-heading accent-heading"><h2 id="h-pin">置顶</h2></div>
          <div className="sh-pin-cards">
            {pinned.map((post) => (
              <article key={post.path}>
                <h3><Link href={postHref(post)}>{post.title}</Link></h3>
                {post.description ? <p className="excerpt">{post.description}</p> : null}
                <Meta post={post} />
              </article>
            ))}
          </div>
        </section>
      ) : null}
      <div className="sh-read">
        <Recent items={recent} />
      </div>
      {columns[0] && series.length ? <Columns series={series} variant="a" /> : null}
    </main>
  );
}

function HomeB({ feature, pinned, recent, series }: { feature: Post; pinned: Post[]; recent: Post[]; series: Series }) {
  return (
    <main className="sh-main home-b" id="content" data-home="b">
      <Intro />
      <Feature post={feature} />
      <div className="sh-split">
        <Recent items={recent} />
        {pinned.length > 0 ? (
          <section className="sh-section sh-pin sh-pin-b" aria-labelledby="h-pin">
            <div className="sh-sec-head"><h2 id="h-pin"><PinMark />置顶</h2></div>
            <ul>
              {pinned.map((post) => (
                <li key={post.path}>
                  <h3><Link href={postHref(post)}>{post.title}</Link></h3>
                  {post.description ? <p className="excerpt">{post.description}</p> : null}
                  <Meta post={post} />
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
      {columns[0] && series.length ? <Columns series={series} variant="b" /> : null}
    </main>
  );
}

function HomeC({ feature, pinned, recent, series }: { feature: Post; pinned: Post[]; recent: Post[]; series: Series }) {
  return (
    <main className="sh-main home-c" id="content" data-home="c">
      <Intro />
      <Feature post={feature} />
      {pinned.length > 0 ? (
        <section className="sh-section sh-pin sh-pin-c" aria-labelledby="h-pin">
          <div className="sh-sec-head"><h2 id="h-pin">置顶</h2></div>
          <ol>
            {pinned.map((post, index) => (
              <li key={post.path}>
                <span className="n" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <h3><Link href={postHref(post)}>{post.title}</Link></h3>
                  {post.description ? <p className="excerpt">{post.description}</p> : null}
                  <Meta post={post} />
                </div>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
      <Recent items={recent} />
      {columns[0] && series.length ? <Columns series={series} variant="c" /> : null}
    </main>
  );
}

export default async function Home({
  searchParams,
}: {
  searchParams?: Promise<{ home?: string | string[] }>;
}) {
  // ?home=a|b|c previews the three home compositions. Remove after one is chosen.
  const query = (await searchParams) ?? {};
  const direction = directionOf(query.home);
  const recentAll = [...posts].sort((left, right) => Date.parse(right.date) - Date.parse(left.date));
  const feature = recentAll[0];
  const pinned = posts.filter((post) => post.pinned);
  const recent = recentAll.filter((post) => post.path !== feature?.path).slice(0, 6);
  const series = Array.from(
    columns.reduce((result, entry) => {
      const existing = result.get(entry.column ?? "");
      if (existing) existing.push(entry);
      else result.set(entry.column ?? "", [entry]);
      return result;
    }, new Map<string, typeof columns>()),
  );

  if (!(posts.length > 0) || !feature) {
    return (
      <main className="sh-main" id="content">
        <Intro />
      </main>
    );
  }

  const props = { feature, pinned, recent, series };
  if (direction === "b") return <HomeB {...props} />;
  if (direction === "c") return <HomeC {...props} />;
  return <HomeA {...props} />;
}
