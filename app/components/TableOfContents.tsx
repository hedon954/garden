export function TableOfContents({
  headings,
  label = "本篇目录",
}: {
  headings: Array<{ depth: number; text: string; id: string }>;
  label?: string;
}) {
  if (!headings.length) return null;

  return (
    <aside className="toc" aria-label={label}>
      <p>{label}</p>
      <ol>
        {headings.map((heading) => (
          <li key={heading.id} className={`toc-depth-${heading.depth}`}>
            <a href={`#${heading.id}`}>{heading.text}</a>
          </li>
        ))}
      </ol>
    </aside>
  );
}
