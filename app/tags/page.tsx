import Link from "next/link";
import { Suspense } from "react";
import { posts } from "../lib/content";
import { siteHref } from "../lib/site-href";
import { articleTagHref, tagCounts } from "../lib/tag-filter";
import { TagRedirect } from "../components/TagRedirect";
import { siteDocumentTitle } from "../site.config";
import { pageAlternates } from "../lib/page-alternates";
import { siteLang } from "../lib/i18n";

export const metadata = {
  title: siteDocumentTitle,
  description: siteLang === "en" ? "All tags." : "全部标签。",
  alternates: pageAlternates("/tags"),
};

export default function TagsPage() {
  const tags = tagCounts(posts);
  const en = siteLang === "en";
  return (
    <main className="sh-main" id="content">
      <div className="sh-head">
        <h1>{en ? "Tags" : "标签"}</h1>
        <p className="sh-deck">
          {en
            ? `${tags.length} tags, sorted by post count. Pick a tag to filter the archive.`
            : `${tags.length} 个标签，按文章数排序。点一个标签，查看带这个标签的文章。`}
        </p>
      </div>
      <Suspense>
        <TagRedirect />
      </Suspense>
      {tags.length ? (
        <ul className="sh-tagchips sh-tagindex" aria-label={en ? "All tags" : "全部标签"}>
          {tags.map(([tag, count]) => (
            <li key={tag}>
              <Link className="sh-tagchip" href={siteHref(articleTagHref(tag))}>
                #{tag}<span className="n num">{count}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="sh-deck">{en ? "No tags yet." : "还没有标签。"}</p>
      )}
    </main>
  );
}
