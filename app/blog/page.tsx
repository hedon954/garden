import { Suspense } from "react";
import { siteConfig, siteDocumentTitle } from "../site.config";
import { BlogArchive } from "../components/BlogArchive";
import { posts } from "../lib/content";

export const metadata = {
  title: siteDocumentTitle,
  description: siteConfig.pages.blog.subtitle || siteConfig.description,
};

export default function BlogIndex() {
  return (
    <main className="sh-main" id="content">
      <div className="sh-head">
        <h1 id="sh-title">文章</h1>
        <p className="sh-deck">阶段性的完整沉淀，关于工程、架构与技术思考。共 {posts.length} 篇，按年份归档。</p>
      </div>
      <Suspense>
        <BlogArchive />
      </Suspense>
    </main>
  );
}
