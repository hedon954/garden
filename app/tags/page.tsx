import { Suspense } from "react";
import { posts } from "../lib/content";
import { TagIndex } from "../components/TagIndex";
import { siteDocumentTitle } from "../site.config";

export const metadata = {
  title: siteDocumentTitle,
  description: "按标签浏览文章。标签不是专栏，也不是分类。",
};

export default function TagsPage() {
  const counts = new Map<string, number>();
  for (const post of posts) {
    for (const tag of post.tags ?? []) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
  const once = [...counts.values()].filter((count) => count === 1).length;
  return (
    <main className="sh-main" id="content">
      <div className="sh-head">
        <h1>标签</h1>
        <p className="sh-deck">{counts.size} 个标签，按使用次数排序；只用过一次的 {once} 个收在下面。点选一个标签，下方列出对应文章。</p>
      </div>
      <Suspense>
        <TagIndex posts={posts} />
      </Suspense>
    </main>
  );
}
