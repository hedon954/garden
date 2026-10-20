import { Suspense } from "react";
import { siteConfig, siteDocumentTitle } from "../site.config";
import { BlogArchive, BlogArchiveFallback } from "../components/BlogArchive";
import { posts } from "../lib/content";
import { archivePosts, archiveSeries } from "../lib/archive";
import { pageAlternates } from "../lib/page-alternates";
import { siteLang } from "../lib/i18n";

export const metadata = {
  title: siteDocumentTitle,
  description: siteConfig.pages.blog.subtitle || siteConfig.description,
  alternates: pageAlternates("/blog"),
};

export default function BlogIndex() {
  const list = archivePosts();
  const series = archiveSeries();
  const en = siteLang === "en";
  return (
    <main className="sh-main" id="content">
      <div className="sh-head">
        <h1 id="sh-title">{en ? (siteConfig.pages.blog.title || "Posts") : "文章"}</h1>
        <p className="sh-deck">
          {en
            ? `${siteConfig.pages.blog.subtitle || "Longer essays and technical notes."} ${posts.length} posts, grouped by year.`
            : `阶段性的完整沉淀，关于工程、架构与技术思考。共 ${posts.length} 篇，按年份归档。`}
        </p>
      </div>
      <Suspense fallback={<BlogArchiveFallback posts={list} series={series} />}>
        <BlogArchive posts={list} series={series} />
      </Suspense>
    </main>
  );
}
