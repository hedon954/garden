import { getPublishedThoughts } from "../lib/public-thoughts";
import { ThoughtCard } from "../components/ThoughtCard";
import { ContentEmptyState } from "../components/ContentEmptyState";
import { PageIntro } from "../components/PageIntro";
import { siteConfig, siteDocumentTitle } from "../site.config";
import { pageAlternates } from "../lib/page-alternates";

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
        eyebrow="THOUGHTS / 随想"
        title={siteConfig.pages.thoughts.title}
        subtitle={siteConfig.pages.thoughts.subtitle}
      />
      {thoughts.length > 0 ? (
        <div className="thought-stream">
          {thoughts.map((thought) => (
            <ThoughtCard key={thought.slug} thought={thought} />
          ))}
        </div>
      ) : (
        <ContentEmptyState kind="thoughts" />
      )}
    </main>
  );
}
