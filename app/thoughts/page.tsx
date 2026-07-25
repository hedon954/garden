import Link from "next/link";
import { ArrowLeft, ArrowRight } from "@phosphor-icons/react/ssr";
import { getPublishedThoughts } from "../lib/public-thoughts";
import { ThoughtCard } from "../components/ThoughtCard";

export const metadata = {
  title: "随想",
  description: "短文字、照片、声音、影像和偶然读到的链接。",
};

const pageSize = 10;

export const dynamic = "force-dynamic";

export default async function ThoughtsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const thoughts = await getPublishedThoughts();
  const requested = await searchParams;
  const pageCount = Math.max(1, Math.ceil(thoughts.length / pageSize));
  const parsedPage = Number.parseInt(requested.page ?? "1", 10);
  const currentPage = Math.min(
    pageCount,
    Math.max(1, Number.isFinite(parsedPage) ? parsedPage : 1),
  );
  const visibleThoughts = thoughts.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

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
        {visibleThoughts.map((thought) => (
          <ThoughtCard key={thought.slug} thought={thought} />
        ))}
      </div>
      {pageCount > 1 && (
        <nav className="archive-pagination" aria-label="随想分页">
          {currentPage > 1 ? (
            <Link href={currentPage === 2 ? "/thoughts" : `/thoughts?page=${currentPage - 1}`}>
              <ArrowLeft size={16} />
              上一页
            </Link>
          ) : (
            <span />
          )}
          <span>
            {currentPage} / {pageCount}
          </span>
          {currentPage < pageCount ? (
            <Link href={`/thoughts?page=${currentPage + 1}`}>
              下一页
              <ArrowRight size={16} />
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </main>
  );
}
