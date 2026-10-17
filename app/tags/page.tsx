import { posts } from "../lib/content";
import { TagIndex } from "../components/TagIndex";
import { siteConfig, siteDocumentTitle } from "../site.config";

export const metadata = {
  title: siteDocumentTitle,
  description: "按标签浏览文章。标签不是专栏，也不是分类。",
};

export default function TagsPage() {
  const tagged = posts.filter((post) => (post.tags ?? []).length > 0).length;
  return (
    <main className="sh-main" id="content">
      <div className="sh-head">
        <h1>标签</h1>
        <p className="sh-deck">{siteConfig.description} 共 {tagged || posts.length} 篇带标签的文章。点一个标签就只留下它。</p>
      </div>
      <TagIndex posts={posts} />
    </main>
  );
}
