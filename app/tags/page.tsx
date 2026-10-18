import Link from "next/link";
import { Suspense } from "react";
import { posts } from "../lib/content";
import { articleTagHref, tagCounts } from "../lib/tag-filter";
import { TagRedirect } from "../components/TagRedirect";
import { siteDocumentTitle } from "../site.config";

export const metadata = {
  title: siteDocumentTitle,
  description: "全部标签。",
};

export default function TagsPage() {
  const tags = tagCounts(posts);
  return (
    <main className="sh-main" id="content">
      <div className="sh-head">
        <h1>标签</h1>
        <p className="sh-deck">{tags.length} 个标签，按文章数排序。点一个标签，查看带这个标签的文章。</p>
      </div>
      <Suspense>
        <TagRedirect />
      </Suspense>
      {tags.length ? (
        <ul className="sh-tagchips sh-tagindex" aria-label="全部标签">
          {tags.map(([tag, count]) => (
            <li key={tag}>
              <Link className="sh-tagchip" href={articleTagHref(tag)}>
                #{tag}<span className="n num">{count}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="sh-deck">还没有标签。</p>
      )}
    </main>
  );
}
