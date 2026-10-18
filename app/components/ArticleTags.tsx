export function ArticleTags({ tags }: { tags?: string[] }) {
  const list = (tags ?? []).filter(Boolean);
  if (!list.length) return null;
  return (
    <ul className="article-tagrow" aria-label="标签">
      {list.map((tag) => (
        <li key={tag}>
          <a className="tag-chip p-category" href={`/tags?t=${encodeURIComponent(tag)}`}>
            #{tag}
          </a>
        </li>
      ))}
    </ul>
  );
}
