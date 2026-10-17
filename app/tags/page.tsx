import Link from "next/link";
import { posts } from "../lib/content";
import { PageIntro } from "../components/PageIntro";
import { siteConfig, siteDocumentTitle } from "../site.config";

export const metadata = {
  title: siteDocumentTitle,
  description: "按标签浏览文章。标签不是专栏，也不是分类。",
};

export default function TagsPage() {
  const counts = new Map<string, number>();
  for (const post of posts) {
    for (const tag of post.tags ?? []) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
  const tags = [...counts.entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0], "zh"));

  return (
    <main className="page-shell index-page">
      <PageIntro eyebrow="TAGS / 标签" title="标签" subtitle={siteConfig.description} />
      {tags.length ? (
        <ul className="sh-filters">
          {tags.map(([tag, count]) => (
            <li key={tag}>
              <Link className="sh-chip" href={`/blog?topic=${encodeURIComponent(tag)}`}>
                {tag}
                <span className="n">{count}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="sh-empty">还没有标签。</p>
      )}
      <p className="sh-colnote">
        专栏在 <Link href="/columns">专栏</Link>，不出现在分类里。
      </p>
    </main>
  );
}
