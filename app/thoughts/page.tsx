import { getPublishedThoughts } from "../lib/public-thoughts";
import { ThoughtCard } from "../components/ThoughtCard";

export const metadata = {
  title: "随想",
  description: "短文字、照片、声音、影像和偶然读到的链接。",
};

export default function ThoughtsPage() {
  const thoughts = getPublishedThoughts();

  return (
    <main className="page-shell thoughts-page">
      <header className="page-intro">
        <p className="eyebrow">THOUGHTS / 随想</p>
        <h1>不够写成文章的，也值得留下。</h1>
        <p>
          私人朋友圈式的轻量记录：短文字、照片、声音、影像，以及偶然遇见的链接。
        </p>
      </header>
      <div className="thought-stream">
        {thoughts.map((thought) => (
          <ThoughtCard key={thought.slug} thought={thought} />
        ))}
      </div>
    </main>
  );
}
