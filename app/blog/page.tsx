import { Suspense } from "react";
import { siteConfig, siteDocumentTitle } from "../site.config";
import { BlogArchive } from "../components/BlogArchive";

export const metadata = {
  title: siteDocumentTitle,
  description: siteConfig.pages.blog.subtitle || siteConfig.description,
};

export default function BlogIndex() {
  return (
    <main className="page-shell index-page">
      <header className="page-intro">
        <p className="eyebrow">POSTS / 博文</p>
        <h1>{siteConfig.pages.blog.title}</h1>
        <p>{siteConfig.pages.blog.subtitle}</p>
      </header>
      <Suspense>
        <BlogArchive />
      </Suspense>
    </main>
  );
}
