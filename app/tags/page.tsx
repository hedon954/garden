import Link from "next/link";
import { Suspense } from "react";
import { posts } from "../lib/content";
import { siteHref } from "../lib/site-href";
import { articleTagHref, tagCounts } from "../lib/tag-filter";
import { TagRedirect } from "../components/TagRedirect";
import { siteDocumentTitle } from "../site.config";
import { pageAlternates } from "../lib/page-alternates";
import { siteLang, ui } from "../lib/i18n";

export const metadata = {
  title: siteDocumentTitle,
  description: ui().tagsDescription,
  alternates: pageAlternates("/tags"),
};

export default function TagsPage() {
  const t = ui();
  const tags = tagCounts(posts);
  return (
    <main className="sh-main" id="content">
      <div className="sh-head">
        <h1>{t.tagsTitle}</h1>
        <p className="sh-deck">{siteLang === "en" ? t.tagsDeck(tags.length) : <>{tags.length} 个标签，按文章数排序。点一个标签，查看带这个标签的文章。</>}</p>
      </div>
      <Suspense>
        <TagRedirect />
      </Suspense>
      {tags.length ? (
        <ul className="sh-tagchips sh-tagindex" aria-label={t.tagsIndexLabel}>
          {tags.map(([tag, count]) => (
            <li key={tag}>
              <Link className="sh-tagchip" href={siteHref(articleTagHref(tag))}>
                #{tag}<span className="n num">{count}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="sh-deck">{t.tagsEmpty}</p>
      )}
    </main>
  );
}
