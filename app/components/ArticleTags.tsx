import Link from "next/link";
import { articleTagHref } from "../lib/tag-filter";
import { siteHref } from "../lib/site-href";
import { ui, type UiLang } from "../lib/i18n";

/** Tags under an article title. Link, so following one is a client navigation like the rest of the site. */
export function ArticleTags({ tags, lang }: { tags?: string[]; lang?: UiLang }) {
  const list = (tags ?? []).filter(Boolean);
  if (!list.length) return null;
  return (
    <ul className="article-tagrow" aria-label={ui(lang).articleTagsLabel}>
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
