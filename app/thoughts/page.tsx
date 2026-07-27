import { getPublishedThoughts } from "../lib/public-thoughts";
import { ThoughtCard } from "../components/ThoughtCard";
import { PageIntro } from "../components/PageIntro";
import { siteConfig } from "../site.config";

export const metadata = {
  title: siteConfig.pages.thoughts.title,
  description: siteConfig.pages.thoughts.subtitle,
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
      <div className="thought-stream">
        {thoughts.map((thought) => (
          <ThoughtCard key={thought.slug} thought={thought} />
        ))}
      </div>
    </main>
  );
}
