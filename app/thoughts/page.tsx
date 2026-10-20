import { getPublishedThoughts } from "../lib/public-thoughts";
import { ThoughtFeed } from "../components/ThoughtFeed";
import { ContentEmptyState } from "../components/ContentEmptyState";
import { PageIntro } from "../components/PageIntro";
import { siteConfig, siteDocumentTitle } from "../site.config";
import { pageAlternates } from "../lib/page-alternates";
import { ui } from "../lib/i18n";

export const metadata = {
  title: siteDocumentTitle,
  description: siteConfig.pages.thoughts.subtitle || siteConfig.description,
  alternates: pageAlternates("/thoughts"),
};

export default function ThoughtsPage() {
  const thoughts = getPublishedThoughts();

  return (
    <main className="page-shell thoughts-page">
      <PageIntro
        eyebrow={ui().thoughtsEyebrow}
        title={siteConfig.pages.thoughts.title}
        subtitle={siteConfig.pages.thoughts.subtitle}
      />
      {thoughts.length > 0 ? (
        <ThoughtFeed page={1} />
      ) : (
        <ContentEmptyState kind="thoughts" />
      )}
    </main>
  );
}
