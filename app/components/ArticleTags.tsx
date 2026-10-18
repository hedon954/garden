import Link from "next/link";
import { articleTagHref } from "../lib/tag-filter";

/** Tags under an article title. Link, so following one is a client navigation like the rest of the site. */
export function ArticleTags({ tags }: { tags?: string[] }) {
  const list = (tags ?? []).filter(Boolean);
  if (!list.length) return null;
  return (
    <ul className="article-tagrow" aria-label="标签">
      {list.map((tag) => (
        <li key={tag}>
          <Link className="tag-chip p-category" href={articleTagHref(tag)}>
            #{tag}
          </Link>
        </li>
      ))}
    </ul>
  );
}
