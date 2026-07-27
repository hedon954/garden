import { getPublishedThoughts } from "../lib/public-thoughts";
import { ThoughtCard } from "../components/ThoughtCard";
import { siteConfig } from "../site.config";

export const metadata = {
  title: siteConfig.pages.thoughts.title,
  description: siteConfig.pages.thoughts.subtitle,
};

export default function ThoughtsPage() {
  const thoughts = getPublishedThoughts();

  return (
    <main className="page-shell thoughts-page">
      <header className="page-intro">
        <p className="eyebrow">THOUGHTS / 随想</p>
        <h1>{siteConfig.pages.thoughts.title}</h1>
        <p>{siteConfig.pages.thoughts.subtitle}</p>
      </header>
      <div className="thought-stream">
        {thoughts.map((thought) => (
          <ThoughtCard key={thought.slug} thought={thought} />
        ))}
      </div>
    </main>
  );
}
