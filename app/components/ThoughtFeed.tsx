import Link from "next/link";
import { ThoughtCard } from "./ThoughtCard";
import { FeedMore } from "./FeedMore";
import { getPublishedThoughts } from "../lib/public-thoughts";
import { ui } from "../lib/i18n";
import { siteHref } from "../lib/site-href";
import { siteConfig } from "../site.config";
import { pageCount, pageItems, pagePath, pageSizeOf } from "../../ui/garden/paging.mjs";

export const thoughtsPageSize = () => pageSizeOf(siteConfig.pages.thoughts.pageSize);
export const thoughtsPageCount = () => pageCount(getPublishedThoughts().length, thoughtsPageSize());
export const thoughtsPageHref = (page: number) => siteHref(pagePath("/thoughts", page));

/** One page of 随想 and the link (or automatic loading) to the next. */
export function ThoughtFeed({ page }: { page: number }) {
  const t = ui();
  const all = getPublishedThoughts();
  const total = thoughtsPageCount();
  const items = pageItems(all, page, thoughtsPageSize());
  const next = page < total ? thoughtsPageHref(page + 1) : null;
  return (
    <>
      <div className="thought-stream" data-feed-page={page}>
        {items.map((thought) => (
          <ThoughtCard key={thought.slug} thought={thought} />
        ))}
      </div>
      {page > 1 ? (
        <p className="feed-prev">
          <Link href={thoughtsPageHref(page - 1)} rel="prev">{t.prevPage}</Link>
          <span>{t.pageOf(page, total)}</span>
        </p>
      ) : null}
      <FeedMore
        next={next}
        streamSelector=".thought-stream"
        labels={{ nextPage: t.nextPage, loadingMore: t.loadingMore, loadFailed: t.loadFailed, feedEnd: t.feedEnd }}
      />
    </>
  );
}
