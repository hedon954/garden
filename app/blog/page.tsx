import { Suspense } from "react";
import { siteConfig, siteDocumentTitle } from "../site.config";
import { BlogArchive, BlogArchiveFallback } from "../components/BlogArchive";
import { posts } from "../lib/content";
import { archivePosts, archiveSeries } from "../lib/archive";
import { pageAlternates } from "../lib/page-alternates";
import { siteLang, ui } from "../lib/i18n";

export const metadata = {
  title: siteDocumentTitle,
  description: siteConfig.pages.blog.subtitle || siteConfig.description,
  alternates: pageAlternates("/blog"),
};

export default function BlogIndex() {
  const t = ui();
  const list = archivePosts();
  const series = archiveSeries();
  return (
    <main className="sh-main" id="content">
      <div className="sh-head">
        <h1 id="sh-title">{t.blogHeading}</h1>
        <p className="sh-deck">{siteLang === "en" ? t.blogDeck(posts.length) : <>阶段性的完整沉淀，关于工程、架构与技术思考。共 {posts.length} 篇，按年份归档。</>}</p>
      </div>
      <Suspense fallback={<BlogArchiveFallback posts={list} series={series} />}>
        <BlogArchive posts={list} series={series} />
      </Suspense>
    </main>
  );
}
