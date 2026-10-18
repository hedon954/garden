import Link from "next/link";
import { columns, postHref, posts } from "./lib/content";
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

type PinPost = (typeof posts)[number];
type PinStyle = "surface" | "accent" | "row";

function pinStyleOf(value: string | string[] | undefined): PinStyle | null {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === "surface" || raw === "accent" || raw === "row" ? raw : null;
}

function PinMark() {
  return (
    <svg className="pin" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 4.5h6l-.7 5.4 3.2 2.4v1.6h-4.2V19L12 20.2 10.7 19v-5.1H6.5v-1.6l3.2-2.4L9 4.5Z" />
    </svg>
  );
}

function PinMeta({ post, dot = false }: { post: PinPost; dot?: boolean }) {
  return (
    <span className="meta">
      <time className="num" dateTime={day(post.date)}>{day(post.date)}</time>
      {post.topic ? `${dot ? " · " : "　"}${post.topic}` : ""}
    </span>
  );
}

function PinnedSide({ items, style }: { items: PinPost[]; style: Exclude<PinStyle, "row"> | "plain" }) {
  if (style === "plain") {
    return (
      <section className="sh-section" aria-labelledby="h-pin">
        <div className="sh-sec-head section-heading accent-heading"><h2 id="h-pin">置顶</h2></div>
        <ul className="sh-side-list">
          {items.map((post) => (
            <li key={post.path}>
              <Link href={postHref(post)}>{post.title}</Link>
              <PinMeta post={post} />
            </li>
          ))}
        </ul>
      </section>
    );
  }
  if (style === "accent") {
    return (
      <section className="sh-section sh-pin sh-pin-accent" data-pinned="accent" aria-labelledby="h-pin">
        <div className="sh-sec-head"><h2 id="h-pin">置顶</h2></div>
        <ol>
          {items.map((post, index) => (
            <li key={post.path}>
              <span className="n" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
              <div>
                <h3><Link href={postHref(post)}>{post.title}</Link></h3>
                <PinMeta post={post} />
              </div>
            </li>
          ))}
        </ol>
      </section>
    );
  }
  return (
    <section className="sh-section sh-pin sh-pin-surface" data-pinned="surface" aria-labelledby="h-pin">
      <div className="sh-sec-head"><h2 id="h-pin"><PinMark />置顶</h2></div>
      <ul>
        {items.map((post) => (
          <li key={post.path}>
            <h3><Link href={postHref(post)}>{post.title}</Link></h3>
            {post.description ? <p className="excerpt">{post.description}</p> : null}
            <PinMeta post={post} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function PinnedRow({ items }: { items: PinPost[] }) {
  return (
    <section className="sh-section sh-pin sh-pin-row" data-pinned="row" aria-labelledby="h-pin">
      <div className="sh-sec-head"><h2 id="h-pin">置顶</h2></div>
      <div className="sh-pin-cards">
        {items.map((post) => (
          <article key={post.path}>
            <h3><Link href={postHref(post)}>{post.title}</Link></h3>
            {post.description ? <p className="excerpt">{post.description}</p> : null}
            <PinMeta post={post} dot />
          </article>
        ))}
      </div>
    </section>
  );
}

export default async function Home({
  searchParams,
}: {
  searchParams?: Promise<{ pinned?: string | string[] }>;
}) {
  // ?pinned=surface|accent|row previews the pin layouts. Remove after one is chosen.
  const query = (await searchParams) ?? {};
  const pinnedStyle = pinStyleOf(query.pinned);
  const recent = [...posts].sort((left, right) => Date.parse(right.date) - Date.parse(left.date));
  const feature = recent[0];
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
          <Link href="/about">关于我</Link>
          <a href={githubUrl} rel="me">GitHub</a>
          <a href="/rss.xml">RSS 订阅</a>
        </div>
      </section>

      {posts.length > 0 && feature ? (
        <article className="sh-feature" aria-labelledby="ft">
          {feature.cover ? (
            <div className="cover">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={feature.cover} alt="" />
            </div>
          ) : null}
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

      {pinnedStyle === "row" && pinned.length > 0 ? <PinnedRow items={pinned} /> : null}

      <div className={`sh-home-grid${pinnedStyle === "row" ? " is-solo" : ""}`}>
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
        {pinned.length > 0 && pinnedStyle !== "row" ? (
          <PinnedSide items={pinned} style={pinnedStyle ?? "plain"} />
        ) : null}
      </div>

      {columns[0] && series.length ? (
        <section className="sh-section" aria-labelledby="h-cols">
          <div className="sh-sec-head">
            <h2 id="h-cols">专栏</h2>
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
    </main>
  );
}
