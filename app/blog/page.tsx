import { Suspense } from "react";
import { siteConfig, siteDocumentTitle } from "../site.config";
import { BlogArchive } from "../components/BlogArchive";
import { PageIntro } from "../components/PageIntro";

export const metadata = {
  title: siteDocumentTitle,
  description: siteConfig.pages.blog.subtitle || siteConfig.description,
};

export default function BlogIndex() {
  return (
    <main className="page-shell index-page">
      <PageIntro
        eyebrow="POSTS / 博文"
        title={siteConfig.pages.blog.title}
        subtitle={siteConfig.pages.blog.subtitle}
      />
      <Suspense>
        <BlogArchive />
      </Suspense>
    </main>
  );
}
