import { columnOfPost, columns, posts } from "./content";

/**
 * What the /blog list needs per post. The page passes this to the client
 * archive as props, so post bodies never reach the browser bundle.
 */
export type ArchivePost = {
  path: string;
  title: string;
  date: string;
  tags?: string[];
  description?: string;
  cover?: string;
  pinned?: boolean;
  column?: { slug: string; title: string };
};

export type ArchiveSeries = { slug: string; title: string; count: number };

export function archivePosts(): ArchivePost[] {
  return posts.map((post) => {
    const column = columnOfPost(post);
    return {
      path: post.path,
      title: post.title,
      date: post.date,
      ...(post.tags?.length ? { tags: post.tags } : {}),
      ...(post.description ? { description: post.description } : {}),
      ...(post.cover ? { cover: post.cover } : {}),
      ...(post.pinned ? { pinned: true } : {}),
      ...(column ? { column } : {}),
    };
  });
}

export function archiveSeries(): ArchiveSeries[] {
  const series = new Map<string, ArchiveSeries>();
  for (const entry of columns) {
    const slug = entry.column ?? "";
    const current = series.get(slug);
    if (current) current.count += 1;
    else series.set(slug, { slug, title: entry.columnTitle ?? slug, count: 1 });
  }
  return [...series.values()];
}
