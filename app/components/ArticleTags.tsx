import Link from "next/link";
import { siteLang } from "../lib/i18n";
import { articleTagHref } from "../lib/tag-filter";
import { siteHref } from "../lib/site-href";

/** Tags under an article title. Link, so following one is a client navigation like the rest of the site. */
export function ArticleTags({ tags }: { tags?: string[] }) {
  const list = (tags ?? []).filter(Boolean);
  if (!list.length) return null;
  return (
    <ul className="article-tagrow" aria-label={siteLang === "en" ? "Tags" : "标签"}>
      {list.map((tag) => (
        <li key={tag}>
          <Link className="tag-chip p-category" href={siteHref(articleTagHref(tag))}>
            #{tag}
          </Link>
        </li>
      ))}
    </ul>
  );
}
