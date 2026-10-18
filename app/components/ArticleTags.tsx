import { tagFilterHref } from "../lib/tag-filter";

export function ArticleTags({ tags }: { tags?: string[] }) {
  const list = (tags ?? []).filter(Boolean);
  if (!list.length) return null;
  return (
    <ul className="article-tagrow" aria-label="标签">
      {list.map((tag) => (
        <li key={tag}>
          <a className="tag-chip p-category" href={tagFilterHref([tag])}>
            #{tag}
          </a>
        </li>
      ))}
    </ul>
  );
}
