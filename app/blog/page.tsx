import { Suspense } from "react";
import { siteConfig, siteDocumentTitle } from "../site.config";
import { BlogArchive, BlogArchiveFallback } from "../components/BlogArchive";
import { posts } from "../lib/content";
import { archivePosts, archiveSeries } from "../lib/archive";

export const metadata = {
  title: siteDocumentTitle,
  description: siteConfig.pages.blog.subtitle || siteConfig.description,
};

export default function BlogIndex() {
  const list = archivePosts();
  const series = archiveSeries();
  return (
    <main className="sh-main" id="content">
      <div className="sh-head">
        <h1 id="sh-title">文章</h1>
        <p className="sh-deck">阶段性的完整沉淀，关于工程、架构与技术思考。共 {posts.length} 篇，按年份归档。</p>
      </div>
      <Suspense fallback={<BlogArchiveFallback posts={list} series={series} />}>
        <BlogArchive posts={list} series={series} />
      </Suspense>
    </main>
  );
}
